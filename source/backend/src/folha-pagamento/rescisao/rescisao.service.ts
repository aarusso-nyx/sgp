import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { FgtsService } from '../fgts/fgts.service';
import {
  PriorNoticeKind,
  PriorNoticeReductionMode,
  PriorNoticeService,
} from './prior-notice/prior-notice.service';

interface CatalogRow extends QueryResultRow {
  payroll_type_id: string;
  processing_type_id: string;
}

interface PayrollRunRow extends QueryResultRow {
  id: string;
  status: string;
}

interface TerminationContextRow extends QueryResultRow {
  employee_id: string;
  employment_link_id: string;
  contract_type: string | null;
  branch_id: string | null;
  functional_status_id: string | null;
  work_location_id: string | null;
}

interface ComputedItemRow extends QueryResultRow {
  item_code: string;
  item_kind: string;
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

export interface RescisaoComponent {
  code: string;
  kind: string;
  amount: string;
  referenceValue: string;
  quantity: string;
  metadata: Record<string, unknown>;
}

export interface RescisaoRunResult {
  payrollRunId: string;
  employmentLinkId: string;
  employeeId: string;
  terminationDate: string;
  cause: string;
  status: string;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
  components: RescisaoComponent[];
}

@Injectable()
export class RescisaoService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly priorNoticeService?: PriorNoticeService,
    @Optional()
    private readonly fgtsService?: FgtsService,
  ) {}

  async run(
    employmentLinkId: string,
    terminationDate: string,
    cause: string,
    priorNoticeKind?: PriorNoticeKind,
    priorNoticeReductionMode: PriorNoticeReductionMode = 'NONE',
  ): Promise<RescisaoRunResult> {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for termination payroll processing',
      );
    }

    if (priorNoticeKind && this.priorNoticeService) {
      await this.priorNoticeService.resolve(
        employmentLinkId,
        terminationDate,
        priorNoticeKind,
        priorNoticeReductionMode,
      );
    }

    try {
      return await this.databaseService.transaction(async (client) => {
        const context = await this.loadContext(client, employmentLinkId);
        if (!context) {
          throw new NotFoundException('Employment link not found');
        }

        const terminatedAt = new Date(terminationDate);
        const year = terminatedAt.getUTCFullYear();
        const month = terminatedAt.getUTCMonth() + 1;
        const catalog = await this.ensureCatalog(client);
        const run = await this.ensureRun(client, catalog, context, year, month);
        const recalculated = run.status === 'GENERATED';

        await this.prepareRunForReprocessing(client, run.id, run.status);
        await this.softDeleteCalculatedItems(
          client,
          run.id,
          context.employee_id,
          'calc12.rescisao.reprocessed',
        );

        const computed = await client.query<ComputedItemRow>(
          `
          SELECT *
          FROM payroll_calc.compute_rescisao(
            public.sgp_current_tenant_uuid(),
            $1::uuid,
            $2::date,
            $3
          )
          `,
          [employmentLinkId, terminationDate, cause],
        );

        const components = computed.rows.filter(
          (item) => item.item_code !== 'RESC_MULTA_FGTS_40',
        );

        for (const item of components) {
          await this.insertItem(client, {
            employeeId: context.employee_id,
            payrollRunId: run.id,
            year,
            month,
            item,
          });
        }

        const fgtsFine = await this.computeFgtsFine(
          client,
          run.id,
          employmentLinkId,
          cause,
          context,
        );
        for (const item of fgtsFine) {
          await this.insertItem(client, {
            employeeId: context.employee_id,
            payrollRunId: run.id,
            year,
            month,
            item,
          });
          components.push(item);
        }

        const totals = await this.refreshAggregates(client, run.id);
        await this.upsertFinancialRecord(client, context, run.id, year, month);
        await this.linkTermination(client, context, run.id, terminationDate);
        await this.appendHistory(client, run.id, recalculated, {
          employmentLinkId,
          terminationDate,
          cause,
          totals,
        });
        await this.appendAuditEvent(client, run.id, {
          employmentLinkId,
          terminationDate,
          cause,
          totals,
        });

        // ES-03 owns S-2299 dispatch; CALC-12 only prepares the financial termination run.
        return {
          payrollRunId: run.id,
          employmentLinkId,
          employeeId: context.employee_id,
          terminationDate,
          cause,
          status: 'GENERATED',
          employeeCount: Number(totals.employee_count),
          totalEarnings: totals.total_earnings,
          totalDeductions: totals.total_deductions,
          totalNet: totals.total_net,
          components: components.map((item) => ({
            code: item.item_code,
            kind: item.item_kind,
            amount: item.amount,
            referenceValue: item.reference_value,
            quantity: item.quantity,
            metadata: item.metadata ?? {},
          })),
        };
      });
    } catch (error: unknown) {
      if (this.isIdempotencyConflict(error)) {
        throw new ConflictException(
          'Termination payroll reprocessing conflicted with another execution',
        );
      }
      throw error;
    }
  }

  private async loadContext(
    client: PoolClient,
    employmentLinkId: string,
  ): Promise<TerminationContextRow | null> {
    const result = await client.query<TerminationContextRow>(
      `
      SELECT
        employee.id::text AS employee_id,
        employee.employment_link_id::text,
        employment_link.contract_type::text,
        employee.branch_id::text AS branch_id,
        employee.functional_status_id::text AS functional_status_id,
        employee.work_location_id::text AS work_location_id
      FROM hr.employee employee
      JOIN hr.employment_link employment_link
        ON employment_link.id = employee.employment_link_id
       AND employment_link.tenant_id = employee.tenant_id
      WHERE employee.tenant_id = public.sgp_current_tenant_uuid()
        AND employee.employment_link_id = $1::uuid
      ORDER BY employee.updated_at DESC
      LIMIT 1
      `,
      [employmentLinkId],
    );
    return result.rows[0] ?? null;
  }

  private async computeFgtsFine(
    client: PoolClient,
    payrollRunId: string,
    employmentLinkId: string,
    cause: string,
    context: TerminationContextRow,
  ): Promise<ComputedItemRow[]> {
    if (!this.fgtsService || !this.isCltWithoutCause(context, cause)) {
      return [];
    }
    const [fine] = await this.fgtsService.computeTerminationFine(
      payrollRunId,
      employmentLinkId,
      cause,
      client,
    );
    if (!fine) return [];
    return [
      {
        item_code: 'RESC_MULTA_FGTS_40',
        item_kind: 'EARNING',
        amount: fine.amount,
        reference_value: fine.baseAmount,
        quantity: '0.4000',
        metadata: {
          origin: 'fgts_fine_40',
          fgtsAccountId: fine.accountId,
          fgtsMovementId: fine.movementId,
          cause,
        },
      } as ComputedItemRow,
    ];
  }

  private isCltWithoutCause(
    context: TerminationContextRow,
    cause: string,
  ): boolean {
    const contractType = (context.contract_type ?? '').toLowerCase();
    const normalizedCause = cause.toUpperCase();
    return (
      ['celetista', 'clt'].includes(contractType) &&
      ['WITHOUT_CAUSE', 'SEM_JUSTA_CAUSA'].includes(normalizedCause)
    );
  }

  private async ensureCatalog(client: PoolClient): Promise<CatalogRow> {
    const result = await client.query<CatalogRow>(
      `
      WITH payroll_type_upsert AS (
        INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
        VALUES (public.sgp_current_tenant_uuid(), 'RESCISAO', 'Folha de rescisao', 'ACTIVE'::"RecordStatus")
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
          AND code = 'RESCISAO'
        LIMIT 1
      ),
      processing_type_upsert AS (
        INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
        SELECT public.sgp_current_tenant_uuid(), 'RESCISAO', 'Folha de rescisao', id, 'ACTIVE'::"RecordStatus"
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
    await this.ensureEarningCatalog(client);
    return result.rows[0];
  }

  private async ensureEarningCatalog(client: PoolClient): Promise<void> {
    await client.query(
      `
      INSERT INTO payroll.payroll_earning_deduction (
        tenant_id,
        code,
        description,
        kind,
        taxable,
        active,
        incidences,
        starts_on,
        formula_alias,
        formula_function_name,
        formula_dependencies,
        formula_ready
      )
      VALUES
        (public.sgp_current_tenant_uuid(), 'RESCISAO_BASE', 'Base de calculo de rescisao', 'BASE'::"PayrollEntryKind", false, true, '{"termination_base":true}', DATE '2025-01-01', 'termination_base', 'f_termination_base', ARRAY['SALARIO_BASE'], true),
        (public.sgp_current_tenant_uuid(), 'RESC_SALDO', 'Saldo de salario de rescisao', 'EARNING'::"PayrollEntryKind", true, true, '{"termination":true,"income_tax":true,"rpps":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RESC_13_PROP', 'Decimo terceiro proporcional de rescisao', 'EARNING'::"PayrollEntryKind", true, true, '{"termination":true,"thirteenth_salary":true,"income_tax_exclusive":true,"rpps":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RESC_FERIAS_VENCIDAS', 'Ferias vencidas de rescisao', 'EARNING'::"PayrollEntryKind", true, true, '{"termination":true,"vacation":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RESC_FERIAS_VENCIDAS_TERCO', 'Terco de ferias vencidas de rescisao', 'EARNING'::"PayrollEntryKind", true, true, '{"termination":true,"vacation":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RESC_FERIAS_PROP', 'Ferias proporcionais de rescisao', 'EARNING'::"PayrollEntryKind", true, true, '{"termination":true,"vacation":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RESC_FERIAS_TERCO', 'Terco de ferias proporcionais de rescisao', 'EARNING'::"PayrollEntryKind", true, true, '{"termination":true,"vacation":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RESC_AVISO_PREVIO', 'Aviso previo indenizado de rescisao', 'EARNING'::"PayrollEntryKind", true, true, '{"termination":true,"clt":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RESC_AVISO_PREVIO_DESCONTO', 'Desconto de aviso previo nao cumprido', 'DEDUCTION'::"PayrollEntryKind", true, true, '{"termination":true,"clt":true,"notice":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RESC_MULTA_FGTS_40', 'Multa de 40 por cento do FGTS', 'EARNING'::"PayrollEntryKind", false, true, '{"termination":true,"clt":true,"fgts":true,"indemnity":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'IRRF_RESCISAO', 'IRRF exclusivo sobre rescisao', 'DEDUCTION'::"PayrollEntryKind", false, true, '{"termination":true,"income_tax":true,"income_tax_exclusive":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
        (public.sgp_current_tenant_uuid(), 'RPPS', 'Contribuicao previdenciaria RPPS', 'DEDUCTION'::"PayrollEntryKind", false, true, '{"rpps":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false)
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description,
          kind = EXCLUDED.kind,
          taxable = EXCLUDED.taxable,
          active = EXCLUDED.active,
          incidences = EXCLUDED.incidences,
          formula_alias = EXCLUDED.formula_alias,
          formula_function_name = EXCLUDED.formula_function_name,
          formula_dependencies = EXCLUDED.formula_dependencies,
          formula_ready = EXCLUDED.formula_ready,
          formula_error = NULL,
          updated_at = now()
      `,
    );
  }

  private async ensureRun(
    client: PoolClient,
    catalog: CatalogRow,
    context: TerminationContextRow,
    year: number,
    month: number,
  ): Promise<PayrollRunRow> {
    const result = await client.query<PayrollRunRow>(
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
        NULLIF($5, '')::uuid,
        'DRAFT'::"PayrollRunStatus"
      )
      ON CONFLICT (
        tenant_id,
        competence_year,
        competence_month,
        branch_id,
        payroll_type_id,
        processing_type_id
      ) DO UPDATE
      SET updated_at = now()
      RETURNING id::text, status::text
      `,
      [
        year,
        month,
        catalog.payroll_type_id,
        catalog.processing_type_id,
        context.branch_id ?? '',
      ],
    );
    return result.rows[0];
  }

  private async prepareRunForReprocessing(
    client: PoolClient,
    payrollRunId: string,
    status: string,
  ): Promise<void> {
    if (['APPROVED', 'PAID', 'CLOSED'].includes(status)) {
      throw new ConflictException(
        `Payroll run in status ${status} cannot be reprocessed`,
      );
    }
    await client.query(
      `
      UPDATE payroll.payroll_run
      SET status = 'PROCESSING'::"PayrollRunStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [payrollRunId],
    );
  }

  private async softDeleteCalculatedItems(
    client: PoolClient,
    payrollRunId: string,
    employeeId: string,
    reason: string,
  ): Promise<void> {
    const result = await client.query<{ id: string }>(
      `
      UPDATE payroll.employee_payroll_item
      SET deleted_at = now(),
          deleted_reason = $3,
          updated_at = now()
      WHERE payroll_run_id = $1::uuid
        AND employee_id = $2::uuid
        AND source = 'CALCULATED'::"PayrollEntrySource"
        AND deleted_at IS NULL
      RETURNING id::text
      `,
      [payrollRunId, employeeId, reason],
    );

    if (result.rows.length === 0) return;
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'PROCESS',
        'payroll.termination',
        $1::text,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'payroll.employee_payroll_item',
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
          event: reason,
          employeeId,
          softDeletedLineCount: result.rows.length,
        }),
        reason,
      ],
    );
  }

  private async insertItem(
    client: PoolClient,
    input: {
      employeeId: string;
      payrollRunId: string;
      year: number;
      month: number;
      item: ComputedItemRow;
    },
  ): Promise<void> {
    const result = await client.query(
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
        $7::decimal,
        $8
      FROM payroll.payroll_earning_deduction ped
      WHERE ped.tenant_id = public.sgp_current_tenant_uuid()
        AND ped.code = $9
      `,
      [
        input.employeeId,
        input.payrollRunId,
        input.year,
        input.month,
        input.item.quantity,
        input.item.reference_value,
        input.item.amount,
        `termination component=${input.item.item_code}`,
        input.item.item_code,
      ],
    );
    if (result.rowCount !== 1) {
      throw new ConflictException(
        `Termination payroll component ${input.item.item_code} is not cataloged`,
      );
    }
  }

  private async refreshAggregates(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<TotalsRow> {
    const totals = await client.query<TotalsRow>(
      `
      SELECT
        count(DISTINCT item.employee_id)::text AS employee_count,
        coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2)::text AS total_earnings,
        coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2)::text AS total_deductions,
        coalesce(sum(CASE
          WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::numeric(16, 2)::text AS total_net
      FROM payroll.v_payroll_run_line_active item
      JOIN payroll.payroll_earning_deduction ed
        ON ed.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      `,
      [payrollRunId],
    );
    const summary = totals.rows[0] ?? {
      employee_count: '0',
      total_earnings: '0.00',
      total_deductions: '0.00',
      total_net: '0.00',
    };

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
    context: TerminationContextRow,
    payrollRunId: string,
    year: number,
    month: number,
  ): Promise<void> {
    await client.query(
      `
      WITH totals AS (
        SELECT
          coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2) AS earnings,
          coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2) AS deductions
        FROM payroll.v_payroll_run_line_active item
        JOIN payroll.payroll_earning_deduction ed ON ed.id = item.earning_deduction_id
        WHERE item.payroll_run_id = $1::uuid
          AND item.employee_id = $2::uuid
      )
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
        $2::uuid,
        $1::uuid,
        NULLIF($3, '')::uuid,
        NULLIF($4, '')::uuid,
        NULLIF($5, '')::uuid,
        $6,
        $7,
        totals.earnings,
        totals.deductions,
        (totals.earnings - totals.deductions)::numeric(16, 2),
        jsonb_build_object('origin', 'termination', 'employmentLinkId', $8::text)
      FROM totals
      ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id)
      DO UPDATE SET
        total_earnings = EXCLUDED.total_earnings,
        total_deductions = EXCLUDED.total_deductions,
        net_amount = EXCLUDED.net_amount,
        metadata = EXCLUDED.metadata,
        generated_at = now()
      `,
      [
        payrollRunId,
        context.employee_id,
        context.branch_id ?? '',
        context.work_location_id ?? '',
        context.functional_status_id ?? '',
        year,
        month,
        context.employment_link_id,
      ],
    );
  }

  private async linkTermination(
    client: PoolClient,
    context: TerminationContextRow,
    payrollRunId: string,
    terminationDate: string,
  ): Promise<void> {
    await client.query(
      `
      UPDATE hr.employment_link
      SET end_date = $2::date,
          termination_payroll_run_id = $3::uuid,
          status = 'INACTIVE'::"RecordStatus",
          updated_at = now()
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
      `,
      [context.employment_link_id, terminationDate, payrollRunId],
    );

    await client.query(
      `
      UPDATE hr.employment_contract
      SET ends_on = $2::date,
          status = 'INACTIVE'::"RecordStatus",
          updated_at = now()
      WHERE employment_link_id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
        AND (ends_on IS NULL OR ends_on > $2::date)
      `,
      [context.employment_link_id, terminationDate],
    );

    await client.query(
      `
      UPDATE hr.employee
      SET terminated_on = COALESCE(terminated_on, $2::date),
          lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus",
          updated_at = now()
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
      `,
      [context.employee_id, terminationDate],
    );
  }

  private async appendHistory(
    client: PoolClient,
    payrollRunId: string,
    recalculated: boolean,
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
        'GENERATED'::"PayrollRunStatus",
        $2,
        $3::jsonb
      )
      `,
      [
        payrollRunId,
        recalculated
          ? 'Termination payroll recalculated'
          : 'Termination payroll calculated',
        JSON.stringify({
          event: recalculated
            ? 'termination.recalculated'
            : 'termination.calculated',
          ...metadata,
        }),
      ],
    );
  }

  private async appendAuditEvent(
    client: PoolClient,
    payrollRunId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'PROCESS',
        'payroll.termination',
        $1::text,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'payroll.payroll_run',
        NULLIF(current_setting('app.request_id', true), ''),
        $2::jsonb,
        'calc12.termination.generated',
        NULL::text,
        NULL::text
      )
      `,
      [payrollRunId, JSON.stringify(metadata)],
    );
  }

  private isIdempotencyConflict(error: unknown): boolean {
    const candidate = error as { code?: string; constraint?: string };
    return (
      candidate.code === '23505' &&
      candidate.constraint === 'employee_payroll_item_active_idempotency_uq'
    );
  }
}
