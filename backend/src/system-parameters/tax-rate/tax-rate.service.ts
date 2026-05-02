import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  UpsertIrrfTaxRateTableDto,
  UpsertRppsTaxRateTableDto,
} from './tax-rate.dto';

type TaxRateKind = 'IRRF' | 'RPPS';

interface TaxRateRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  competence_start: Date | string;
  competence_end: Date | string | null;
  reference_year: number;
  bracket_min: string;
  bracket_max: string | null;
  rate: string;
  deduction_amount: string;
  dependent_deduction: string;
  updated_at: Date | string;
}

export interface IrrfTaxRateBracket {
  id: string;
  code: string;
  name: string;
  competenceStart: string;
  competenceEnd: string | null;
  referenceYear: number;
  bracketMin: string;
  bracketMax: string | null;
  rate: string;
  deductionAmount: string;
  dependentDeduction: string;
  updatedAt: string;
}

export type RppsTaxRateBracket = IrrfTaxRateBracket;

export interface RppsTaxRateTable {
  ceilingAmount: string | null;
  brackets: RppsTaxRateBracket[];
}

@Injectable()
export class TaxRateService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listIrrfTables(competence?: string): Promise<IrrfTaxRateBracket[]> {
    return this.listTables('IRRF', competence);
  }

  async listRppsTables(competence?: string): Promise<RppsTaxRateTable> {
    const [brackets, ceilingAmount] = await Promise.all([
      this.listTables('RPPS', competence),
      this.getRppsCeiling(),
    ]);
    return { ceilingAmount, brackets };
  }

  private async listTables(
    kind: TaxRateKind,
    competence?: string,
  ): Promise<IrrfTaxRateBracket[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TaxRateRow>(
      `
      SELECT
        id::text,
        code,
        name,
        competence_start,
        competence_end,
        reference_year,
        bracket_min::text,
        bracket_max::text,
        rate::text,
        deduction_amount::text,
        dependent_deduction::text,
        updated_at
      FROM public.tax_rate
      WHERE kind = $2
        AND status = 'ACTIVE'::public."RecordStatus"
        AND ($1::date IS NULL OR (competence_start <= $1::date AND (competence_end IS NULL OR competence_end >= $1::date)))
      ORDER BY competence_start DESC, bracket_min ASC
      `,
      [competence ?? null, kind],
    );
    return rows.map((row) => this.toDto(row));
  }

  validateContinuity(
    brackets: UpsertIrrfTaxRateTableDto['brackets'],
    kind: TaxRateKind = 'IRRF',
  ): void {
    if (kind === 'IRRF' && brackets.length !== 5) {
      throw new BadRequestException(
        'IRRF table must contain exactly 5 brackets',
      );
    }
    if (kind === 'RPPS' && brackets.length < 1) {
      throw new BadRequestException('RPPS table must contain brackets');
    }
    const sorted = [...brackets].sort((left, right) =>
      new Decimal(left.bracketMin).cmp(new Decimal(right.bracketMin)),
    );
    if (!new Decimal(sorted[0].bracketMin).equals(0)) {
      throw new BadRequestException(`First ${kind} bracket must start at 0.00`);
    }
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      const min = new Decimal(current.bracketMin);
      const max = current.bracketMax ? new Decimal(current.bracketMax) : null;
      if (max && max.lessThan(min)) {
        throw new BadRequestException(
          `${kind} bracket max must be greater than min`,
        );
      }
      if (index < sorted.length - 1) {
        if (!max) {
          throw new BadRequestException(
            `Only the final ${kind} bracket can be open-ended`,
          );
        }
        const next = new Decimal(sorted[index + 1].bracketMin);
        if (!next.equals(max.plus('0.01'))) {
          throw new BadRequestException(
            `${kind} brackets must be continuous by cent`,
          );
        }
      } else if (max) {
        throw new BadRequestException(
          `Final ${kind} bracket must be open-ended`,
        );
      }
    }
  }

  async upsertIrrfTable(
    input: UpsertIrrfTaxRateTableDto,
  ): Promise<IrrfTaxRateBracket[]> {
    this.ensureDatabase();
    this.validateContinuity(input.brackets, 'IRRF');
    await this.upsertTable('IRRF', input);
    return this.listIrrfTables(input.competenceStart.slice(0, 10));
  }

  async upsertRppsTable(
    input: UpsertRppsTaxRateTableDto,
  ): Promise<RppsTaxRateTable> {
    this.ensureDatabase();
    this.validateContinuity(input.brackets, 'RPPS');
    await this.upsertTable('RPPS', input);
    return this.listRppsTables(input.competenceStart.slice(0, 10));
  }

  private async upsertTable(
    kind: TaxRateKind,
    input: UpsertIrrfTaxRateTableDto | UpsertRppsTaxRateTableDto,
  ): Promise<void> {
    const referenceYear = Number(input.referenceYear);
    const competenceStart = input.competenceStart.slice(0, 10);
    const competenceEnd = input.competenceEnd?.slice(0, 10) ?? null;
    const ceilingAmount =
      kind === 'RPPS'
        ? ((input as UpsertRppsTaxRateTableDto).ceilingAmount ?? null)
        : null;

    await this.databaseService.transaction(async (client) => {
      await client.query(
        `
        UPDATE public.tax_rate
        SET status = 'INACTIVE'::public."RecordStatus",
            updated_at = now()
        WHERE kind = $2
          AND competence_start = $1::date
        `,
        [competenceStart, kind],
      );

      for (const [index, bracket] of input.brackets.entries()) {
        await client.query(
          `
          INSERT INTO public.tax_rate (
            tenant_id, code, name, description, scope, reference_year,
            rate_percent, kind, competence_start, competence_end, bracket_min,
            bracket_max, rate, deduction_amount, dependent_deduction, metadata, status
          )
          VALUES (
            public.sgp_current_tenant_uuid(), $1, $2, $3, $13, $4,
            $5::numeric(18, 6), $13, $6::date, $7::date, $8::numeric(14, 2),
            $9::numeric(14, 2), $5::numeric(18, 6), $10::numeric(14, 2),
            $11::numeric(14, 2), $12::jsonb, 'ACTIVE'::public."RecordStatus"
          )
          ON CONFLICT (tenant_id, code) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              reference_year = EXCLUDED.reference_year,
              rate_percent = EXCLUDED.rate_percent,
              kind = EXCLUDED.kind,
              competence_start = EXCLUDED.competence_start,
              competence_end = EXCLUDED.competence_end,
              bracket_min = EXCLUDED.bracket_min,
              bracket_max = EXCLUDED.bracket_max,
              rate = EXCLUDED.rate,
              deduction_amount = EXCLUDED.deduction_amount,
              dependent_deduction = EXCLUDED.dependent_deduction,
              metadata = EXCLUDED.metadata,
              status = 'ACTIVE'::public."RecordStatus",
              updated_at = now()
          `,
          [
            bracket.code,
            `${kind} ${referenceYear} faixa ${index + 1}`,
            `Tabela progressiva ${kind}`,
            referenceYear,
            bracket.rate,
            competenceStart,
            competenceEnd,
            bracket.bracketMin,
            bracket.bracketMax ?? null,
            bracket.deductionAmount,
            bracket.dependentDeduction,
            JSON.stringify({ importedBy: `admin-${kind.toLowerCase()}-table` }),
            kind,
          ],
        );
      }
      if (kind === 'RPPS' && ceilingAmount) {
        await client.query(
          `
          INSERT INTO public.system_parameter (
            tenant_id, key, value, description, module_key
          )
          VALUES (
            public.sgp_current_tenant_uuid(), 'TETO_RPPS',
            jsonb_build_object('amount', $1::numeric(14, 2)),
            'Teto da base de contribuição RPPS.', 'payroll'
          )
          ON CONFLICT (tenant_id, key) DO UPDATE
          SET value = EXCLUDED.value,
              description = EXCLUDED.description,
              module_key = EXCLUDED.module_key,
              updated_at = now()
          `,
          [ceilingAmount],
        );
      }
      await this.appendAudit(client, kind, competenceStart, referenceYear);
    });
  }

  private async appendAudit(
    client: PoolClient,
    kind: TaxRateKind,
    competenceStart: string,
    referenceYear: number,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'UPDATE', 'system.tax_rate', $1, NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'public.tax_rate', NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('event', $3, 'referenceYear', $2),
        NULL::text, NULL::text, NULL::text
      )
      `,
      [
        competenceStart,
        referenceYear,
        `system.tax_rate.${kind.toLowerCase()}.upserted`,
      ],
    );
    AuditMutationContextStore.markMutationAudited();
  }

  private async getRppsCeiling(): Promise<string | null> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<{ amount: string | null }>(
      `
      SELECT COALESCE(value->>'amount', value#>>'{}') AS amount
      FROM public.system_parameter
      WHERE key = 'TETO_RPPS'
      ORDER BY updated_at DESC
      LIMIT 1
      `,
    );
    return rows[0]?.amount ?? null;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for tax rate operations',
      );
    }
  }

  private toDto(row: TaxRateRow): IrrfTaxRateBracket {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      competenceStart: this.toDate(row.competence_start),
      competenceEnd: row.competence_end
        ? this.toDate(row.competence_end)
        : null,
      referenceYear: row.reference_year,
      bracketMin: row.bracket_min,
      bracketMax: row.bracket_max,
      rate: row.rate,
      deductionAmount: row.deduction_amount,
      dependentDeduction: row.dependent_deduction,
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toDate(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString().slice(0, 10)
      : value.slice(0, 10);
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
