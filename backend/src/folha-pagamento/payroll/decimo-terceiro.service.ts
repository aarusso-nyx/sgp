import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

type DecimoKind = 'DECIMO_TERCEIRO_ADIANTAMENTO' | 'DECIMO_TERCEIRO_FECHAMENTO';

interface CatalogRow extends QueryResultRow {
  payroll_type_id: string;
  processing_type_id: string;
  earning_id: string;
  irrf_id: string;
}

interface PayrollRunRow extends QueryResultRow {
  id: string;
  status: string;
}

interface EligibleEmployeeRow extends QueryResultRow {
  employee_id: string;
  employment_link_id: string;
  branch_id: string | null;
  functional_status_id: string | null;
}

interface DecimoCalculationRow extends QueryResultRow {
  avos: number;
  base: string;
  installment_amount: string;
  first_installment_discount: string;
  irrf_amount: string;
}

interface TotalsRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export interface DecimoTerceiroRunResult {
  payrollRunId: string;
  kind: DecimoKind;
  year: number;
  month: number;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
}

@Injectable()
export class DecimoTerceiroService {
  constructor(private readonly databaseService: DatabaseService) {}

  async runAdiantamento(
    tenantId: string,
    year: number,
  ): Promise<DecimoTerceiroRunResult> {
    return this.runDecimoTerceiro(
      tenantId,
      year,
      11,
      'DECIMO_TERCEIRO_ADIANTAMENTO',
    );
  }

  async runFechamento(
    tenantId: string,
    year: number,
  ): Promise<DecimoTerceiroRunResult> {
    return this.runDecimoTerceiro(
      tenantId,
      year,
      12,
      'DECIMO_TERCEIRO_FECHAMENTO',
    );
  }

