import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  PayrollSummaryRow,
  ReconciliationRow,
  ReportJobRow,
  ReportLineRow,
} from './report-worker.types';

@Injectable()
export class ReportWorkerDataService {
  constructor(private readonly databaseService: DatabaseService) {}

  async loadPayrollSummary(job: ReportJobRow): Promise<PayrollSummaryRow> {
    const rows = await this.databaseService.query<PayrollSummaryRow>(
      `
      SELECT
        run.id::text AS payroll_run_id,
        run.competence_year,
        run.competence_month,
        branch.name AS branch_name,
        run.status::text AS status,
        run.employee_count::text,
        run.total_earnings::text,
        run.total_deductions::text,
        run.total_net::text
      FROM payroll.payroll_run run
      LEFT JOIN hr.branch branch
        ON branch.id = run.branch_id
       AND branch.tenant_id = run.tenant_id
      WHERE (
          $1::uuid IS NOT NULL
          AND run.id = $1::uuid
        )
        OR (
          $1::uuid IS NULL
          AND run.competence_year = $2::integer
          AND run.competence_month = $3::integer
          AND ($4::uuid IS NULL OR run.branch_id = $4::uuid)
        )
      ORDER BY run.updated_at DESC
      LIMIT 1
      `,
      this.criteriaValues(job),
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Payroll run source not found for report request');
    }
    return row;
  }

  loadFinancialByBranch(job: ReportJobRow): Promise<ReportLineRow[]> {
    return this.databaseService.query<ReportLineRow>(
      `
      SELECT
        coalesce(branch.name, 'Sem filial') AS label,
        count(DISTINCT financial.employee_id)::text AS employee_count,
        coalesce(sum(financial.total_earnings), 0)::numeric(16, 2)::text AS total_earnings,
        coalesce(sum(financial.total_deductions), 0)::numeric(16, 2)::text AS total_deductions,
        coalesce(sum(financial.net_amount), 0)::numeric(16, 2)::text AS total_net
      FROM payroll.payroll_financial_record financial
      LEFT JOIN hr.branch branch
        ON branch.id = financial.branch_id
       AND branch.tenant_id = financial.tenant_id
      WHERE (
          $1::uuid IS NOT NULL
          AND financial.payroll_run_id = $1::uuid
        )
        OR (
          $1::uuid IS NULL
          AND financial.competence_year = $2::integer
          AND financial.competence_month = $3::integer
          AND ($4::uuid IS NULL OR financial.branch_id = $4::uuid)
        )
      GROUP BY coalesce(branch.name, 'Sem filial')
      ORDER BY label ASC
      `,
      this.criteriaValues(job),
    );
  }

  loadFinancialByFunctionalStatus(job: ReportJobRow): Promise<ReportLineRow[]> {
    return this.databaseService.query<ReportLineRow>(
      `
      SELECT
        coalesce(status.description, 'Sem situacao') AS label,
        count(DISTINCT financial.employee_id)::text AS employee_count,
        coalesce(sum(financial.total_earnings), 0)::numeric(16, 2)::text AS total_earnings,
        coalesce(sum(financial.total_deductions), 0)::numeric(16, 2)::text AS total_deductions,
        coalesce(sum(financial.net_amount), 0)::numeric(16, 2)::text AS total_net
      FROM payroll.payroll_financial_record financial
      LEFT JOIN hr.functional_status status
        ON status.id = financial.functional_status_id
       AND status.tenant_id = financial.tenant_id
      WHERE (
          $1::uuid IS NOT NULL
          AND financial.payroll_run_id = $1::uuid
        )
        OR (
          $1::uuid IS NULL
          AND financial.competence_year = $2::integer
          AND financial.competence_month = $3::integer
          AND ($4::uuid IS NULL OR financial.branch_id = $4::uuid)
        )
      GROUP BY coalesce(status.description, 'Sem situacao')
      ORDER BY label ASC
      `,
      this.criteriaValues(job),
    );
  }

  loadBlockedPayments(job: ReportJobRow): Promise<ReportLineRow[]> {
    return this.databaseService.query<ReportLineRow>(
      `
      SELECT
        employee.registration || ' - ' || employee.name AS label,
        '1'::text AS employee_count,
        '0.00'::text AS total_earnings,
        '0.00'::text AS total_deductions,
        '0.00'::text AS total_net
      FROM payroll.blocked_payment blocked
      JOIN hr.employee employee
        ON employee.id = blocked.employee_id
       AND employee.tenant_id = blocked.tenant_id
      WHERE blocked.released_at IS NULL
        AND (
          (
            $1::uuid IS NOT NULL
            AND blocked.payroll_run_id = $1::uuid
          )
          OR (
            $1::uuid IS NULL
            AND blocked.competence_year = $2::integer
            AND blocked.competence_month = $3::integer
            AND ($4::uuid IS NULL OR blocked.branch_id = $4::uuid)
          )
        )
      ORDER BY employee.registration ASC
      LIMIT 200
      `,
      this.criteriaValues(job),
    );
  }

