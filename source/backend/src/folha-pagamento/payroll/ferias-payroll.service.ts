import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

interface VacationContextRow extends QueryResultRow {
  vacation_record_id: string;
  employee_id: string;
  branch_id: string | null;
  functional_status_id: string | null;
  starts_on: string | Date;
  payroll_run_id: string | null;
  status: string;
}

interface CatalogRow extends QueryResultRow {
  payroll_type_id: string;
  processing_type_id: string;
}

interface ComputedItemRow extends QueryResultRow {
  item_code: string;
  amount: string;
  reference_value: string;
  quantity: string;
  metadata: Record<string, unknown>;
}

interface TotalsRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export interface FeriasPayrollRunResult {
  payrollRunId: string;
  vacationRecordId: string;
  employeeId: string;
  year: number;
  month: number;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
}

@Injectable()
export class FeriasPayrollService {
  constructor(private readonly databaseService: DatabaseService) {}

  async run(vacationRecordId: string): Promise<FeriasPayrollRunResult> {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for vacation payroll processing',
      );
    }

    return this.databaseService.transaction(async (client) => {
      const vacation = await this.loadVacationRecord(client, vacationRecordId);
      if (!vacation) {
        throw new NotFoundException('Vacation schedule not found');
      }
      if (vacation.status === 'cancelado') {
        throw new ConflictException('Canceled vacation cannot be paid');
      }

      const startsOn = new Date(vacation.starts_on);
      const year = startsOn.getUTCFullYear();
      const month = startsOn.getUTCMonth() + 1;
      const catalog = await this.ensureCatalog(client);
      const runId =
        vacation.payroll_run_id ??
        (await this.ensureRun(client, catalog, year, month));

      await client.query(
        `
        DELETE FROM payroll.employee_payroll_item
        WHERE payroll_run_id = $1::uuid
          AND employee_id = $2::uuid
          AND source = 'CALCULATED'::"PayrollEntrySource"
          AND notes LIKE $3
        `,
        [runId, vacation.employee_id, `%${vacation.vacation_record_id}%`],
      );

      const computed = await client.query<ComputedItemRow>(
        `
        SELECT *
        FROM payroll_calc.compute_ferias(
          public.sgp_current_tenant_uuid(),
          $1::uuid
        )
        `,
        [vacation.vacation_record_id],
      );

      for (const item of computed.rows) {
        await client.query(
          `
          INSERT INTO payroll.employee_payroll_item (
            tenant_id,
            employee_id,
            payroll_run_id,
            earning_deduction_id,
            source,
            competence_year,
            competence_month,
            quantity,
            reference_value,
            amount,
            notes
          )
          SELECT
            public.sgp_current_tenant_uuid(),
            $1::uuid,
            $2::uuid,
            ped.id,
            'CALCULATED'::"PayrollEntrySource",
            $3,
            $4,
            $5::decimal,
            $6::decimal,
            $9::decimal,
            $7
          FROM payroll.payroll_earning_deduction ped
          WHERE ped.tenant_id = public.sgp_current_tenant_uuid()
            AND ped.code = $8
          `,
          [
            vacation.employee_id,
            runId,
            year,
            month,
            item.quantity,
            item.reference_value,
            `vacation_record_id=${vacation.vacation_record_id}; amount=${item.amount}`,
            item.item_code,
            item.amount,
          ],
        );
      }

      const totals = await this.refreshAggregates(client, runId);
      await this.upsertFinancialRecord(client, vacation, runId, year, month);
      await client.query(
        `
        UPDATE hr.vacation_record
        SET payroll_run_id = $2::uuid,
            status = 'paid',
            updated_at = now()
        WHERE id = $1::uuid
        `,
        [vacation.vacation_record_id, runId],
      );
      await this.appendAuditEvent(client, vacation.vacation_record_id, runId);

      return {
        payrollRunId: runId,
        vacationRecordId: vacation.vacation_record_id,
        employeeId: vacation.employee_id,
        year,
        month,
        employeeCount: Number(totals.employee_count),
        totalEarnings: totals.total_earnings,
        totalDeductions: totals.total_deductions,
        totalNet: totals.total_net,
      };
    });
  }

  private async loadVacationRecord(
    client: PoolClient,
    vacationRecordId: string,
  ): Promise<VacationContextRow | null> {
    const result = await client.query<VacationContextRow>(
      `
      SELECT
        vacation.id::text AS vacation_record_id,
        vacation.employee_id::text AS employee_id,
        employee.branch_id::text AS branch_id,
        employee.functional_status_id::text AS functional_status_id,
        vacation.starts_on,
        vacation.payroll_run_id::text,
        vacation.status
      FROM hr.vacation_record vacation
      JOIN hr.employee employee ON employee.id = vacation.employee_id
      WHERE vacation.id = $1::uuid
        AND vacation.tenant_id = public.sgp_current_tenant_uuid()
      `,
      [vacationRecordId],
    );
    return result.rows[0] ?? null;
  }

  private async ensureCatalog(client: PoolClient): Promise<CatalogRow> {
    const result = await client.query<CatalogRow>(
      `
      WITH payroll_type_upsert AS (
        INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
        VALUES (public.sgp_current_tenant_uuid(), 'FERIAS', 'Folha de ferias', 'ACTIVE'::"RecordStatus")
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET description = EXCLUDED.description,
            status = EXCLUDED.status,
            updated_at = now()
        RETURNING id
      ),
      payroll_type_row AS (
        SELECT id FROM payroll_type_upsert
        UNION ALL
        SELECT id FROM payroll.payroll_type
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND code = 'FERIAS'
        LIMIT 1
      ),
      processing_type_upsert AS (
        INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
        SELECT public.sgp_current_tenant_uuid(), 'FERIAS', 'Folha de ferias', id, 'ACTIVE'::"RecordStatus"
        FROM payroll_type_row
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET description = EXCLUDED.description,
            payroll_type_id = EXCLUDED.payroll_type_id,
            status = EXCLUDED.status,
            updated_at = now()
        RETURNING id
      )
      SELECT
        (SELECT id::text FROM payroll_type_row) AS payroll_type_id,
        (SELECT id::text FROM processing_type_upsert) AS processing_type_id
      `,
    );
    return result.rows[0];
  }

  private async ensureRun(
    client: PoolClient,
    catalog: CatalogRow,
    year: number,
    month: number,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO payroll.payroll_run (
        tenant_id,
        competence_year,
        competence_month,
        payroll_type_id,
        processing_type_id,
        branch_id,
        status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1,
        $2,
        $3::uuid,
        $4::uuid,
        NULL,
        'PROCESSING'::"PayrollRunStatus"
      )
      ON CONFLICT (tenant_id, competence_year, competence_month, branch_id, payroll_type_id, processing_type_id)
      DO UPDATE SET status = 'PROCESSING'::"PayrollRunStatus",
                    updated_at = now()
      RETURNING id::text
      `,
      [year, month, catalog.payroll_type_id, catalog.processing_type_id],
    );
    return result.rows[0].id;
  }

  private async refreshAggregates(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<TotalsRow> {
    const totals = await client.query<TotalsRow>(
      `
      SELECT
        count(DISTINCT item.employee_id)::text AS employee_count,
        coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_earnings,
        coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_deductions,
        coalesce(sum(CASE
          WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::text AS total_net
      FROM payroll.employee_payroll_item item
      JOIN payroll.payroll_earning_deduction ed ON ed.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      `,
      [payrollRunId],
    );
    const summary = totals.rows[0];
    await client.query(
      `
      UPDATE payroll.payroll_run
      SET employee_count = $2::int,
          total_earnings = $3::decimal,
          total_deductions = $4::decimal,
          total_net = $5::decimal,
          status = 'GENERATED'::"PayrollRunStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [
        payrollRunId,
        summary.employee_count,
        summary.total_earnings,
        summary.total_deductions,
        summary.total_net,
      ],
    );
    return summary;
  }

  private async upsertFinancialRecord(
    client: PoolClient,
    vacation: VacationContextRow,
    payrollRunId: string,
    year: number,
    month: number,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO payroll.payroll_financial_record (
        tenant_id,
        employee_id,
        payroll_run_id,
        branch_id,
        functional_status_id,
        competence_year,
        competence_month,
        total_earnings,
        total_deductions,
        net_amount,
        metadata
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        NULLIF($3, '')::uuid,
        NULLIF($4, '')::uuid,
        $5,
        $6,
        run.total_earnings,
        run.total_deductions,
        run.total_net,
        jsonb_build_object('origin', 'vacation_payroll', 'vacationRecordId', $7::text)
      FROM payroll.payroll_run run
      WHERE run.id = $2::uuid
      ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id)
      DO UPDATE SET
        total_earnings = EXCLUDED.total_earnings,
        total_deductions = EXCLUDED.total_deductions,
        net_amount = EXCLUDED.net_amount,
        metadata = EXCLUDED.metadata,
        generated_at = now()
      `,
      [
        vacation.employee_id,
        payrollRunId,
        vacation.branch_id ?? '',
        vacation.functional_status_id ?? '',
        year,
        month,
        vacation.vacation_record_id,
      ],
    );
  }

  private async appendAuditEvent(
    client: PoolClient,
    vacationRecordId: string,
    payrollRunId: string,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO payroll.payroll_run_status_history (
        tenant_id,
        payroll_run_id,
        status,
        note,
        metadata
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        'GENERATED'::"PayrollRunStatus",
        'Vacation payroll calculated',
        $2::jsonb
      )
      `,
      [
        payrollRunId,
        JSON.stringify({ event: 'calc05.ferias.generated', vacationRecordId }),
      ],
    );
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'PROCESS',
        'payroll.ferias',
        $1::text,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'hr.vacation_record',
        NULLIF(current_setting('app.request_id', true), ''),
        $2::jsonb,
        NULL::text,
        NULL::text,
        NULL::text
      )
      `,
      [
        vacationRecordId,
        JSON.stringify({
          event: 'calc05.ferias.generated',
          payrollRunId,
        }),
      ],
    );
  }
}