  private async runDecimoTerceiro(
    tenantId: string,
    year: number,
    month: number,
    kind: DecimoKind,
  ): Promise<DecimoTerceiroRunResult> {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for decimo terceiro processing',
      );
    }
    if (!tenantId) {
      throw new ConflictException('Tenant context is required');
    }

    try {
      return await this.databaseService.transaction(async (client) => {
        const catalog = await this.ensureCatalog(client, kind);
        const run = await this.ensureRun(client, catalog, year, month);

        const recalculated = run.status === 'GENERATED';
        await this.prepareRunForReprocessing(client, run.id, run.status);
        await this.softDeleteCalculatedItems(
          client,
          run.id,
          'calc09.decimo_terceiro.reprocessed',
        );

        const employees = await client.query<EligibleEmployeeRow>(
          `
        SELECT DISTINCT ON (employee.id)
          employee.id::text AS employee_id,
          employee.employment_link_id::text AS employment_link_id,
          employee.branch_id::text AS branch_id,
          employee.functional_status_id::text AS functional_status_id
        FROM payroll_calc.v_decimo_terceiro_avos avos
        JOIN hr.employee employee ON employee.id = avos.employee_id
        WHERE avos.tenant_id = public.sgp_current_tenant_uuid()
          AND avos.reference_year = $1
          AND avos.avos > 0
          AND employee.lifecycle_status IN (
            'ACTIVE'::"EmployeeLifecycleStatus",
            'ON_LEAVE'::"EmployeeLifecycleStatus"
          )
          AND employee.employment_link_id IS NOT NULL
        ORDER BY employee.id
        `,
          [year],
        );

        for (const employee of employees.rows) {
          const calcRows = await client.query<DecimoCalculationRow>(
            `
          SELECT *
          FROM payroll_calc.compute_decimo_terceiro(
            public.sgp_current_tenant_uuid(),
            $1::uuid,
            $2,
            $3
          )
          `,
            [employee.employment_link_id, kind, year],
          );
          const calc = calcRows.rows[0];
          if (!calc) continue;

          await this.insertItem(client, {
            employeeId: employee.employee_id,
            payrollRunId: run.id,
            earningDeductionId: catalog.earning_id,
            year,
            month,
            quantity: calc.avos.toString(),
            referenceValue: calc.base,
            amount: calc.installment_amount,
            notes: `${kind} avos=${calc.avos} first_discount=${calc.first_installment_discount}`,
          });

          if (
            kind === 'DECIMO_TERCEIRO_FECHAMENTO' &&
            Number(calc.irrf_amount) > 0
          ) {
            await this.insertItem(client, {
              employeeId: employee.employee_id,
              payrollRunId: run.id,
              earningDeductionId: catalog.irrf_id,
              year,
              month,
              quantity: '1',
              referenceValue: calc.installment_amount,
              amount: calc.irrf_amount,
              notes: `IRRF exclusivo 13 salario base=${calc.base}`,
            });
          }

          await this.upsertFinancialRecord(client, {
            employeeId: employee.employee_id,
            payrollRunId: run.id,
            branchId: employee.branch_id,
            functionalStatusId: employee.functional_status_id,
            year,
            month,
            totalEarnings: calc.installment_amount,
            totalDeductions:
              kind === 'DECIMO_TERCEIRO_FECHAMENTO' ? calc.irrf_amount : '0.00',
            metadata: {
              origin: 'decimo_terceiro',
              kind,
              avos: calc.avos,
              base: calc.base,
              firstInstallmentDiscount: calc.first_installment_discount,
            },
          });
        }

        const totals = await this.refreshAggregates(
          client,
          run.id,
          recalculated,
        );
        await this.appendAuditEvent(client, run.id, kind, year, totals);
        return {
          payrollRunId: run.id,
          kind,
          year,
          month,
          employeeCount: Number(totals.employee_count),
          totalEarnings: totals.total_earnings,
          totalDeductions: totals.total_deductions,
          totalNet: totals.total_net,
        };
      });
    } catch (error: unknown) {
      if (this.isIdempotencyConflict(error)) {
        throw new ConflictException(
          'Payroll run reprocessing conflicted with another execution',
        );
      }
      throw error;
    }
  }

  private async ensureCatalog(
    client: PoolClient,
    kind: DecimoKind,
  ): Promise<CatalogRow> {
    const rows = await client.query<CatalogRow>(
      `
      WITH payroll_type_upsert AS (
        INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
        VALUES (public.sgp_current_tenant_uuid(), 'DECIMO_TERCEIRO', 'Decimo terceiro salario', 'ACTIVE'::"RecordStatus")
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
          AND code = 'DECIMO_TERCEIRO'
        LIMIT 1
      ),
      processing_type_upsert AS (
        INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
        SELECT public.sgp_current_tenant_uuid(), code, description, (SELECT id FROM payroll_type_row), 'ACTIVE'::"RecordStatus"
        FROM (
          VALUES
            ('DECIMO_TERCEIRO_ADIANTAMENTO', 'Decimo terceiro - primeira parcela'),
            ('DECIMO_TERCEIRO_FECHAMENTO', 'Decimo terceiro - fechamento')
        ) AS processing(code, description)
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET description = EXCLUDED.description,
            payroll_type_id = EXCLUDED.payroll_type_id,
            status = EXCLUDED.status,
            updated_at = now()
        RETURNING id, code
      ),
      earning_upsert AS (
        INSERT INTO payroll.payroll_earning_deduction (
          tenant_id, code, description, kind, taxable, active, incidences, starts_on, formula_ready
        )
        VALUES
          (public.sgp_current_tenant_uuid(), 'DECIMO_TERCEIRO_ADIANTAMENTO', 'Decimo terceiro salario - primeira parcela', 'EARNING'::"PayrollEntryKind", false, true, '{"thirteenth_salary":true}', DATE '2025-01-01', false),
          (public.sgp_current_tenant_uuid(), 'DECIMO_TERCEIRO_FECHAMENTO', 'Decimo terceiro salario - fechamento', 'EARNING'::"PayrollEntryKind", true, true, '{"thirteenth_salary":true,"income_tax_exclusive":true}', DATE '2025-01-01', false),
          (public.sgp_current_tenant_uuid(), 'IRRF_13', 'IRRF exclusivo sobre decimo terceiro salario', 'DEDUCTION'::"PayrollEntryKind", false, true, '{"income_tax":true,"income_tax_exclusive":true}', DATE '2025-01-01', false)
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET description = EXCLUDED.description,
            kind = EXCLUDED.kind,
            taxable = EXCLUDED.taxable,
            active = EXCLUDED.active,
            incidences = EXCLUDED.incidences,
            starts_on = EXCLUDED.starts_on,
            updated_at = now()
        RETURNING id, code
      )
      SELECT
        (SELECT id::text FROM payroll_type_row) AS payroll_type_id,
        (SELECT id::text FROM processing_type_upsert WHERE code = $1) AS processing_type_id,
        (SELECT id::text FROM earning_upsert WHERE code = $1) AS earning_id,
        (SELECT id::text FROM earning_upsert WHERE code = 'IRRF_13') AS irrf_id
      `,
      [kind],
    );
    return rows.rows[0]!;
  }

  private async ensureRun(
    client: PoolClient,
    catalog: CatalogRow,
    year: number,
    month: number,
  ): Promise<PayrollRunRow> {
    const existing = await client.query<PayrollRunRow>(
      `
      SELECT id::text, status::text
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
      [year, month, catalog.payroll_type_id, catalog.processing_type_id],
    );
    if (existing.rows[0]) return existing.rows[0];

    const inserted = await client.query<PayrollRunRow>(
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
      RETURNING id::text, status::text
      `,
      [year, month, catalog.payroll_type_id, catalog.processing_type_id],
    );
    return inserted.rows[0]!;
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
    reason: string,
  ): Promise<void> {
    const result = await client.query<{ id: string }>(
      `
      UPDATE payroll.employee_payroll_item
      SET deleted_at = now(),
          deleted_reason = $2,
          updated_at = now()
      WHERE payroll_run_id = $1::uuid
        AND source = 'CALCULATED'::"PayrollEntrySource"
        AND deleted_at IS NULL
      RETURNING id::text
      `,
      [payrollRunId, reason],
    );

    if (result.rowCount && result.rowCount > 0) {
      await client.query(
        `
        SELECT public.sgp_append_audit_event(
          'PROCESS',
          'payroll.decimo_terceiro',
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
            softDeletedLineCount: result.rowCount,
          }),
          reason,
        ],
      );
    }
  }

  private isIdempotencyConflict(error: unknown): boolean {
    const candidate = error as { code?: string; constraint?: string };
    return (
      candidate.code === '23505' &&
      candidate.constraint === 'employee_payroll_item_active_idempotency_uq'
    );
  }

  private async insertItem(
    client: PoolClient,
    input: {
      employeeId: string;
      payrollRunId: string;
      earningDeductionId: string;
      year: number;
      month: number;
      quantity: string;
      referenceValue: string;
      amount: string;
      notes: string;
    },
  ): Promise<void> {
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
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'CALCULATED'::"PayrollEntrySource",
        $4,
        $5,
        $6::decimal,
        $7::decimal,
        $8::decimal,
        $9
      )
      `,
      [
        input.employeeId,
        input.payrollRunId,
        input.earningDeductionId,
        input.year,
        input.month,
        input.quantity,
        input.referenceValue,
        input.amount,
        input.notes,
      ],
    );
  }

  private async upsertFinancialRecord(
    client: PoolClient,
    input: {
      employeeId: string;
      payrollRunId: string;
      branchId: string | null;
      functionalStatusId: string | null;
      year: number;
      month: number;
      totalEarnings: string;
      totalDeductions: string;
      metadata: Record<string, unknown>;
    },
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
        functional_status_id,
        competence_year,
        competence_month,
        competence,
        total_earnings,
        total_deductions,
        net_amount,
        metadata
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        NULLIF($3, '')::uuid,
        NULLIF($4, '')::uuid,
        $5,
        $6,
        make_date($5::integer, $6::integer, 1),
        $7::decimal,
        $8::decimal,
        ($7::decimal - $8::decimal),
        $9::jsonb
      )
      ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id, competence)
      DO UPDATE SET
        total_earnings = EXCLUDED.total_earnings,
        total_deductions = EXCLUDED.total_deductions,
        net_amount = EXCLUDED.net_amount,
        metadata = EXCLUDED.metadata,
        generated_at = now()
      `,
      [
        input.employeeId,
        input.payrollRunId,
        input.branchId ?? '',
        input.functionalStatusId ?? '',
        input.year,
        input.month,
        input.totalEarnings,
        input.totalDeductions,
        JSON.stringify(input.metadata),
      ],
    );
  }

  private async refreshAggregates(
    client: PoolClient,
    payrollRunId: string,
    recalculated = false,
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
      FROM payroll.v_payroll_run_line_active item
      JOIN payroll.payroll_earning_deduction ed ON ed.id = item.earning_deduction_id
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
          ? 'Decimo terceiro recalculated'
          : 'Decimo terceiro calculated',
        JSON.stringify({
          kind: recalculated ? 'RECALCULATED' : 'CALCULATED',
          ...summary,
        }),
      ],
    );
    return summary;
  }

  private async appendAuditEvent(
    client: PoolClient,
    payrollRunId: string,
    kind: DecimoKind,
    year: number,
    totals: TotalsRow,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'PROCESS',
        'payroll.decimo_terceiro',
        $1::text,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'payroll.payroll_run',
        NULLIF(current_setting('app.request_id', true), ''),
        $2::jsonb,
        NULL::text,
        NULL::text,
        NULL::text
      )
      `,
      [
        payrollRunId,
        JSON.stringify({
          event: 'calc04.decimo_terceiro.generated',
          kind,
          year,
          employeeCount: totals.employee_count,
          totalNet: totals.total_net,
        }),
      ],
    );
  }
}
