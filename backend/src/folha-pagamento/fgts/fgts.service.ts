import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

interface FgtsComputationRow extends QueryResultRow {
  fgts_account_id: string;
  fgts_movement_id: string;
  employee_id: string;
  base_amount: string;
  amount: string;
}

interface FgtsAccountRow extends QueryResultRow {
  fgts_account_id: string;
  employee_id: string;
  employment_link_id: string;
  status: string;
  opened_at: Date | string;
  closed_at: Date | string | null;
  deposit_balance: string;
  rescission_fine_total: string;
  movements: Array<{
    id: string;
    competence: string;
    kind: string;
    baseAmount: string;
    rate: string;
    amount: string;
    payrollRunId: string | null;
    sourceEvent: string;
    createdAt: string;
  }>;
}

export interface FgtsComputationResult {
  accountId: string;
  movementId: string;
  employeeId: string;
  baseAmount: string;
  amount: string;
}

export interface FgtsAccountDetails {
  accountId: string;
  employeeId: string;
  employmentLinkId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  depositBalance: string;
  rescissionFineTotal: string;
  movements: FgtsAccountRow['movements'];
}

@Injectable()
export class FgtsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async accrueMonthly(
    payrollRunId: string,
    client?: PoolClient,
  ): Promise<FgtsComputationResult[]> {
    this.ensureDatabase();
    const execute = (tx: PoolClient) => this.computeMonthly(tx, payrollRunId);
    return client
      ? execute(client)
      : this.databaseService.transaction((tx) => execute(tx));
  }

  async computeTerminationFine(
    payrollRunId: string,
    employmentLinkId: string,
    cause: string,
    client?: PoolClient,
  ): Promise<FgtsComputationResult[]> {
    this.ensureDatabase();
    const execute = (tx: PoolClient) =>
      this.computeFine(tx, payrollRunId, employmentLinkId, cause);
    return client
      ? execute(client)
      : this.databaseService.transaction((tx) => execute(tx));
  }

  async accountByEmployee(employeeId: string): Promise<FgtsAccountDetails[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<FgtsAccountRow>(
      `
      SELECT
        account.fgts_account_id::text,
        account.employee_id::text,
        account.employment_link_id::text,
        account.status::text,
        account.opened_at,
        account.closed_at,
        balance.deposit_balance::text,
        balance.rescission_fine_total::text,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', movement.fgts_movement_id::text,
              'competence', movement.competence::text,
              'kind', movement.kind::text,
              'baseAmount', movement.base_amount::text,
              'rate', movement.rate::text,
              'amount', movement.amount::text,
              'payrollRunId', movement.payroll_run_id::text,
              'sourceEvent', movement.source_event::text,
              'createdAt', movement.created_at
            )
            ORDER BY movement.competence DESC, movement.created_at DESC
          ) FILTER (WHERE movement.fgts_movement_id IS NOT NULL),
          '[]'::jsonb
        ) AS movements
      FROM payment.fgts_account account
      JOIN payment.v_fgts_balance balance
        ON balance.tenant_id = account.tenant_id
       AND balance.fgts_account_id = account.fgts_account_id
      LEFT JOIN payment.fgts_movement movement
        ON movement.tenant_id = account.tenant_id
       AND movement.fgts_account_id = account.fgts_account_id
      WHERE account.employee_id = $1::uuid
      GROUP BY
        account.fgts_account_id,
        account.employee_id,
        account.employment_link_id,
        account.status,
        account.opened_at,
        account.closed_at,
        balance.deposit_balance,
        balance.rescission_fine_total
      ORDER BY account.opened_at DESC
      `,
      [employeeId],
    );
    return rows.map((row) => ({
      accountId: row.fgts_account_id,
      employeeId: row.employee_id,
      employmentLinkId: row.employment_link_id,
      status: row.status,
      openedAt: this.dateText(row.opened_at),
      closedAt: row.closed_at ? this.dateText(row.closed_at) : null,
      depositBalance: row.deposit_balance,
      rescissionFineTotal: row.rescission_fine_total,
      movements: row.movements ?? [],
    }));
  }

  private async computeMonthly(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<FgtsComputationResult[]> {
    const result = await client.query<FgtsComputationRow>(
      `
      SELECT
        result.fgts_account_id::text,
        result.fgts_movement_id::text,
        result.employee_id::text,
        result.base_amount::text,
        result.amount::text
      FROM payment.compute_fgts_monthly($1::uuid) result
      `,
      [payrollRunId],
    );
    return result.rows.map((row) => this.toComputation(row));
  }

  private async computeFine(
    client: PoolClient,
    payrollRunId: string,
    employmentLinkId: string,
    cause: string,
  ): Promise<FgtsComputationResult[]> {
    const result = await client.query<FgtsComputationRow>(
      `
      SELECT
        result.fgts_account_id::text,
        result.fgts_movement_id::text,
        result.employee_id::text,
        result.base_amount::text,
        result.amount::text
      FROM payment.compute_fgts_termination_fine($1::uuid, $2::uuid, $3) result
      `,
      [payrollRunId, employmentLinkId, cause],
    );
    return result.rows.map((row) => this.toComputation(row));
  }

  private toComputation(row: FgtsComputationRow): FgtsComputationResult {
    return {
      accountId: row.fgts_account_id,
      movementId: row.fgts_movement_id,
      employeeId: row.employee_id,
      baseAmount: row.base_amount,
      amount: row.amount,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for FGTS operations',
      );
    }
  }

  private dateText(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
