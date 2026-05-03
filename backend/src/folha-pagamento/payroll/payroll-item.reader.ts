import { NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  CountRow,
  EligibleEmployeeRow,
  FinancialTotalsRow,
  PayrollMappingRow,
  PayrollRunDetailRow,
  PayrollRunHistoryRow,
  PayrollRunRow,
  TerminatedEmployeeRow,
} from './payroll.types';

export class PayrollItemReader {
  constructor(private readonly databaseService: DatabaseService) {}

  async countRuns(searchTerm: string): Promise<number> {
    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM payroll.payroll_run pr
      LEFT JOIN hr.branch b ON b.id = pr.branch_id
      LEFT JOIN payroll.payroll_type pt ON pt.id = pr.payroll_type_id
      LEFT JOIN payroll.processing_type ptt ON ptt.id = pr.processing_type_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              pr.competence_year::text,
              lpad(pr.competence_month::text, 2, '0'),
              coalesce(b.name, ''),
              coalesce(pt.description, ''),
              coalesce(ptt.description, ''),
              pr.status::text
            )) LIKE $1
      `,
      [searchTerm],
    );
    return Number(count[0]?.total ?? 0);
  }

  async listRuns(
    searchTerm: string,
    pageSize: number,
    offset: number,
  ): Promise<PayrollRunRow[]> {
    return this.databaseService.query<PayrollRunRow>(
      `
      SELECT
        pr.id,
        pr.competence_year,
        pr.competence_month,
        ptt.description AS processing_type,
        pt.description AS payroll_type,
        b.name AS branch_name,
        NULL::date AS payment_date,
        pr.status::text AS status,
        pr.employee_count,
        pr.total_net::text AS total_net,
        pr.created_at,
        pr.updated_at
      FROM payroll.payroll_run pr
      LEFT JOIN hr.branch b ON b.id = pr.branch_id
      LEFT JOIN payroll.payroll_type pt ON pt.id = pr.payroll_type_id
      LEFT JOIN payroll.processing_type ptt ON ptt.id = pr.processing_type_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              pr.competence_year::text,
              lpad(pr.competence_month::text, 2, '0'),
              coalesce(b.name, ''),
              coalesce(pt.description, ''),
              coalesce(ptt.description, ''),
              pr.status::text
            )) LIKE $1
      ORDER BY pr.competence_year DESC, pr.competence_month DESC, pr.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );
  }

  async createRun(input: {
    competenceYear: number;
    competenceMonth: number;
    payrollTypeId: string;
    processingTypeId: string;
    branchId?: string;
  }): Promise<PayrollRunRow> {
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      INSERT INTO payroll.payroll_run (
        competence_year,
        competence_month,
        payroll_type_id,
        processing_type_id,
        branch_id,
        status
      )
      VALUES (
        $1,
        $2,
        $3::uuid,
        $4::uuid,
        NULLIF($5, '')::uuid,
        'DRAFT'::"PayrollRunStatus"
      )
      RETURNING
        id,
        competence_year,
        competence_month,
        NULL::text AS processing_type,
        NULL::text AS payroll_type,
        NULL::text AS branch_name,
        NULL::date AS payment_date,
        status::text AS status,
        employee_count,
        total_net::text AS total_net,
        created_at,
        updated_at
      `,
      [
        input.competenceYear,
        input.competenceMonth,
        input.payrollTypeId,
        input.processingTypeId,
        input.branchId ?? '',
      ],
    );
    return rows[0]!;
  }

  async listRunHistory(id: string): Promise<PayrollRunHistoryRow[]> {
    return this.databaseService.query<PayrollRunHistoryRow>(
      `
      SELECT
        history.id::text,
        history.status::text,
        history.changed_at,
        history.note,
        history.metadata->>'kind' AS kind,
        coalesce(history.metadata->>'employeeCount', history.metadata->>'employee_count') AS employee_count,
        coalesce(history.metadata->>'totalNet', history.metadata->>'total_net') AS total_net
      FROM payroll.payroll_run_status_history history
      JOIN payroll.payroll_run run ON run.id = history.payroll_run_id
      WHERE run.id = $1::uuid
      ORDER BY history.changed_at DESC, history.id DESC
      `,
      [id],
    );
  }

  async getRunDetail(id: string): Promise<PayrollRunDetailRow> {
    const rows = await this.databaseService.query<PayrollRunDetailRow>(
      `
      SELECT
        pr.id,
        pr.competence_year,
        pr.competence_month,
        ptt.description AS processing_type,
        pt.description AS payroll_type,
        b.name AS branch_name,
        NULL::date AS payment_date,
        pr.status::text AS status,
        pr.employee_count,
        pr.total_net::text AS total_net,
        pr.created_at,
        pr.updated_at,
        pr.branch_id::text AS branch_id,
        pr.payroll_type_id::text AS payroll_type_id,
        pt.code AS payroll_type_code,
        pr.processing_type_id::text AS processing_type_id,
        ptt.code AS processing_type_code
      FROM payroll.payroll_run pr
      JOIN payroll.payroll_type pt ON pt.id = pr.payroll_type_id
      JOIN payroll.processing_type ptt ON ptt.id = pr.processing_type_id
      LEFT JOIN hr.branch b ON b.id = pr.branch_id
      WHERE pr.id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Payroll run not found');
    return rows[0];
  }

  async listEligibleEmployees(
    run: PayrollRunDetailRow,
  ): Promise<EligibleEmployeeRow[]> {
    return this.databaseService.query<EligibleEmployeeRow>(
      `
      SELECT
        e.id::text AS employee_id,
        e.branch_id::text AS branch_id,
        e.work_location_id::text AS work_location_id,
        e.functional_status_id::text AS functional_status_id,
        e.job_position_id::text AS job_position_id,
        e.employment_link_id::text AS employment_link_id,
        sr.amount::text AS salary_amount
      FROM hr.employee e
      LEFT JOIN hr.salary_reference sr ON sr.id = e.salary_reference_id
      WHERE e.lifecycle_status IN (
          'ACTIVE'::"EmployeeLifecycleStatus",
          'ON_LEAVE'::"EmployeeLifecycleStatus"
        )
        AND (
          ($1::uuid IS NULL AND e.branch_id IS NULL)
          OR e.branch_id = $1::uuid
        )
      `,
      [run.branch_id],
    );
  }

  async listTerminatedEmployees(
    run: PayrollRunDetailRow,
  ): Promise<TerminatedEmployeeRow[]> {
    return this.databaseService.query<TerminatedEmployeeRow>(
      `
      SELECT
        e.id::text AS employee_id,
        e.functional_status_id::text AS functional_status_id,
        e.branch_id::text AS branch_id,
        sr.amount::text AS salary_amount,
        e.hired_on,
        e.terminated_on
      FROM hr.employee e
      LEFT JOIN hr.salary_reference sr ON sr.id = e.salary_reference_id
      WHERE e.lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus"
        AND e.terminated_on IS NOT NULL
        AND EXTRACT(YEAR FROM e.terminated_on) = $1
        AND EXTRACT(MONTH FROM e.terminated_on) = $2
        AND (
          ($3::uuid IS NULL AND e.branch_id IS NULL)
          OR e.branch_id = $3::uuid
        )
      `,
      [run.competence_year, run.competence_month, run.branch_id],
    );
  }

  async resolvePayrollMappings(
    run: PayrollRunDetailRow,
    employee: EligibleEmployeeRow,
  ): Promise<PayrollMappingRow[]> {
    return this.databaseService.query<PayrollMappingRow>(
      `
      SELECT DISTINCT ON (mapped.earning_deduction_id)
        mapped.earning_deduction_id,
        mapped.code,
        mapped.description,
        mapped.kind,
        mapped.formula_expression,
        mapped.default_amount,
        mapped.default_quantity
      FROM (
        SELECT
          ed.id::text AS earning_deduction_id,
          ed.code,
          ed.description,
          ed.kind::text AS kind,
          ed.formula_expression,
          pte.default_amount::text AS default_amount,
          pte.default_quantity::text AS default_quantity,
          1 AS priority
        FROM payroll.payroll_type_earning pte
        JOIN payroll.payroll_earning_deduction ed
          ON ed.id = pte.earning_deduction_id
        WHERE pte.payroll_type_id = $1::uuid
          AND pte.status = 'ACTIVE'::"RecordStatus"
          AND (pte.starts_on IS NULL OR pte.starts_on <= make_date($2, $3, 1))
          AND (pte.ends_on IS NULL OR pte.ends_on >= make_date($2, $3, 1))
        UNION ALL
        SELECT
          ed.id::text AS earning_deduction_id,
          ed.code,
          ed.description,
          ed.kind::text AS kind,
          ed.formula_expression,
          ele.default_amount::text AS default_amount,
          ele.default_quantity::text AS default_quantity,
          2 AS priority
        FROM payroll.employment_link_earning ele
        JOIN payroll.payroll_earning_deduction ed
          ON ed.id = ele.earning_deduction_id
        WHERE ele.employment_link_id = $4::uuid
          AND ele.status = 'ACTIVE'::"RecordStatus"
          AND (ele.starts_on IS NULL OR ele.starts_on <= make_date($2, $3, 1))
          AND (ele.ends_on IS NULL OR ele.ends_on >= make_date($2, $3, 1))
        UNION ALL
        SELECT
          ed.id::text AS earning_deduction_id,
          ed.code,
          ed.description,
          ed.kind::text AS kind,
          ed.formula_expression,
          jpe.default_amount::text AS default_amount,
          jpe.default_quantity::text AS default_quantity,
          3 AS priority
        FROM payroll.job_position_earning jpe
        JOIN payroll.payroll_earning_deduction ed
          ON ed.id = jpe.earning_deduction_id
        WHERE jpe.job_position_id = $5::uuid
          AND jpe.status = 'ACTIVE'::"RecordStatus"
          AND (jpe.starts_on IS NULL OR jpe.starts_on <= make_date($2, $3, 1))
          AND (jpe.ends_on IS NULL OR jpe.ends_on >= make_date($2, $3, 1))
      ) mapped
      ORDER BY mapped.earning_deduction_id, mapped.priority
      `,
      [
        run.payroll_type_id,
        run.competence_year,
        run.competence_month,
        employee.employment_link_id,
        employee.job_position_id,
      ],
    );
  }

  async getFinancialTotals(id: string): Promise<FinancialTotalsRow> {
    const totals = await this.databaseService.query<FinancialTotalsRow>(
      `
      SELECT
        count(DISTINCT employee_id)::text AS employee_count,
        coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_earnings,
        coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_deductions,
        coalesce(sum(CASE
          WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::text AS total_net
      FROM payroll.v_payroll_run_line_active item
      JOIN payroll.payroll_earning_deduction ed
        ON ed.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      `,
      [id],
    );

    return (
      totals[0] ?? {
        employee_count: '0',
        total_earnings: '0',
        total_deductions: '0',
        total_net: '0',
      }
    );
  }

  async getSummary(id: string): Promise<PayrollRunRow> {
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      SELECT
        pr.id,
        pr.competence_year,
        pr.competence_month,
        ptt.description AS processing_type,
        pt.description AS payroll_type,
        b.name AS branch_name,
        NULL::date AS payment_date,
        pr.status::text AS status,
        pr.employee_count,
        pr.total_net::text AS total_net,
        pr.created_at,
        pr.updated_at
      FROM payroll.payroll_run pr
      LEFT JOIN hr.branch b ON b.id = pr.branch_id
      LEFT JOIN payroll.payroll_type pt ON pt.id = pr.payroll_type_id
      LEFT JOIN payroll.processing_type ptt ON ptt.id = pr.processing_type_id
      WHERE pr.id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll run not found');
    }
    return rows[0];
  }
}
