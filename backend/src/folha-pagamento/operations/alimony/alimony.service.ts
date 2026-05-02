import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../../database/database.service';
import {
  CreateEmployeeAlimonyDto,
  UpdateEmployeeAlimonyDto,
} from './alimony.dto';

interface AlimonyRow extends QueryResultRow {
  id: string;
  employee_id: string;
  court_order_number: string | null;
  court_id: string | null;
  judge_name: string | null;
  beneficiary_name: string;
  beneficiary_cpf: string | null;
  beneficiary_bank_code: number | null;
  beneficiary_branch: string | null;
  beneficiary_account: string | null;
  judicial_account: boolean;
  calculation_basis: string;
  rate: string | null;
  fixed_amount: string | null;
  base_specific_codes: string[];
  valid_from: string;
  valid_to: string | null;
  priority: number;
  status: string;
  notes: string;
  updated_at: Date | string;
}

export interface EmployeeAlimonySummary {
  id: string;
  employeeId: string;
  courtOrderNumber: string | null;
  courtId: string | null;
  judgeName: string | null;
  beneficiaryName: string;
  beneficiaryCpf: string | null;
  beneficiaryBankCode: number | null;
  beneficiaryBranch: string | null;
  beneficiaryAccount: string | null;
  judicialAccount: boolean;
  calculationBasis: string;
  rate: string | null;
  fixedAmount: string | null;
  baseSpecificCodes: string[];
  validFrom: string;
  validTo: string | null;
  priority: number;
  status: string;
  notes: string;
  updatedAt: string;
}

