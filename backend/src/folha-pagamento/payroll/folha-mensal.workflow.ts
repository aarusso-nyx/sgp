import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { FolhaMensalCompetenceDto } from './payroll.dto';
import {
  CatalogRow,
  CompetenceRow,
  CompetenceStatus,
  CountRow,
  FolhaMensalResult,
  FolhaMensalReviewLine,
  MonthlyRubricPhase,
  PayrollRunStatus,
  ReviewRow,
  RunRow,
  ValidationRow,
} from './folha-mensal.types';

export class FolhaMensalWorkflow {
  constructor(private readonly databaseService: DatabaseService) {}

  ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for monthly payroll operations',
      );
    }
  }

  transaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.databaseService.transaction(handler);
  }

  async ensureCatalog(client: PoolClient): Promise<CatalogRow> {
    const rows = await client.query<CatalogRow>(
      `
      WITH payroll_type_upsert AS (
        INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
        VALUES (public.sgp_current_tenant_uuid(), 'MENSAL', 'Folha mensal', 'ACTIVE'::"RecordStatus")
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
          AND code = 'MENSAL'
        LIMIT 1
      ),
      processing_type_upsert AS (
        INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
        SELECT public.sgp_current_tenant_uuid(), 'MENSAL', 'Folha mensal completa', id, 'ACTIVE'::"RecordStatus"
        FROM payroll_type_row
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET description = EXCLUDED.description,
            payroll_type_id = EXCLUDED.payroll_type_id,
            status = EXCLUDED.status,
            updated_at = now()
        RETURNING id
      ),
      processing_type_row AS (
        SELECT id FROM processing_type_upsert
        UNION ALL
        SELECT id FROM payroll.processing_type
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND code = 'MENSAL'
        LIMIT 1
      ),
      earning_upsert AS (
        INSERT INTO payroll.payroll_earning_deduction (
          tenant_id,
          code,
          description,
          kind,
          taxable,
          active,
          incidences,
          starts_on,
          subject_to_ceiling,
          formula_alias,
          formula_function_name,
          formula_expression,
          formula_function_ddl,
          formula_dependencies,
          formula_ready
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          'MONTHLY_BASE_SALARY',
          'Monthly base salary',
          'EARNING'::"PayrollEntryKind",
          true,
          true,
          '{"monthly_payroll":true,"base_salary":true}'::jsonb,
          DATE '2025-01-01',
          true,
          'monthly_base_salary',
          'f_monthly_base_salary',
          'round(base_salary(p_employee_id, make_date(p_year, p_month, 1)) * proportional_ratio(p_employee_id, p_month, p_year), 2)',
          'CREATE OR REPLACE FUNCTION payroll_calc.f_monthly_base_salary(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = payroll_calc, hr, payroll, public, pg_catalog AS $function$ SELECT round(payroll_calc.base_salary($1, make_date($3, $2, 1)) * payroll_calc.proportional_ratio($1, $2, $3), 2); $function$;',
          ARRAY['BASE_SALARY'],
          true
        )
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET description = EXCLUDED.description,
            kind = EXCLUDED.kind,
            taxable = EXCLUDED.taxable,
            active = true,
            incidences = EXCLUDED.incidences,
            starts_on = EXCLUDED.starts_on,
            subject_to_ceiling = EXCLUDED.subject_to_ceiling,
            formula_alias = EXCLUDED.formula_alias,
            formula_function_name = EXCLUDED.formula_function_name,
            formula_expression = EXCLUDED.formula_expression,
            formula_function_ddl = EXCLUDED.formula_function_ddl,
            formula_dependencies = EXCLUDED.formula_dependencies,
            formula_ready = true,
            formula_error = NULL,
            updated_at = now()
        RETURNING id
      ),
      earning_row AS (
        SELECT id FROM earning_upsert
        UNION ALL
        SELECT id FROM payroll.payroll_earning_deduction
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND code = 'MONTHLY_BASE_SALARY'
        LIMIT 1
      ),
      consignment_deduction_upsert AS (
        INSERT INTO payroll.payroll_earning_deduction (
          tenant_id,
          code,
          description,
          kind,
          taxable,
          active,
          incidences,
          starts_on,
          subject_to_ceiling,
          formula_alias,
          formula_function_name,
          formula_expression,
          formula_function_ddl,
          formula_dependencies,
          formula_ready
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          'CONSIGNMENT_LOAN_DEDUCTION',
          'Consignment loan deduction',
          'DEDUCTION'::"PayrollEntryKind",
          false,
          true,
          '{"monthly_payroll":true,"consignment":true,"deduction_order":"after_pension_and_legal"}'::jsonb,
          DATE '2025-01-01',
          false,
          'consignment_loan_deduction',
          'f_consignment_loan_deduction',
          '0',
          'CREATE OR REPLACE FUNCTION payroll_calc.f_consignment_loan_deduction(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = payroll_calc, hr, payroll, public, pg_catalog AS $function$ SELECT 0::numeric(14,2); $function$;',
          ARRAY['REFERENCE_VALUE'],
          true
        )
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET description = EXCLUDED.description,
            kind = EXCLUDED.kind,
            taxable = EXCLUDED.taxable,
            active = true,
            incidences = EXCLUDED.incidences,
            starts_on = EXCLUDED.starts_on,
            subject_to_ceiling = EXCLUDED.subject_to_ceiling,
            formula_alias = EXCLUDED.formula_alias,
            formula_function_name = EXCLUDED.formula_function_name,
            formula_expression = EXCLUDED.formula_expression,
            formula_function_ddl = EXCLUDED.formula_function_ddl,
            formula_dependencies = EXCLUDED.formula_dependencies,
            formula_ready = true,
            formula_error = NULL,
            updated_at = now()
        RETURNING id
      ),
      consignment_deduction_row AS (
        SELECT id FROM consignment_deduction_upsert
        UNION ALL
        SELECT id FROM payroll.payroll_earning_deduction
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND code = 'CONSIGNMENT_LOAN_DEDUCTION'
        LIMIT 1
      ),
      consignment_type_earning AS (
        INSERT INTO payroll.payroll_type_earning (
          tenant_id,
          payroll_type_id,
          earning_deduction_id,
          default_quantity,
          starts_on,
          status
        )
        SELECT
          public.sgp_current_tenant_uuid(),
          (SELECT id FROM payroll_type_row),
          (SELECT id FROM consignment_deduction_row),
          1,
          DATE '2025-01-01',
          'ACTIVE'::"RecordStatus"
        ON CONFLICT (tenant_id, payroll_type_id, earning_deduction_id) DO UPDATE
        SET default_quantity = EXCLUDED.default_quantity,
            starts_on = EXCLUDED.starts_on,
            status = EXCLUDED.status,
            updated_at = now()
        RETURNING id
      )
      INSERT INTO payroll.payroll_type_earning (
        tenant_id,
        payroll_type_id,
        earning_deduction_id,
        default_quantity,
        starts_on,
        status
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        (SELECT id FROM payroll_type_row),
        (SELECT id FROM earning_row),
        1,
        DATE '2025-01-01',
        'ACTIVE'::"RecordStatus"
      ON CONFLICT (tenant_id, payroll_type_id, earning_deduction_id) DO UPDATE
      SET default_quantity = EXCLUDED.default_quantity,
          starts_on = EXCLUDED.starts_on,
          status = EXCLUDED.status,
          updated_at = now()
      RETURNING
        (SELECT id::text FROM payroll_type_row) AS payroll_type_id,
        (SELECT id::text FROM processing_type_row) AS processing_type_id,
        (SELECT id::text FROM earning_row) AS base_earning_id,
        (SELECT id::text FROM consignment_deduction_row) AS consignment_deduction_id
      `,
    );
    const row = rows.rows[0];
    if (!row) {
      throw new Error('Monthly payroll catalog could not be ensured');
    }
    return row;
  }

  async ensureCompetence(
    client: PoolClient,
    input: FolhaMensalCompetenceDto,
    status: CompetenceStatus,
  ): Promise<CompetenceRow> {
    const code = this.competenceCode(input);
    const rows = await client.query<CompetenceRow>(
      `
      INSERT INTO hr.competence_period (
        tenant_id,
        code,
        name,
        description,
        competence_year,
        competence_month,
        status,
        opened_at
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1,
        $2,
        'Monthly payroll competence',
        $3,
        $4,
        $5,
        now()
      )
      ON CONFLICT (tenant_id, competence_year, competence_month) DO UPDATE
      SET status = CASE
            WHEN hr.competence_period.status = 'CLOSED' THEN hr.competence_period.status
            ELSE EXCLUDED.status
          END,
          opened_at = COALESCE(hr.competence_period.opened_at, EXCLUDED.opened_at),
          updated_at = now()
      RETURNING
        id::text,
        competence_year,
        competence_month,
        status,
        opened_at,
        closed_at
      `,
      [code, `Competence ${code}`, input.year, input.month, status],
    );
    const row = rows.rows[0];
    if (!row) {
      throw new Error('Monthly competence could not be ensured');
    }
    if (row.status === 'CLOSED') {
      throw new ConflictException('Monthly competence is already closed');
    }
    return row;
  }

  async ensureRun(
    client: PoolClient,
    catalog: CatalogRow,
    input: FolhaMensalCompetenceDto,
    status: PayrollRunStatus,
  ): Promise<RunRow> {
    const existing = await client.query<RunRow>(
      `
      SELECT
        id::text,
        competence_year,
        competence_month,
        status::text,
        employee_count,
        total_earnings::text,
        total_deductions::text,
        total_net::text
      FROM payroll.payroll_run
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND competence_year = $1
        AND competence_month = $2
        AND branch_id IS NULL
        AND payroll_type_id = $3::uuid
        AND processing_type_id = $4::uuid
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [
        input.year,
        input.month,
        catalog.payroll_type_id,
        catalog.processing_type_id,
      ],
    );
    if (existing.rows[0]) return existing.rows[0];

    const inserted = await client.query<RunRow>(
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
        $5::"PayrollRunStatus"
      )
      RETURNING
        id::text,
        competence_year,
        competence_month,
        status::text,
        employee_count,
        total_earnings::text,
        total_deductions::text,
        total_net::text
      `,
      [
        input.year,
        input.month,
        catalog.payroll_type_id,
        catalog.processing_type_id,
        status,
      ],
    );
    return inserted.rows[0]!;
  }

  async loadContext(client: PoolClient, input: FolhaMensalCompetenceDto) {
    const catalog = await this.ensureCatalog(client);
    const competenceRows = await client.query<CompetenceRow>(
      `
      SELECT
        id::text,
        competence_year,
        competence_month,
        status,
        opened_at,
        closed_at
      FROM hr.competence_period
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND competence_year = $1
        AND competence_month = $2
      LIMIT 1
      `,
      [input.year, input.month],
    );
    const competence = competenceRows.rows[0];
    if (!competence) {
      throw new NotFoundException('Monthly competence is not open');
    }
    const run = await this.ensureRun(client, catalog, input, 'DRAFT');
    return { catalog, competence, run };
  }

  assertCompetenceStatus(
    current: CompetenceStatus,
    allowed: CompetenceStatus[],
  ): void {
    if (!allowed.includes(current)) {
      throw new ConflictException(
        `Monthly competence status ${current} cannot transition from this operation`,
      );
    }
  }

  async updateCompetenceStatus(
    client: PoolClient,
    competenceId: string,
    status: CompetenceStatus,
  ): Promise<void> {
    await client.query(
      `
      UPDATE hr.competence_period
      SET status = $2,
          closed_at = CASE WHEN $2 = 'CLOSED' THEN now() ELSE closed_at END,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [competenceId, status],
    );
  }

  async reopenCompetenceStatus(
    client: PoolClient,
    competenceId: string,
  ): Promise<void> {
    await client.query(
      `
      UPDATE hr.competence_period
      SET status = 'OPEN',
          closed_at = NULL,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [competenceId],
    );
  }

  async updateRunStatus(
    client: PoolClient,
    payrollRunId: string,
    status: PayrollRunStatus,
  ): Promise<void> {
    await client.query(
      `
      UPDATE payroll.payroll_run
      SET status = $2::"PayrollRunStatus",
          closed_at = CASE WHEN $2::"PayrollRunStatus" = 'CLOSED'::"PayrollRunStatus" THEN now() ELSE closed_at END,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [payrollRunId, status],
    );
  }

  async reopenRunStatus(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<void> {
    await client.query(
      `
      UPDATE payroll.payroll_run
      SET status = 'DRAFT'::"PayrollRunStatus",
          closed_at = NULL,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [payrollRunId],
    );
  }

  async softDeleteCalculatedItems(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<void> {
    await client.query(
      `
      UPDATE payroll.employee_payroll_item
      SET deleted_at = now(),
          deleted_reason = 'calc11.monthly.reprocessed',
          updated_at = now()
      WHERE payroll_run_id = $1::uuid
        AND source = 'CALCULATED'::"PayrollEntrySource"
        AND deleted_at IS NULL
      `,
      [payrollRunId],
    );
  }

  async deleteFinancialRecords(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<void> {
    await client.query(
      `
      DELETE FROM payroll.payroll_financial_record
      WHERE payroll_run_id = $1::uuid
      `,
      [payrollRunId],
    );
  }

  async insertMonthlyCalculatedItems(
    client: PoolClient,
    payrollRunId: string,
    payrollTypeId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<number> {
    const phases: MonthlyRubricPhase[] = [
      'earning',
      'social_security',
      'income_tax',
    ];
    let inserted = 0;
    for (const phase of phases) {
      inserted += await this.insertMonthlyCalculatedItemsForPhase(
        client,
        payrollRunId,
        payrollTypeId,
        input,
        phase,
      );
    }
    return inserted;
  }

  async refreshFinancialRecords(
    client: PoolClient,
    payrollRunId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<void> {
    await client.query(
      'SELECT payroll.sgp_create_payroll_financial_record_partition(make_date($1::integer, $2::integer, 1))',
      [input.year, input.month],
    );
    await client.query(
      `
      INSERT INTO payroll.payroll_financial_record (
        tenant_id,
        employee_id,
        payroll_run_id,
        branch_id,
        work_location_id,
        functional_status_id,
        competence_year,
        competence_month,
        competence,
        total_earnings,
        total_deductions,
        net_amount,
        metadata
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        employee.id,
        $1::uuid,
        employee.branch_id,
        employee.work_location_id,
        employee.functional_status_id,
        $2,
        $3,
        make_date($2::integer, $3::integer, 1),
        round(coalesce(sum(CASE WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0), 2)::numeric(16, 2),
        round(coalesce(sum(CASE WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0), 2)::numeric(16, 2),
        round(coalesce(sum(CASE
          WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0), 2)::numeric(16, 2),
        jsonb_build_object('origin', 'monthly_payroll')
      FROM payroll.v_payroll_run_line_active item
      JOIN hr.employee employee ON employee.id = item.employee_id
      JOIN payroll.payroll_earning_deduction earning ON earning.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      GROUP BY
        employee.id,
        employee.branch_id,
        employee.work_location_id,
        employee.functional_status_id
      ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id, competence)
      DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        work_location_id = EXCLUDED.work_location_id,
        functional_status_id = EXCLUDED.functional_status_id,
        total_earnings = EXCLUDED.total_earnings,
        total_deductions = EXCLUDED.total_deductions,
        net_amount = EXCLUDED.net_amount,
        metadata = EXCLUDED.metadata,
        generated_at = now()
      `,
      [payrollRunId, input.year, input.month],
    );
  }

  async refreshRunTotals(
    client: PoolClient,
    payrollRunId: string,
    status: PayrollRunStatus,
  ): Promise<void> {
    await client.query(
      `
      WITH totals AS (
        SELECT
          count(*)::integer AS employee_count,
          coalesce(sum(total_earnings), 0)::numeric(16, 2) AS total_earnings,
          coalesce(sum(total_deductions), 0)::numeric(16, 2) AS total_deductions,
          coalesce(sum(net_amount), 0)::numeric(16, 2) AS total_net
        FROM payroll.payroll_financial_record
        WHERE payroll_run_id = $1::uuid
      )
      UPDATE payroll.payroll_run run
      SET employee_count = totals.employee_count,
          total_earnings = totals.total_earnings,
          total_deductions = totals.total_deductions,
          total_net = totals.total_net,
          status = $2::"PayrollRunStatus",
          updated_at = now()
      FROM totals
      WHERE run.id = $1::uuid
      `,
      [payrollRunId, status],
    );
  }

  async validateRun(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<Record<string, unknown>> {
    const rows = await client.query<ValidationRow>(
      `
      SELECT payroll_calc.validate_payroll_run(
        public.sgp_current_tenant_uuid(),
        $1::uuid
      ) AS validation
      `,
      [payrollRunId],
    );
    return rows.rows[0]?.validation ?? {};
  }

  async appendHistory(
    client: PoolClient,
    payrollRunId: string,
    status: PayrollRunStatus,
    note: string,
    metadata: Record<string, unknown>,
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
        $2::"PayrollRunStatus",
        $3,
        $4::jsonb
      )
      `,
      [payrollRunId, status, note, JSON.stringify(metadata)],
    );
  }

  async appendAuditEvent(
    client: PoolClient,
    payrollRunId: string,
    event: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'PROCESS',
        'payroll.monthly',
        $1::text,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'payroll.payroll_run',
        NULLIF(current_setting('app.request_id', true), ''),
        $2::jsonb,
        $3,
        NULL::text,
        NULL::text
      )
      `,
      [
        payrollRunId,
        JSON.stringify({
          event,
          ...metadata,
        }),
        event,
      ],
    );
    AuditMutationContextStore.markMutationAudited();
  }

  async buildResult(
    client: PoolClient,
    competenceId: string,
    payrollRunId: string,
    validation?: Record<string, unknown>,
  ): Promise<FolhaMensalResult> {
    const runRows = await client.query<RunRow>(
      `
      SELECT
        id::text,
        competence_year,
        competence_month,
        status::text,
        employee_count,
        total_earnings::text,
        total_deductions::text,
        total_net::text
      FROM payroll.payroll_run
      WHERE id = $1::uuid
      `,
      [payrollRunId],
    );
    const competenceRows = await client.query<CompetenceRow>(
      `
      SELECT
        id::text,
        competence_year,
        competence_month,
        status,
        opened_at,
        closed_at
      FROM hr.competence_period
      WHERE id = $1::uuid
      `,
      [competenceId],
    );
    const review = await this.reviewRows(client, payrollRunId);
    const run = runRows.rows[0];
    const competence = competenceRows.rows[0];
    if (!run || !competence) {
      throw new NotFoundException('Monthly payroll result not found');
    }
    return {
      competenceId: competence.id,
      payrollRunId: run.id,
      competenceYear: run.competence_year,
      competenceMonth: run.competence_month,
      competenceStatus: competence.status,
      payrollStatus: run.status,
      employeeCount: run.employee_count,
      totalEarnings: run.total_earnings,
      totalDeductions: run.total_deductions,
      totalNet: run.total_net,
      validation,
      review,
    };
  }

  private async insertMonthlyCalculatedItemsForPhase(
    client: PoolClient,
    payrollRunId: string,
    payrollTypeId: string,
    input: FolhaMensalCompetenceDto,
    phase: MonthlyRubricPhase,
  ): Promise<number> {
    const rows = await client.query<CountRow>(
      `
      WITH eligible_rubrics AS (
        SELECT
          earning.id,
          earning.code,
          earning.kind,
          earning.incidences,
          type_earning.default_quantity
        FROM payroll.payroll_type_earning type_earning
        JOIN payroll.payroll_earning_deduction earning
          ON earning.id = type_earning.earning_deduction_id
        WHERE type_earning.tenant_id = public.sgp_current_tenant_uuid()
          AND type_earning.payroll_type_id = $2::uuid
          AND type_earning.status = 'ACTIVE'::"RecordStatus"
          AND (type_earning.starts_on IS NULL OR type_earning.starts_on <= make_date($3, $4, 1))
          AND (type_earning.ends_on IS NULL OR type_earning.ends_on >= make_date($3, $4, 1))
          AND earning.tenant_id = public.sgp_current_tenant_uuid()
          AND earning.active = true
          AND earning.formula_ready = true
          AND (earning.starts_on IS NULL OR earning.starts_on <= make_date($3, $4, 1))
          AND (earning.ends_on IS NULL OR earning.ends_on >= make_date($3, $4, 1))
          AND CASE
            WHEN $5 = 'earning' THEN earning.kind = 'EARNING'::"PayrollEntryKind"
            WHEN $5 = 'social_security' THEN earning.kind = 'DEDUCTION'::"PayrollEntryKind"
              AND (
                earning.code IN ('INSS', 'RGPS', 'RPPS')
                OR earning.incidences ? 'official_social_security'
              )
            WHEN $5 = 'income_tax' THEN earning.kind = 'DEDUCTION'::"PayrollEntryKind"
              AND (
                earning.code = 'IRRF'
                OR earning.incidences ? 'income_tax'
              )
            ELSE false
          END
      ),
      evaluated AS (
        SELECT
          employee.id AS employee_id,
          rubric.id AS earning_deduction_id,
          rubric.code,
          CASE
            WHEN rubric.code = 'MONTHLY_BASE_SALARY'
              THEN payroll_calc.worked_days(employee.id, $4, $3)::numeric(12, 4)
            ELSE COALESCE(rubric.default_quantity, 1)::numeric(12, 4)
          END AS quantity,
          payroll_calc.base_salary(employee.id, make_date($3, $4, 1))::numeric(14, 2) AS reference_value,
          payroll_calc.evaluate_earning_deduction(rubric.id, employee.id, $4, $3) AS amount
        FROM hr.employee employee
        JOIN hr.functional_status functional_status
          ON functional_status.id = employee.functional_status_id
        CROSS JOIN eligible_rubrics rubric
        WHERE employee.tenant_id = public.sgp_current_tenant_uuid()
          AND employee.lifecycle_status IN (
            'ACTIVE'::"EmployeeLifecycleStatus",
            'ON_LEAVE'::"EmployeeLifecycleStatus"
          )
          AND functional_status.enters_payroll = true
      ),
      inserted AS (
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
          evaluated.employee_id,
          $1::uuid,
          evaluated.earning_deduction_id,
          'CALCULATED'::"PayrollEntrySource",
          $3,
          $4,
          evaluated.quantity,
          evaluated.reference_value,
          evaluated.amount,
          'Monthly ' || evaluated.code || ' calculation'
        FROM evaluated
        WHERE evaluated.code = 'MONTHLY_BASE_SALARY'
           OR evaluated.amount <> 0
        RETURNING id
      )
      SELECT count(*)::text AS inserted_count
      FROM inserted
      `,
      [payrollRunId, payrollTypeId, input.year, input.month, phase],
    );
    return Number(rows.rows[0]?.inserted_count ?? '0');
  }

  private async reviewRows(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<FolhaMensalReviewLine[]> {
    const rows = await client.query<ReviewRow>(
      `
      SELECT
        employee.id::text AS employee_id,
        employee.registration,
        employee.name AS employee_name,
        financial.total_earnings::text,
        financial.total_deductions::text,
        financial.net_amount::text
      FROM payroll.payroll_financial_record financial
      JOIN hr.employee employee ON employee.id = financial.employee_id
      WHERE financial.payroll_run_id = $1::uuid
      ORDER BY employee.registration, employee.name
      `,
      [payrollRunId],
    );
    return rows.rows.map((row) => ({
      employeeId: row.employee_id,
      registration: row.registration,
      employeeName: row.employee_name,
      totalEarnings: row.total_earnings,
      totalDeductions: row.total_deductions,
      netAmount: row.net_amount,
    }));
  }

  private competenceCode(input: FolhaMensalCompetenceDto): string {
    return `${input.year}-${String(input.month).padStart(2, '0')}`;
  }
}