  loadReconciliation(job: ReportJobRow): Promise<ReconciliationRow[]> {
    return this.databaseService.query<ReconciliationRow>(
      `
      WITH run AS (
        SELECT
          payroll_run.id,
          payroll_run.competence_year,
          payroll_run.competence_month,
          payroll_run.employee_count::numeric AS employee_count,
          payroll_run.total_earnings,
          payroll_run.total_deductions,
          payroll_run.total_net
        FROM payroll.payroll_run
        WHERE (
            $1::uuid IS NOT NULL
            AND payroll_run.id = $1::uuid
          )
          OR (
            $1::uuid IS NULL
            AND payroll_run.competence_year = $2::integer
            AND payroll_run.competence_month = $3::integer
            AND ($4::uuid IS NULL OR payroll_run.branch_id = $4::uuid)
          )
        ORDER BY payroll_run.updated_at DESC
        LIMIT 1
      ),
      financial AS (
        SELECT
          count(DISTINCT record.employee_id)::numeric AS employee_count,
          coalesce(sum(record.total_earnings), 0)::numeric(16, 2) AS total_earnings,
          coalesce(sum(record.total_deductions), 0)::numeric(16, 2) AS total_deductions,
          coalesce(sum(record.net_amount), 0)::numeric(16, 2) AS total_net
        FROM payroll.payroll_financial_record record
        JOIN run ON run.id = record.payroll_run_id
      ),
      item_totals AS (
        SELECT
          coalesce(sum(item.amount) FILTER (
            WHERE earning.code IN ('INSS', 'RPPS')
              OR earning.incidences @> '{"official_social_security": true}'::jsonb
          ), 0)::numeric(16, 2) AS social_security,
          coalesce(sum(item.amount) FILTER (
            WHERE earning.code = 'IRRF'
              OR earning.incidences @> '{"income_tax": true}'::jsonb
          ), 0)::numeric(16, 2) AS irrf
        FROM payroll.employee_payroll_item item
        JOIN payroll.payroll_earning_deduction earning
          ON earning.id = item.earning_deduction_id
         AND earning.tenant_id = item.tenant_id
        JOIN run ON run.id = item.payroll_run_id
        WHERE item.deleted_at IS NULL
      ),
      esocial_totals AS (
        SELECT
          coalesce(sum(NULLIF((COALESCE(totalizer.response->'payload', totalizer.response, totalizer.payload))->>'seguradoContributionTotal', '')::numeric) FILTER (
            WHERE totalizer.event_class IN ('S-5001', 'S-5011')
          ), 0)::numeric(16, 2) AS social_security,
          coalesce(sum(NULLIF((COALESCE(totalizer.response->'payload', totalizer.response, totalizer.payload))->>'irrfTotal', '')::numeric) FILTER (
            WHERE totalizer.event_class IN ('S-5002', 'S-5012')
          ), 0)::numeric(16, 2) AS irrf
        FROM run
        LEFT JOIN public.esocial_spool totalizer
          ON totalizer.tenant_id = run.tenant_id
         AND COALESCE(totalizer.source_ref->>'competence', totalizer.payload->>'competence') = make_date(run.competence_year, run.competence_month, 1)::text
         AND totalizer.status = 'ACCEPTED'::public.esocial_spool_status
      )
      SELECT metric, source_total::text, recomputed_total::text, difference::text
      FROM (
        VALUES
          ('employee_count', (SELECT employee_count FROM run), (SELECT employee_count FROM financial)),
          ('total_earnings', (SELECT total_earnings FROM run), (SELECT total_earnings FROM financial)),
          ('total_deductions', (SELECT total_deductions FROM run), (SELECT total_deductions FROM financial)),
          ('total_net', (SELECT total_net FROM run), (SELECT total_net FROM financial)),
          ('inss_esocial_s5011', (SELECT social_security FROM item_totals), (SELECT social_security FROM esocial_totals)),
          ('irrf_esocial_s5012_s5002', (SELECT irrf FROM item_totals), (SELECT irrf FROM esocial_totals))
      ) AS rows(metric, source_total, recomputed_total)
      CROSS JOIN LATERAL (
        SELECT (rows.source_total - rows.recomputed_total)::numeric(16, 2) AS difference
      ) diff
      `,
      this.criteriaValues(job),
    );
  }

  private criteriaValues(
    job: ReportJobRow,
  ): [string | null, number, number, string | null] {
    const params = job.parameters ?? {};
    const payrollRunId =
      job.payroll_run_id ?? this.readString(params, 'payrollRunId');
    const competenceYear =
      job.competence_year ?? Number(params.competenceYear ?? 0);
    const competenceMonth =
      job.competence_month ?? Number(params.competenceMonth ?? 0);
    const branchId = job.branch_id ?? this.readString(params, 'branchId');
    if (!payrollRunId && (!competenceYear || !competenceMonth)) {
      throw new Error(
        'Report request requires payrollRunId or competenceYear/competenceMonth',
      );
    }
    return [payrollRunId, competenceYear, competenceMonth, branchId];
  }

  private readString(
    parameters: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = parameters[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
