import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { FgtsService } from '../fgts/fgts.service';
import { ConsignmentDeductionService } from '../operations/consignment/consignment-deduction.service';
import { FolhaMensalCompetenceDto } from './payroll.dto';

type CompetenceStatus =
  | 'OPEN'
  | 'CALCULATING'
  | 'CALCULATED'
  | 'APPROVED'
  | 'GENERATED'
  | 'CLOSED';

type PayrollRunStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'GENERATED'
  | 'APPROVED'
  | 'CLOSED';

interface CatalogRow extends QueryResultRow {
  payroll_type_id: string;
  processing_type_id: string;
  base_earning_id: string;
  consignment_deduction_id: string;
}

interface CompetenceRow extends QueryResultRow {
  id: string;
  competence_year: number;
  competence_month: number;
  status: CompetenceStatus;
  opened_at: Date | string | null;
  closed_at: Date | string | null;
}

interface RunRow extends QueryResultRow {
  id: string;
  competence_year: number;
  competence_month: number;
  status: PayrollRunStatus;
  employee_count: number;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

interface ReviewRow extends QueryResultRow {
  employee_id: string;
  registration: string;
  employee_name: string;
  total_earnings: string;
  total_deductions: string;
  net_amount: string;
}

interface ValidationRow extends QueryResultRow {
  validation: Record<string, unknown>;
}

interface CountRow extends QueryResultRow {
  inserted_count: string;
}

export interface FolhaMensalReviewLine {
  employeeId: string;
  registration: string;
  employeeName: string;
  totalEarnings: string;
  totalDeductions: string;
  netAmount: string;
}

export interface FolhaMensalResult {
  competenceId: string;
  payrollRunId: string;
  competenceYear: number;
  competenceMonth: number;
  competenceStatus: CompetenceStatus;
  payrollStatus: PayrollRunStatus;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
  validation?: Record<string, unknown>;
  review: FolhaMensalReviewLine[];
}

@Injectable()
export class FolhaMensalService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly consignmentDeductionService?: ConsignmentDeductionService,
    @Optional()
    private readonly fgtsService?: FgtsService,
  ) {}

  async openCompetence(
    input: FolhaMensalCompetenceDto,
  ): Promise<FolhaMensalResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const catalog = await this.ensureCatalog(client);
      const competence = await this.ensureCompetence(client, input, 'OPEN');
      const run = await this.ensureRun(client, catalog, input, 'DRAFT');
      await this.appendHistory(
        client,
        run.id,
        'DRAFT',
        'Monthly competence opened',
        {
          event: 'monthly.opened',
          competenceId: competence.id,
        },
      );
      await this.appendAuditEvent(client, run.id, 'monthly.opened', {
        competenceId: competence.id,
        year: input.year,
        month: input.month,
      });
      return this.buildResult(client, competence.id, run.id);
    });
  }

  async calculate(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const context = await this.loadContext(client, input);
      this.assertCompetenceStatus(context.competence.status, ['OPEN']);

      await this.updateCompetenceStatus(
        client,
        context.competence.id,
        'CALCULATING',
      );
      await this.updateRunStatus(client, context.run.id, 'PROCESSING');
      await this.appendHistory(
        client,
        context.run.id,
        'PROCESSING',
        'Monthly payroll calculation started',
        { event: 'monthly.calculating' },
      );

      await this.softDeleteCalculatedItems(client, context.run.id);
      await this.deleteFinancialRecords(client, context.run.id);
      await this.insertMonthlyBaseItems(
        client,
        context.run.id,
        context.catalog.base_earning_id,
        input,
      );
      await this.insertConsignmentDeductions(
        client,
        context.run.id,
        context.catalog.consignment_deduction_id,
        input,
      );
      await this.refreshFinancialRecords(client, context.run.id, input);
      await this.refreshRunTotals(client, context.run.id, 'GENERATED');

      const validation = await this.validateRun(client, context.run.id);
      await this.updateCompetenceStatus(
        client,
        context.competence.id,
        'CALCULATED',
      );
      await this.appendHistory(
        client,
        context.run.id,
        'GENERATED',
        'Monthly payroll calculated',
        { event: 'monthly.calculated', validation },
      );
      await this.appendAuditEvent(
        client,
        context.run.id,
        'monthly.calculated',
        {
          validation,
        },
      );
      return this.buildResult(
        client,
        context.competence.id,
        context.run.id,
        validation,
      );
    });
  }

  async approve(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const context = await this.loadContext(client, input);
      this.assertCompetenceStatus(context.competence.status, ['CALCULATED']);
      const validation = await this.validateRun(client, context.run.id);
      await this.updateCompetenceStatus(
        client,
        context.competence.id,
        'APPROVED',
      );
      await this.updateRunStatus(client, context.run.id, 'APPROVED');
      await this.appendHistory(
        client,
        context.run.id,
        'APPROVED',
        'Monthly payroll approved',
        { event: 'monthly.approved', validation },
      );
      await this.appendAuditEvent(client, context.run.id, 'monthly.approved', {
        validation,
      });
      return this.buildResult(
        client,
        context.competence.id,
        context.run.id,
        validation,
      );
    });
  }

  async generate(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const context = await this.loadContext(client, input);
      this.assertCompetenceStatus(context.competence.status, ['APPROVED']);
      const validation = await this.validateRun(client, context.run.id);
      await this.updateCompetenceStatus(
        client,
        context.competence.id,
        'GENERATED',
      );
      await this.updateRunStatus(client, context.run.id, 'GENERATED');
      await this.appendHistory(
        client,
        context.run.id,
        'GENERATED',
        'Monthly paystubs generated',
        { event: 'monthly.generated', validation },
      );
      await this.appendAuditEvent(client, context.run.id, 'monthly.generated', {
        validation,
      });
      return this.buildResult(
        client,
        context.competence.id,
        context.run.id,
        validation,
      );
    });
  }

  async close(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const context = await this.loadContext(client, input);
      this.assertCompetenceStatus(context.competence.status, ['GENERATED']);
      const validation = await this.validateRun(client, context.run.id);
      const fgts = await this.accrueFgts(client, context.run.id);
      await this.updateCompetenceStatus(
        client,
        context.competence.id,
        'CLOSED',
      );
      await this.updateRunStatus(client, context.run.id, 'CLOSED');
      await this.appendHistory(
        client,
        context.run.id,
        'CLOSED',
        'Monthly competence closed',
        { event: 'monthly.closed', validation, fgts },
      );
      await this.appendAuditEvent(client, context.run.id, 'monthly.closed', {
        validation,
        fgts,
      });
      return this.buildResult(
        client,
        context.competence.id,
        context.run.id,
        validation,
      );
    });
  }

  async review(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const context = await this.loadContext(client, input);
      return this.buildResult(client, context.competence.id, context.run.id);
    });
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for monthly payroll operations',
      );
    }
  }

  private async ensureCatalog(client: PoolClient): Promise<CatalogRow> {
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

  private async ensureCompetence(
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

  private async ensureRun(
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
    return inserted.rows[0];
  }

  private async loadContext(
    client: PoolClient,
    input: FolhaMensalCompetenceDto,
  ) {
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

  private assertCompetenceStatus(
    current: CompetenceStatus,
    allowed: CompetenceStatus[],
  ): void {
    if (!allowed.includes(current)) {
      throw new ConflictException(
        `Monthly competence status ${current} cannot transition from this operation`,
      );
    }
  }

  private async updateCompetenceStatus(
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

  private async updateRunStatus(
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

  private async softDeleteCalculatedItems(
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

  private async deleteFinancialRecords(
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

  private async insertMonthlyBaseItems(
    client: PoolClient,
    payrollRunId: string,
    earningDeductionId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<number> {
    const rows = await client.query<CountRow>(
      `
      WITH inserted AS (
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
          employee.id,
          $1::uuid,
          $2::uuid,
          'CALCULATED'::"PayrollEntrySource",
          $3,
          $4,
          payroll_calc.worked_days(employee.id, $4, $3)::numeric(12, 4),
          payroll_calc.base_salary(employee.id, make_date($3, $4, 1))::numeric(14, 2),
          payroll_calc.evaluate_earning_deduction($2::uuid, employee.id, $4, $3),
          'Monthly base salary calculation'
        FROM hr.employee employee
        JOIN hr.functional_status functional_status
          ON functional_status.id = employee.functional_status_id
        WHERE employee.tenant_id = public.sgp_current_tenant_uuid()
          AND employee.lifecycle_status IN (
            'ACTIVE'::"EmployeeLifecycleStatus",
            'ON_LEAVE'::"EmployeeLifecycleStatus"
          )
          AND functional_status.enters_payroll = true
        RETURNING id
      )
      SELECT count(*)::text AS inserted_count
      FROM inserted
      `,
      [payrollRunId, earningDeductionId, input.year, input.month],
    );
    return Number(rows.rows[0]?.inserted_count ?? '0');
  }

  private async insertConsignmentDeductions(
    client: PoolClient,
    payrollRunId: string,
    earningDeductionId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<number> {
    if (!this.consignmentDeductionService) return 0;
    return this.consignmentDeductionService.insertActiveLoanDeductions(client, {
      payrollRunId,
      earningDeductionId,
      competenceYear: input.year,
      competenceMonth: input.month,
    });
  }

  private async accrueFgts(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<{ movementCount: number; totalAmount: string }> {
    if (!this.fgtsService) {
      return { movementCount: 0, totalAmount: '0.00' };
    }
    const movements = await this.fgtsService.accrueMonthly(
      payrollRunId,
      client,
    );
    const total = movements.reduce(
      (sum, movement) => sum.plus(movement.amount),
      new Decimal(0),
    );
    return {
      movementCount: movements.length,
      totalAmount: total.toFixed(2),
    };
  }

  private async refreshFinancialRecords(
    client: PoolClient,
    payrollRunId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<void> {
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
      ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id)
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

  private async refreshRunTotals(
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

  private async validateRun(
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

  private async appendHistory(
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

  private async appendAuditEvent(
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

  private async buildResult(
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
