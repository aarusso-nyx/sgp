import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';

interface PisPasepRow extends QueryResultRow {
  employee_id: string;
  registration: string;
  employee_name: string;
  cpf: string | null;
  year_base: number;
  program: 'PIS' | 'PASEP';
  monthly_base: Record<string, string | number>;
  total_base: string;
  updated_at: Date | string;
}

interface PayrollRunEmployeeRow extends QueryResultRow {
  employee_id: string;
  competence_year: number;
}

interface ExcludedEventRow extends QueryResultRow {
  employee_id: string | null;
  competence_year: number | null;
}

export interface PisPasepYear {
  employeeId: string;
  registration: string;
  employeeName: string;
  cpf: string | null;
  year: number;
  program: 'PIS' | 'PASEP';
  monthlyBase: Record<string, string>;
  totalBase: string;
  updatedAt: string;
}

@Injectable()
export class PisPasepService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getYear(employeeId: string, year: number): Promise<PisPasepYear> {
    await this.recomputeYear(employeeId, year);
    const rows = await this.databaseService.query<PisPasepRow>(
      `
      SELECT
        employee_id::text,
        registration,
        employee_name,
        cpf,
        year_base,
        program,
        monthly_base,
        total_base::text,
        updated_at
      FROM payment.v_pis_pasep_year
      WHERE employee_id = $1::uuid
        AND year_base = $2
      `,
      [employeeId, year],
    );
    return this.toYear(rows[0]);
  }

  async recomputeYear(employeeId: string, year: number): Promise<PisPasepYear> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const rows = await this.databaseService.query<PisPasepRow>(
      `
      SELECT
        result.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        employee.cpf,
        result.year_base,
        result.program::text AS program,
        result.monthly_base,
        result.total_base::text,
        result.updated_at
      FROM payment.recompute_pis_pasep_base($1::uuid, $2::uuid, $3) result
      JOIN hr.employee employee
        ON employee.tenant_id = result.tenant_id
       AND employee.id = result.employee_id
      `,
      [tenantId, employeeId, year],
    );
    return this.toYear(rows[0]);
  }

  async handlePayrollRunClosed(payrollRunId: string): Promise<PisPasepYear[]> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const rows = await this.databaseService.query<PayrollRunEmployeeRow>(
      `
      SELECT DISTINCT
        item.employee_id::text,
        run.competence_year
      FROM payroll.payroll_run run
      JOIN payroll.employee_payroll_item item
        ON item.tenant_id = run.tenant_id
       AND item.payroll_run_id = run.id
       AND item.deleted_at IS NULL
      WHERE run.tenant_id = $1::uuid
        AND run.id = $2::uuid
      ORDER BY item.employee_id::text
      `,
      [tenantId, payrollRunId],
    );
    const recomputed: PisPasepYear[] = [];
    for (const row of rows) {
      recomputed.push(
        await this.recomputeYear(row.employee_id, row.competence_year),
      );
    }
    return recomputed;
  }

  async handleS3000Applied(
    targetEventId: string,
  ): Promise<PisPasepYear | null> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const rows = await this.databaseService.query<ExcludedEventRow>(
      `
      SELECT
        COALESCE(event.payload->>'employeeId', event.source_ref->>'employeeId') AS employee_id,
        NULLIF(COALESCE(event.payload->>'competenceYear', event.source_ref->>'competenceYear'), '')::integer AS competence_year
      FROM public.esocial_spool event
      WHERE event.tenant_id = $1::uuid
        AND event.message_id = $2::uuid
        AND event.event_class = 'S-1200'
      LIMIT 1
      `,
      [tenantId, targetEventId],
    );
    const row = rows[0];
    if (!row?.employee_id || !row.competence_year) return null;
    return this.recomputeYear(row.employee_id, row.competence_year);
  }

  private toYear(row: PisPasepRow | undefined): PisPasepYear {
    if (!row) {
      throw new ServiceUnavailableException(
        'PIS/PASEP base was not recomputed',
      );
    }
    return {
      employeeId: row.employee_id,
      registration: row.registration,
      employeeName: row.employee_name,
      cpf: row.cpf,
      year: Number(row.year_base),
      program: row.program,
      monthlyBase: Object.fromEntries(
        Object.entries(row.monthly_base ?? {}).map(([month, amount]) => [
          month,
          this.moneyText(amount),
        ]),
      ),
      totalBase: row.total_base,
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private moneyText(value: string | number): string {
    const [whole, fraction = ''] = String(value).split('.');
    return `${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`;
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new Error(
        'Tenant context is required for PIS/PASEP base recompute',
      );
    }
    return tenantId;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for PIS/PASEP operations',
      );
    }
  }
}
