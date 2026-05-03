import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import { BatimentoQueryDto } from './consultas.dto';

interface BatimentoRow extends QueryResultRow {
  metric: string;
  source_total: string;
  recomputed_total: string;
  difference: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

export interface BatimentoAssertion {
  metric: string;
  sourceTotal: string;
  recomputedTotal: string;
  difference: string;
  ok: boolean;
}

@Injectable()
export class BatimentoService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createReport(query: BatimentoQueryDto) {
    this.ensureDatabase();
    const assertions = await this.loadAssertions(query);
    const definitionId = await this.ensureDefinition();
    const request = await this.createReportRequest(definitionId, query);

    return {
      reportCode: 'F-FOL-016',
      reportRequestId: request.id,
      status: request.status,
      requestedAt: this.toIso(request.requested_at),
      criteria: {
        payrollRunId: query.payrollRunId ?? null,
        competenceYear: query.competenceYear ?? null,
        competenceMonth: query.competenceMonth ?? null,
        branchId: query.branchId ?? null,
      },
      assertions,
      balanced: assertions.every((assertion) => assertion.ok),
    };
  }

  private async loadAssertions(
    query: BatimentoQueryDto,
  ): Promise<BatimentoAssertion[]> {
    const rows = await this.databaseService.query<BatimentoRow>(
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
          coalesce(sum(NULLIF(totalizer.payload->>'seguradoContributionTotal', '')::numeric) FILTER (
            WHERE totalizer.kind IN ('S-5001'::esocial.esocial_totalizer_kind, 'S-5011'::esocial.esocial_totalizer_kind)
          ), 0)::numeric(16, 2) AS social_security,
          coalesce(sum(NULLIF(totalizer.payload->>'irrfTotal', '')::numeric) FILTER (
            WHERE totalizer.kind IN ('S-5002'::esocial.esocial_totalizer_kind, 'S-5012'::esocial.esocial_totalizer_kind)
          ), 0)::numeric(16, 2) AS irrf
        FROM run
        LEFT JOIN esocial.esocial_totalizer totalizer
          ON totalizer.competence = make_date(run.competence_year, run.competence_month, 1)
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
      this.criteriaValues(query),
    );

    return rows.map((row) => ({
      metric: row.metric,
      sourceTotal: row.source_total,
      recomputedTotal: row.recomputed_total,
      difference: row.difference,
      ok: Number(row.difference) === 0,
    }));
  }

  private async ensureDefinition(): Promise<string> {
    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO public.report_definition (
        tenant_id,
        code,
        module_key,
        name,
        description
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        'F-FOL-016',
        'folha',
        'Relatorio de batimento da folha',
        'Conferencia entre folha, registros financeiros e totalizadores eSocial.'
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET module_key = EXCLUDED.module_key,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = now()
      RETURNING id::text
      `,
    );
    return rows[0]!.id;
  }

  private async createReportRequest(
    definitionId: string,
    query: BatimentoQueryDto,
  ): Promise<ReportRequestRow> {
    const rows = await this.databaseService.query<ReportRequestRow>(
      `
      INSERT INTO public.report_request (
        definition_id,
        branch_id,
        payroll_run_id,
        competence_year,
        competence_month,
        status,
        parameters
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::integer,
        $5::integer,
        'REQUESTED'::"ReportRequestStatus",
        $6::jsonb
      )
      RETURNING id::text, status::text, requested_at
      `,
      [
        definitionId,
        query.branchId ?? null,
        query.payrollRunId ?? null,
        query.competenceYear ?? null,
        query.competenceMonth ?? null,
        JSON.stringify({
          operation: 'report.batimento_folha.requested',
          reportCode: 'F-FOL-016',
        }),
      ],
    );
    return rows[0]!;
  }

  private criteriaValues(
    query: BatimentoQueryDto,
  ): [string | null, number | null, number | null, string | null] {
    return [
      query.payrollRunId ?? null,
      query.competenceYear ?? null,
      query.competenceMonth ?? null,
      query.branchId ?? null,
    ];
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toIso(value: Date | string): string {
    return new Date(value).toISOString();
  }
}
