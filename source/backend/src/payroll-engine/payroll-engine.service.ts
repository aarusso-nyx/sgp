import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import {
  PAYROLL_CALCULATION_MODES,
  PayrollCalculationRequestDto,
  type PayrollCalculationMode,
} from './payroll-engine.dto';

interface PayrollRunRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  competence_year: number;
  competence_month: number;
  status: string;
}

interface FormulaStatusRow extends QueryResultRow {
  total_definitions: string;
  ready_definitions: string;
  errored_definitions: string;
}

interface FormulaUpdateRow extends QueryResultRow {
  id: string;
}

interface PayrollRunSummaryRow extends QueryResultRow {
  id: string;
  status: string;
  employee_count: number;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
  updated_at: Date | string;
}

interface NormalizedCalculationRequest {
  payrollRunId: string;
  mode: PayrollCalculationMode;
  competenceYear?: number;
  competenceMonth?: number;
  dryRun: boolean;
  requestedBy?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PAYROLL_ENGINE_PERMISSIONS = [
  'folha.read',
  'folha.write',
  'folha.read',
  'folha.write',
] as const;

@Injectable()
export class PayrollEngineService {
  constructor(private readonly databaseService: DatabaseService) {}

  health() {
    return {
      ok: true,
      service: 'sgp-payroll-engine',
      status: 'implemented',
      databaseConfigured: this.databaseService.configured,
      formulaEngine: this.formulaEngineContract(),
      supportedModes: PAYROLL_CALCULATION_MODES,
      timestamp: new Date().toISOString(),
    };
  }

  async status() {
    const base = this.health();
    if (!this.databaseService.configured) {
      return {
        ...base,
        checks: {
          database: 'not_configured',
          formulaDefinitions: null,
        },
      };
    }

    const rows = await this.runBypassingRls(() =>
      this.databaseService.query<FormulaStatusRow>(
        `
        SELECT
          count(*)::text AS total_definitions,
          count(*) FILTER (WHERE formula_ready)::text AS ready_definitions,
          count(*) FILTER (WHERE formula_error IS NOT NULL)::text AS errored_definitions
        FROM payroll.payroll_earning_deduction
        `,
      ),
    );
    const row = rows[0];
    return {
      ...base,
      checks: {
        database: 'configured',
        formulaDefinitions: {
          total: Number(row?.total_definitions ?? 0),
          ready: Number(row?.ready_definitions ?? 0),
          errored: Number(row?.errored_definitions ?? 0),
        },
      },
    };
  }

  validateCalculationRequest(
    input: PayrollCalculationRequestDto,
  ): NormalizedCalculationRequest {
    if (!input?.payrollRunId || !UUID_PATTERN.test(input.payrollRunId)) {
      throw new BadRequestException('payrollRunId must be a UUID');
    }

    const mode = input.mode ?? 'TOTAL';
    if (!PAYROLL_CALCULATION_MODES.includes(mode)) {
      throw new BadRequestException(
        `mode must be one of: ${PAYROLL_CALCULATION_MODES.join(', ')}`,
      );
    }

    if (
      (input.competenceYear === undefined) !==
      (input.competenceMonth === undefined)
    ) {
      throw new BadRequestException(
        'competenceYear and competenceMonth must be provided together',
      );
    }

    if (
      input.competenceYear !== undefined &&
      (!Number.isInteger(input.competenceYear) ||
        input.competenceYear < 2000 ||
        input.competenceYear > 2100)
    ) {
      throw new BadRequestException(
        'competenceYear must be between 2000 and 2100',
      );
    }

    if (
      input.competenceMonth !== undefined &&
      (!Number.isInteger(input.competenceMonth) ||
        input.competenceMonth < 1 ||
        input.competenceMonth > 12)
    ) {
      throw new BadRequestException('competenceMonth must be between 1 and 12');
    }

    return {
      payrollRunId: input.payrollRunId,
      mode,
      competenceYear: input.competenceYear,
      competenceMonth: input.competenceMonth,
      dryRun: input.dryRun ?? false,
      requestedBy: input.requestedBy?.trim() || undefined,
    };
  }

  async requestCalculation(input: PayrollCalculationRequestDto) {
    const request = this.validateCalculationRequest(input);

    if (request.dryRun) {
      return {
        accepted: true,
        dryRun: true,
        payrollRunId: request.payrollRunId,
        mode: request.mode,
        formulaEngine: this.formulaEngineContract(),
      };
    }

    this.ensureDatabase();
    const run = await this.loadRun(request.payrollRunId);
    this.assertCompetenceMatches(run, request);

    try {
      return await this.runWithinTenant(run.tenant_id, () =>
        this.calculateWithinTenant(run, request),
      );
    } catch (error) {
      await this.markRunFailed(run, error);
      throw error;
    }
  }