@Injectable()
export class EmployeeAlimonyService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    employeeId: string,
    status?: string,
  ): Promise<EmployeeAlimonySummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AlimonyRow>(
      `
      SELECT
        id::text,
        employee_id::text,
        court_order_number,
        court_id,
        judge_name,
        beneficiary_name,
        beneficiary_cpf,
        beneficiary_bank_code,
        beneficiary_branch,
        beneficiary_account,
        judicial_account,
        calculation_basis::text,
        rate::text,
        fixed_amount::text,
        base_specific_codes,
        valid_from::text,
        valid_to::text,
        priority,
        status::text,
        notes,
        updated_at
      FROM hr.employee_alimony
      WHERE employee_id = $1::uuid
        AND ($2 = '' OR status::text = $2)
      ORDER BY priority, valid_from DESC, beneficiary_name
      `,
      [employeeId, status ?? ''],
    );
    return rows.map(toSummary);
  }

  async create(
    employeeId: string,
    input: CreateEmployeeAlimonyDto,
  ): Promise<EmployeeAlimonySummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      await this.assertEmployee(client, employeeId);
      const rows = await client.query<AlimonyRow>(
        `
        INSERT INTO hr.employee_alimony (
          tenant_id,
          employee_id,
          court_order_number,
          court_process_number,
          court_id,
          judge_name,
          beneficiary_name,
          beneficiary_cpf,
          beneficiary_bank_code,
          beneficiary_branch,
          beneficiary_account,
          judicial_account,
          calculation_basis,
          rate,
          fixed_amount,
          amount,
          valid_from,
          valid_to,
          starts_on,
          ends_on,
          priority,
          base_specific_codes,
          notes,
          status
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2,
          $2,
          NULLIF($3, ''),
          NULLIF($4, ''),
          $5,
          NULLIF($6, ''),
          $7,
          $8,
          $9,
          $10,
          $11::hr.alimony_calculation_basis,
          NULLIF($12, '')::numeric(18, 6),
          NULLIF($13, '')::numeric(14, 2),
          COALESCE(NULLIF($13, '')::numeric(14, 2), 0),
          $14::date,
          NULLIF($15, '')::date,
          $14::date,
          NULLIF($15, '')::date,
          $16,
          $17::text[],
          COALESCE($18, ''),
          'ACTIVE'::hr.employee_alimony_status
        )
        RETURNING
          id::text,
          employee_id::text,
          court_order_number,
          court_id,
          judge_name,
          beneficiary_name,
          beneficiary_cpf,
          beneficiary_bank_code,
          beneficiary_branch,
          beneficiary_account,
          judicial_account,
          calculation_basis::text,
          rate::text,
          fixed_amount::text,
          base_specific_codes,
          valid_from::text,
          valid_to::text,
          priority,
          status::text,
          notes,
          updated_at
        `,
        this.values(employeeId, input),
      );
      AuditMutationContextStore.markMutationAudited();
      return toSummary(rows.rows[0]);
    });
  }

  async update(
    employeeId: string,
    alimonyId: string,
    input: UpdateEmployeeAlimonyDto,
  ): Promise<EmployeeAlimonySummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const rows = await client.query<AlimonyRow>(
        `
        UPDATE hr.employee_alimony
        SET court_order_number = $3,
            court_process_number = $3,
            court_id = NULLIF($4, ''),
            judge_name = NULLIF($5, ''),
            beneficiary_name = $6,
            beneficiary_cpf = NULLIF($7, ''),
            beneficiary_bank_code = $8,
            beneficiary_branch = $9,
            beneficiary_account = $10,
            judicial_account = $11,
            calculation_basis = $12::hr.alimony_calculation_basis,
            rate = NULLIF($13, '')::numeric(18, 6),
            fixed_amount = NULLIF($14, '')::numeric(14, 2),
            amount = COALESCE(NULLIF($14, '')::numeric(14, 2), 0),
            valid_from = $15::date,
            valid_to = NULLIF($16, '')::date,
            starts_on = $15::date,
            ends_on = NULLIF($16, '')::date,
            priority = $17,
            base_specific_codes = $18::text[],
            notes = COALESCE($19, ''),
            status = $20::hr.employee_alimony_status,
            updated_at = now()
        WHERE employee_id = $1::uuid
          AND id = $2::uuid
        RETURNING
          id::text,
          employee_id::text,
          court_order_number,
          court_id,
          judge_name,
          beneficiary_name,
          beneficiary_cpf,
          beneficiary_bank_code,
          beneficiary_branch,
          beneficiary_account,
          judicial_account,
          calculation_basis::text,
          rate::text,
          fixed_amount::text,
          base_specific_codes,
          valid_from::text,
          valid_to::text,
          priority,
          status::text,
          notes,
          updated_at
        `,
        [
          employeeId,
          alimonyId,
          ...this.values('', input).slice(1),
          input.status,
        ],
      );
      const row = rows.rows[0];
      if (!row) throw new NotFoundException('Alimony order not found');
      AuditMutationContextStore.markMutationAudited();
      return toSummary(row);
    });
  }

  async remove(employeeId: string, alimonyId: string): Promise<void> {
    this.ensureDatabase();
    await this.databaseService.transaction(async (client) => {
      const rows = await client.query<{ id: string }>(
        `
        DELETE FROM hr.employee_alimony
        WHERE employee_id = $1::uuid
          AND id = $2::uuid
        RETURNING id::text
        `,
        [employeeId, alimonyId],
      );
      if (!rows.rows[0]) throw new NotFoundException('Alimony order not found');
      AuditMutationContextStore.markMutationAudited();
    });
  }

  private async assertEmployee(
    client: PoolClient,
    employeeId: string,
  ): Promise<void> {
    const rows = await client.query<{ id: string }>(
      `
      SELECT id::text
      FROM hr.employee
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND id = $1::uuid
      `,
      [employeeId],
    );
    if (!rows.rows[0]) throw new NotFoundException('Employee not found');
  }

  private values(
    employeeId: string,
    input: CreateEmployeeAlimonyDto,
  ): unknown[] {
    return [
      employeeId,
      input.courtOrderNumber,
      input.courtId ?? '',
      input.judgeName ?? '',
      input.beneficiaryName,
      input.beneficiaryCpf ?? '',
      input.beneficiaryBankCode,
      input.beneficiaryBranch,
      input.beneficiaryAccount,
      input.judicialAccount,
      input.calculationBasis,
      input.rate ?? '',
      input.fixedAmount ?? '',
      input.validFrom,
      input.validTo ?? '',
      input.priority,
      input.baseSpecificCodes ?? [],
      input.notes ?? '',
    ];
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}

function toSummary(row: AlimonyRow): EmployeeAlimonySummary {
  return {
    id: row.id,
    employeeId: row.employee_id,
    courtOrderNumber: row.court_order_number,
    courtId: row.court_id,
    judgeName: row.judge_name,
    beneficiaryName: row.beneficiary_name,
    beneficiaryCpf: row.beneficiary_cpf,
    beneficiaryBankCode: row.beneficiary_bank_code,
    beneficiaryBranch: row.beneficiary_branch,
    beneficiaryAccount: row.beneficiary_account,
    judicialAccount: row.judicial_account,
    calculationBasis: row.calculation_basis,
    rate: row.rate,
    fixedAmount: row.fixed_amount,
    baseSpecificCodes: row.base_specific_codes,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    updatedAt:
      typeof row.updated_at === 'string'
        ? row.updated_at
        : row.updated_at.toISOString(),
  };
}
