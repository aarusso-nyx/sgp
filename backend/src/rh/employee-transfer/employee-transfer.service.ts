import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  ApproveEmployeeTransferDto,
  CreateEmployeeTransferDto,
} from './employee-transfer.dto';

type TransferStatus =
  | 'solicitada'
  | 'aprovada'
  | 'efetivada'
  | 'indeferida'
  | 'cancelada';

interface EmployeeRow extends QueryResultRow {
  employee_id: string;
  tenant_id: string;
  work_location_id: string | null;
  job_position_id: string | null;
}

interface TransferRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  origem_work_location_id: string | null;
  destino_work_location_id: string;
  origem_job_position_id: string | null;
  destino_job_position_id: string | null;
  tipo: string;
  data_solicitacao: Date | string;
  data_efeito: Date | string;
  processo_administrativo_id: string | null;
  status: TransferStatus;
  aprovador_user_id: string | null;
  notes: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmployeeTransfer {
  id: string;
  employeeId: string;
  origemWorkLocationId: string | null;
  destinoWorkLocationId: string;
  origemJobPositionId: string | null;
  destinoJobPositionId: string | null;
  tipo: string;
  dataSolicitacao: string;
  dataEfeito: string;
  processoAdministrativoId: string | null;
  status: TransferStatus;
  aprovadorUserId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class EmployeeTransferService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(body: CreateEmployeeTransferDto): Promise<EmployeeTransfer> {
    this.ensureDatabase();
    this.validateEffectiveDate(body.dataEfeito);

    return this.databaseService.transaction(async (client) => {
      const employee = await this.loadEmployee(client, body.employeeId);
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      const result = await client.query<TransferRow>(
        `
        INSERT INTO hr.employee_transfer (
          tenant_id,
          employee_id,
          origem_work_location_id,
          destino_work_location_id,
          origem_job_position_id,
          destino_job_position_id,
          tipo,
          data_solicitacao,
          data_efeito,
          processo_administrativo_id,
          status,
          notes,
          effective_on,
          to_work_location_id
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          COALESCE(NULLIF($3, '')::uuid, $4::uuid),
          $5::uuid,
          COALESCE(NULLIF($6, '')::uuid, NULLIF($7, '')::uuid),
          NULLIF($8, '')::uuid,
          $9::hr.employee_transfer_type,
          CURRENT_DATE,
          $10::date,
          NULLIF($11, '')::uuid,
          'solicitada'::hr.employee_transfer_status,
          $12,
          $10::date,
          $5::uuid
        )
        RETURNING ${this.returningColumns()}
        `,
        [
          employee.tenant_id,
          employee.employee_id,
          body.origemWorkLocationId ?? '',
          employee.work_location_id,
          body.destinoWorkLocationId,
          body.origemJobPositionId ?? '',
          employee.job_position_id ?? '',
          body.destinoJobPositionId ?? '',
          body.tipo,
          body.dataEfeito,
          body.processoAdministrativoId ?? '',
          body.notes ?? '',
        ],
      );

      return this.toTransfer(result.rows[0]!);
    });
  }

  async listByEmployee(employeeId: string): Promise<EmployeeTransfer[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TransferRow>(
      `
      SELECT ${this.returningColumns()}
      FROM hr.employee_transfer
      WHERE employee_id = $1::uuid
      ORDER BY data_efeito DESC, created_at DESC
      `,
      [employeeId],
    );
    return rows.map((row) => this.toTransfer(row));
  }

  async listByStatus(status?: string): Promise<EmployeeTransfer[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TransferRow>(
      `
      SELECT ${this.returningColumns()}
      FROM hr.employee_transfer
      WHERE NULLIF($1, '') IS NULL OR status = $1::hr.employee_transfer_status
      ORDER BY data_efeito ASC, created_at ASC
      `,
      [status ?? ''],
    );
    return rows.map((row) => this.toTransfer(row));
  }

  async approve(
    id: string,
    body: ApproveEmployeeTransferDto,
  ): Promise<EmployeeTransfer> {
    return this.transition(id, 'aprovada', body.aprovadorUserId);
  }

  async cancel(id: string): Promise<EmployeeTransfer> {
    return this.transition(id, 'cancelada');
  }

  async effect(id: string): Promise<EmployeeTransfer> {
    this.ensureDatabase();

    return this.databaseService.transaction(async (client) => {
      const current = await this.loadTransfer(client, id);
      if (!current) {
        throw new NotFoundException('Employee transfer not found');
      }
      if (current.status === 'efetivada') {
        return this.toTransfer(current);
      }
      if (current.status !== 'aprovada') {
        throw new BadRequestException(
          'Only approved transfers can be effected',
        );
      }
      await this.ensureNotClosedPayroll(client, current);

      const result = await client.query<TransferRow>(
        `
        UPDATE hr.employee_transfer
        SET status = 'efetivada'::hr.employee_transfer_status,
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING ${this.returningColumns()}
        `,
        [id],
      );
      return this.toTransfer(result.rows[0]!);
    });
  }

  private async transition(
    id: string,
    status: Exclude<TransferStatus, 'solicitada' | 'efetivada'>,
    aprovadorUserId?: string,
  ): Promise<EmployeeTransfer> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TransferRow>(
      `
      UPDATE hr.employee_transfer
      SET status = $2::hr.employee_transfer_status,
          aprovador_user_id = COALESCE(NULLIF($3, '')::uuid, aprovador_user_id),
          updated_at = now()
      WHERE id = $1::uuid
        AND status IN ('solicitada'::hr.employee_transfer_status, 'aprovada'::hr.employee_transfer_status)
      RETURNING ${this.returningColumns()}
      `,
      [id, status, aprovadorUserId ?? ''],
    );
    if (!rows[0]) {
      throw new NotFoundException('Employee transfer not found or immutable');
    }
    return this.toTransfer(rows[0]);
  }

  private async ensureNotClosedPayroll(
    client: PoolClient,
    transfer: TransferRow,
  ): Promise<void> {
    const rows = await client.query<{ has_closed_run: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM payroll.payroll_run
        WHERE tenant_id = $1::uuid
          AND closed_at IS NOT NULL
          AND make_date(competence_year, competence_month, 1) <= date_trunc('month', $2::date)::date
      ) AS has_closed_run
      `,
      [transfer.tenant_id, transfer.data_efeito],
    );
    if (rows.rows[0]?.has_closed_run) {
      throw new UnprocessableEntityException(
        'Transfer effective date is inside a closed payroll competence',
      );
    }
  }

  private async loadEmployee(
    client: PoolClient,
    employeeId: string,
  ): Promise<EmployeeRow | null> {
    const result = await client.query<EmployeeRow>(
      `
      SELECT
        id::text AS employee_id,
        tenant_id::text,
        work_location_id::text,
        job_position_id::text
      FROM hr.employee
      WHERE id = $1::uuid
      `,
      [employeeId],
    );
    return result.rows[0] ?? null;
  }

  private async loadTransfer(
    client: PoolClient,
    id: string,
  ): Promise<TransferRow | null> {
    const result = await client.query<TransferRow>(
      `
      SELECT ${this.returningColumns()}
      FROM hr.employee_transfer
      WHERE id = $1::uuid
      FOR UPDATE
      `,
      [id],
    );
    return result.rows[0] ?? null;
  }

  private validateEffectiveDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('dataEfeito must be an ISO date');
    }
  }

  private returningColumns(): string {
    return `
      id::text,
      tenant_id::text,
      employee_id::text,
      origem_work_location_id::text,
      destino_work_location_id::text,
      origem_job_position_id::text,
      destino_job_position_id::text,
      tipo::text,
      data_solicitacao,
      data_efeito,
      processo_administrativo_id::text,
      status::text,
      aprovador_user_id::text,
      notes,
      created_at,
      updated_at
    `;
  }

  private toTransfer(row: TransferRow): EmployeeTransfer {
    return {
      id: row.id,
      employeeId: row.employee_id,
      origemWorkLocationId: row.origem_work_location_id,
      destinoWorkLocationId: row.destino_work_location_id,
      origemJobPositionId: row.origem_job_position_id,
      destinoJobPositionId: row.destino_job_position_id,
      tipo: row.tipo,
      dataSolicitacao: this.toIsoDate(row.data_solicitacao),
      dataEfeito: this.toIsoDate(row.data_efeito),
      processoAdministrativoId: row.processo_administrativo_id,
      status: row.status,
      aprovadorUserId: row.aprovador_user_id,
      notes: row.notes,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private toIsoDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