  private async calculateWithinTenant(
    run: PayrollRunRow,
    request: NormalizedCalculationRequest,
  ) {
    await this.databaseService.query(
      `
      UPDATE payroll.payroll_run
      SET status = 'PROCESSING'::"PayrollRunStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [run.id],
    );

    const formulaRows = await this.databaseService.query<FormulaUpdateRow>(
      `
      WITH formula_items AS (
        SELECT
          item.id,
          payroll_calc.evaluate_earning_deduction(
            item.earning_deduction_id,
            item.employee_id,
            run.competence_month,
            run.competence_year
          ) AS calculated_amount
        FROM payroll.employee_payroll_item item
        JOIN payroll.payroll_run run ON run.id = item.payroll_run_id
        JOIN payroll.payroll_earning_deduction earning
          ON earning.id = item.earning_deduction_id
        WHERE item.payroll_run_id = $1::uuid
          AND item.source = 'CALCULATED'::"PayrollEntrySource"
          AND earning.formula_ready = true
      )
      UPDATE payroll.employee_payroll_item item
      SET amount = formula_items.calculated_amount,
          reference_value = formula_items.calculated_amount,
          updated_at = now()
      FROM formula_items
      WHERE item.id = formula_items.id
      RETURNING item.id::text
      `,
      [run.id],
    );

    const summaryRows = await this.databaseService.query<PayrollRunSummaryRow>(
      `
      WITH totals AS (
        SELECT
          run.id,
          count(DISTINCT item.employee_id)::int AS employee_count,
          coalesce(sum(CASE WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2) AS total_earnings,
          coalesce(sum(CASE WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2) AS total_deductions
        FROM payroll.payroll_run run
        LEFT JOIN payroll.employee_payroll_item item ON item.payroll_run_id = run.id
        LEFT JOIN payroll.payroll_earning_deduction earning ON earning.id = item.earning_deduction_id
        WHERE run.id = $1::uuid
        GROUP BY run.id
      )
      UPDATE payroll.payroll_run run
      SET status = 'GENERATED'::"PayrollRunStatus",
          employee_count = totals.employee_count,
          total_earnings = totals.total_earnings,
          total_deductions = totals.total_deductions,
          total_net = totals.total_earnings - totals.total_deductions,
          updated_at = now()
      FROM totals
      WHERE run.id = totals.id
      RETURNING
        run.id::text,
        run.status::text,
        run.employee_count,
        run.total_earnings::text,
        run.total_deductions::text,
        run.total_net::text,
        run.updated_at
      `,
      [run.id],
    );

    const summary = summaryRows[0];
    if (!summary) {
      throw new Error('Payroll run calculation did not return a summary');
    }

    await this.databaseService.query(
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
        'Calculated by sgp-payroll-engine.',
        $2::jsonb
      )
      `,
      [
        run.id,
        JSON.stringify({
          runtime: 'sgp-payroll-engine',
          requestedBy: request.requestedBy ?? null,
          mode: request.mode,
          formulaEngine: this.formulaEngineContract(),
          formulaItemsUpdated: formulaRows.length,
        }),
      ],
    );

    return {
      accepted: true,
      dryRun: false,
      payrollRunId: summary.id,
      status: summary.status,
      mode: request.mode,
      employeeCount: summary.employee_count,
      totals: {
        earnings: summary.total_earnings,
        deductions: summary.total_deductions,
        net: summary.total_net,
      },
      formulaEngine: this.formulaEngineContract(),
      formulaItemsUpdated: formulaRows.length,
      updatedAt: this.toIso(summary.updated_at),
    };
  }

  private async loadRun(payrollRunId: string): Promise<PayrollRunRow> {
    const rows = await this.runBypassingRls(() =>
      this.databaseService.query<PayrollRunRow>(
        `
        SELECT
          id::text,
          tenant_id::text,
          competence_year,
          competence_month,
          status::text
        FROM payroll.payroll_run
        WHERE id = $1::uuid
        `,
        [payrollRunId],
      ),
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Payroll run not found');
    }
    return row;
  }

  private assertCompetenceMatches(
    run: PayrollRunRow,
    request: NormalizedCalculationRequest,
  ): void {
    if (request.competenceYear === undefined) return;
    if (
      run.competence_year !== request.competenceYear ||
      run.competence_month !== request.competenceMonth
    ) {
      throw new BadRequestException(
        'Requested competence does not match payroll run competence',
      );
    }
  }

  private async markRunFailed(
    run: PayrollRunRow,
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected payroll engine failure';
    try {
      await this.runWithinTenant(run.tenant_id, async () => {
        await this.databaseService.query(
          `
          UPDATE payroll.payroll_run
          SET status = 'FAILED'::"PayrollRunStatus",
              updated_at = now()
          WHERE id = $1::uuid
          `,
          [run.id],
        );
        await this.databaseService.query(
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
            'FAILED'::"PayrollRunStatus",
            $2,
            $3::jsonb
          )
          `,
          [
            run.id,
            message.slice(0, 500),
            JSON.stringify({
              runtime: 'sgp-payroll-engine',
              error: message.slice(0, 1000),
            }),
          ],
        );
      });
    } catch {
      // The original failure is more useful to the caller than a secondary status update error.
    }
  }

  private formulaEngineContract() {
    return {
      schema: 'payroll_calc',
      cacheTable: 'payroll_calc.formula_cache',
      evaluator:
        'payroll_calc.evaluate_earning_deduction(uuid, uuid, int, int)',
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payroll engine operations',
      );
    }
  }

  private runBypassingRls<T>(fn: () => Promise<T>): Promise<T> {
    return RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'payroll-engine' },
      fn,
    );
  }

  private runWithinTenant<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return RequestContextStore.run(
      {
        tenantId,
        permissions: [...PAYROLL_ENGINE_PERMISSIONS],
      },
      fn,
    );
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
