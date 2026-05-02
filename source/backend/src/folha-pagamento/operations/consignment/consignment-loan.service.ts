import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../../database/database.service';
import { CreateConsignmentLoanDto } from './consignment.dto';
import {
  ConsignmentMargin,
  MarginCalculatorService,
} from './margin-calculator.service';

interface LoanRow extends QueryResultRow {
  loan_id: string;
  employee_id: string;
  consignment_entity_id: string;
  consignment_entity_name: string;
  contract_number: string;
  kind: string;
  monthly_amount: string;
  installments_total: number;
  installments_paid: number;
  rate: string;
  valid_from: string;
  valid_to: string;
  status: string;
}

interface EntityRow extends QueryResultRow {
  consignment_entity_id: string;
}

export interface ConsignmentLoanSummary {
  loanId: string;
  employeeId: string;
  consignmentEntityId: string;
  consignmentEntityName: string;
  contractNumber: string;
  kind: string;
  monthlyAmount: string;
  installmentsTotal: number;
  installmentsPaid: number;
  remainingInstallments: number;
  rate: string;
  validFrom: string;
  validTo: string;
  status: string;
}

@Injectable()
export class ConsignmentLoanService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly marginCalculator: MarginCalculatorService,
  ) {}

  async list(employeeId: string): Promise<ConsignmentLoanSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<LoanRow>(
      `
      SELECT
        loan.loan_id::text,
        loan.employee_id::text,
        loan.consignment_entity_id::text,
        entity.name AS consignment_entity_name,
        loan.contract_number,
        loan.kind::text,
        loan.monthly_amount::text,
        loan.installments_total,
        loan.installments_paid,
        loan.rate::text,
        loan.valid_from::text,
        loan.valid_to::text,
        loan.status::text
      FROM payment.consignment_loan loan
      JOIN payment.consignment_entity entity
        ON entity.tenant_id = loan.tenant_id
       AND entity.consignment_entity_id = loan.consignment_entity_id
      WHERE loan.employee_id = $1::uuid
      ORDER BY loan.valid_from DESC, loan.created_at DESC
      `,
      [employeeId],
    );
    return rows.map(toLoanSummary);
  }

  async getMargin(
    employeeId: string,
    competence: string,
  ): Promise<ConsignmentMargin> {
    return this.marginCalculator.getMargin(employeeId, competence);
  }

  async create(
    employeeId: string,
    input: CreateConsignmentLoanDto,
  ): Promise<ConsignmentLoanSummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      await this.assertEntity(client, input.consignmentEntityId);
      const competence = input.validFrom.slice(0, 7);
      const margin = await this.marginCalculator.getMargin(
        employeeId,
        competence,
        client,
      );
      this.marginCalculator.assertAmountFits(
        margin,
        input.kind,
        input.monthlyAmount,
      );

      const inserted = await client.query<LoanRow>(
        `
        WITH inserted AS (
          INSERT INTO payment.consignment_loan (
            tenant_id,
            employee_id,
            consignment_entity_id,
            contract_number,
            kind,
            monthly_amount,
            installments_total,
            installments_paid,
            rate,
            valid_from,
            valid_to,
            status
          )
          VALUES (
            public.sgp_current_tenant_uuid(),
            $1::uuid,
            $2::uuid,
            $3,
            $4::payment.consignment_loan_kind,
            $5::numeric(14, 2),
            $6,
            $7,
            $8::numeric(18, 6),
            $9::date,
            $10::date,
            'ACTIVE'::payment.consignment_loan_status
          )
          RETURNING *
        )
        SELECT
          inserted.loan_id::text,
          inserted.employee_id::text,
          inserted.consignment_entity_id::text,
          entity.name AS consignment_entity_name,
          inserted.contract_number,
          inserted.kind::text,
          inserted.monthly_amount::text,
          inserted.installments_total,
          inserted.installments_paid,
          inserted.rate::text,
          inserted.valid_from::text,
          inserted.valid_to::text,
          inserted.status::text
        FROM inserted
        JOIN payment.consignment_entity entity
          ON entity.tenant_id = inserted.tenant_id
         AND entity.consignment_entity_id = inserted.consignment_entity_id
        `,
        [
          employeeId,
          input.consignmentEntityId,
          input.contractNumber,
          input.kind,
          input.monthlyAmount,
          input.installmentsTotal,
          input.installmentsPaid ?? 0,
          input.rate,
          input.validFrom,
          input.validTo,
        ],
      );
      const row = inserted.rows[0];
      await this.appendAudit(client, row.loan_id, margin);
      return toLoanSummary(row);
    });
  }

  private async assertEntity(
    client: PoolClient,
    consignmentEntityId: string,
  ): Promise<void> {
    const rows = await client.query<EntityRow>(
      `
      SELECT consignment_entity_id::text
      FROM payment.consignment_entity
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND consignment_entity_id = $1::uuid
        AND status = 'ACTIVE'
      `,
      [consignmentEntityId],
    );
    if (!rows.rows[0]) {
      throw new NotFoundException('Active consignment entity not found.');
    }
  }

  private async appendAudit(
    client: PoolClient,
    loanId: string,
    margin: ConsignmentMargin,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'CREATE',
        'payment.consignment_loan',
        $1,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'payment.consignment_loan',
        NULLIF(current_setting('app.request_id', true), ''),
        $2::jsonb,
        'consignment.loan.created',
        NULL::text,
        NULL::text
      )
      `,
      [
        loanId,
        JSON.stringify({
          event: 'consignment.loan.created',
          margin,
        }),
      ],
    );
    AuditMutationContextStore.markMutationAudited();
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}

function toLoanSummary(row: LoanRow): ConsignmentLoanSummary {
  return {
    loanId: row.loan_id,
    employeeId: row.employee_id,
    consignmentEntityId: row.consignment_entity_id,
    consignmentEntityName: row.consignment_entity_name,
    contractNumber: row.contract_number,
    kind: row.kind,
    monthlyAmount: row.monthly_amount,
    installmentsTotal: row.installments_total,
    installmentsPaid: row.installments_paid,
    remainingInstallments: row.installments_total - row.installments_paid,
    rate: row.rate,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    status: row.status,
  };
}
