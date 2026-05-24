import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FeatureFlagsService } from '@stynx/feature-flags';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import {
  ATS_PARAMETER_KEYS,
  AtsParameterKey,
  REMUNERATION_CEILING_KEYS,
  RemunerationCeilingKey,
  ToggleFeatureFlagDto,
  UpsertAtsParameterDto,
  UpsertRemunerationCeilingDto,
  UpsertGlobalParameterDto,
  UpsertSystemParametersDto,
} from './system-parameters.dto';
import { SystemParameterFeatureFlagProvider } from './system-parameter-feature-flag.provider';

interface ParameterRow extends QueryResultRow {
  key: string;
  value: unknown;
  description: string;
  updated_at: Date | string;
}

interface RemunerationCeilingRow extends QueryResultRow {
  key: RemunerationCeilingKey;
  amount: string | null;
  description: string;
  updated_at: Date | string;
}

interface AtsParameterRow extends QueryResultRow {
  key: AtsParameterKey;
  value_text: string | null;
  description: string;
  updated_at: Date | string;
}

@Injectable()
export class SystemParametersService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly featureFlagProvider?: SystemParameterFeatureFlagProvider,
  ) {}

  async listSystemParameters(): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ParameterRow>(
      `
      SELECT key, value, description, updated_at
      FROM public.system_parameter
      WHERE key LIKE 'system:%'
      ORDER BY key ASC
      `,
    );
    return {
      values: this.mapValues('system:', rows),
      updatedAt: this.maxUpdatedAt(rows),
    };
  }

  async upsertSystemParameters(
    payload: UpsertSystemParametersDto,
  ): Promise<unknown> {
    this.ensureDatabase();
    const entries = Object.entries(payload.values ?? {});
    for (const [key, value] of entries) {
      await this.upsertEntry(
        `system:${key}`,
        value,
        'system',
        `System parameter ${key}`,
      );
    }
    return this.listSystemParameters();
  }

  async listGlobalParameters(): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ParameterRow>(
      `
      SELECT key, value, description, updated_at
      FROM public.system_parameter
      WHERE key LIKE 'global:%'
      ORDER BY key ASC
      `,
    );
    return {
      values: this.mapValues('global:', rows),
      updatedAt: this.maxUpdatedAt(rows),
    };
  }

  async upsertGlobalParameter(
    key: string,
    payload: UpsertGlobalParameterDto,
  ): Promise<unknown> {
    this.ensureDatabase();
    const value = payload.value ?? null;
    await this.upsertEntry(
      `global:${key}`,
      value,
      'global',
      `Global parameter ${key}`,
    );
    return this.listGlobalParameters();
  }

  async toggleFeatureFlag(
    key: string,
    payload: ToggleFeatureFlagDto,
  ): Promise<unknown> {
    this.ensureDatabase();
    const value = {
      active: payload.ativo,
      ...(payload.metadata ?? {}),
    };
    await this.upsertEntry(
      `feature-flag:${key}`,
      value,
      'feature-flag',
      `Feature flag ${key}`,
    );
    const rows = await this.databaseService.query<ParameterRow>(
      `
      SELECT key, value, description, updated_at
      FROM public.system_parameter
      WHERE key = $1
      `,
      [`feature-flag:${key}`],
    );
    const row = rows[0];
    const evaluation = await this.featureFlags().evaluate(key, {}, false);
    return {
      chave: key,
      ativo: payload.ativo,
      value: row?.value ?? value,
      evaluation,
      updatedAt: row?.updated_at
        ? this.toIso(row.updated_at)
        : new Date().toISOString(),
    };
  }

  async listRemunerationCeilings(): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RemunerationCeilingRow>(
      `
      SELECT
        key,
        NULLIF(value->>'amount', '') AS amount,
        description,
        updated_at
      FROM public.system_parameter
      WHERE key = ANY($1::text[])
      ORDER BY array_position($1::text[], key)
      `,
      [[...REMUNERATION_CEILING_KEYS]],
    );

    const byKey = new Map(rows.map((row) => [row.key, row]));
    return {
      items: REMUNERATION_CEILING_KEYS.map((key) => {
        const row = byKey.get(key);
        return {
          key,
          amount: row?.amount ?? null,
          description: row?.description ?? this.defaultCeilingDescription(key),
          updatedAt: row?.updated_at ? this.toIso(row.updated_at) : null,
        };
      }),
      immuneFlag: 'payroll.payroll_earning_deduction.subject_to_ceiling',
    };
  }

  async upsertRemunerationCeiling(
    payload: UpsertRemunerationCeilingDto,
  ): Promise<unknown> {
    this.ensureDatabase();
    await this.upsertEntry(
      payload.key,
      { amount: payload.amount },
      'payroll',
      payload.description ?? this.defaultCeilingDescription(payload.key),
    );
    return this.listRemunerationCeilings();
  }

  async listAtsParameters(): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AtsParameterRow>(
      `
      SELECT
        key,
        COALESCE(
          NULLIF(value->>'rate', ''),
          NULLIF(value->>'value', ''),
          NULLIF(value#>>'{}', '')
        ) AS value_text,
        description,
        updated_at
      FROM public.system_parameter
      WHERE key = ANY($1::text[])
      ORDER BY array_position($1::text[], key)
      `,
      [[...ATS_PARAMETER_KEYS]],
    );

    const byKey = new Map(rows.map((row) => [row.key, row]));
    return {
      items: ATS_PARAMETER_KEYS.map((key) => {
        const row = byKey.get(key);
        return {
          key,
          value: row?.value_text ?? this.defaultAtsValue(key),
          description: row?.description ?? this.defaultAtsDescription(key),
          updatedAt: row?.updated_at ? this.toIso(row.updated_at) : null,
        };
      }),
    };
  }

  async upsertAtsParameter(payload: UpsertAtsParameterDto): Promise<unknown> {
    this.ensureDatabase();
    await this.upsertEntry(
      payload.key,
      this.atsValuePayload(payload.key, payload.value),
      'payroll',
      payload.description ?? this.defaultAtsDescription(payload.key),
    );
    return this.listAtsParameters();
  }

  private async upsertEntry(
    key: string,
    value: unknown,
    moduleKey: string,
    description: string,
  ): Promise<void> {
    await this.databaseService.query(
      `
      INSERT INTO public.system_parameter (
        tenant_id,
        key,
        value,
        description,
        module_key
      )
      VALUES (public.sgp_current_tenant_uuid(), $1, $2::jsonb, $3, $4)
      ON CONFLICT (tenant_id, key) DO UPDATE
      SET
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        module_key = EXCLUDED.module_key,
        updated_at = now()
      `,
      [key, JSON.stringify(value ?? null), description, moduleKey],
    );
  }

  private mapValues(
    prefix: string,
    rows: ParameterRow[],
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const row of rows) {
      values[row.key.slice(prefix.length)] = row.value;
    }
    return values;
  }

  private maxUpdatedAt(rows: ParameterRow[]): string | null {
    const values = rows
      .map((row) => this.toIso(row.updated_at))
      .sort((left, right) => left.localeCompare(right));
    return values.at(-1) ?? null;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for system parameters operations',
      );
    }
  }

  private featureFlags(): FeatureFlagsService {
    return new FeatureFlagsService(
      this.featureFlagProvider ??
        new SystemParameterFeatureFlagProvider(this.databaseService),
    );
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private defaultCeilingDescription(key: RemunerationCeilingKey): string {
    const labels: Record<RemunerationCeilingKey, string> = {
      TETO_PREFEITURA: 'Teto remuneratorio do Poder Executivo municipal.',
      TETO_VICE: 'Subteto remuneratorio de vice-prefeito.',
      TETO_VEREADOR: 'Subteto remuneratorio de vereador.',
      TETO_SECRETARIO: 'Subteto remuneratorio de secretario municipal.',
    };
    return labels[key];
  }

  private defaultAtsDescription(key: AtsParameterKey): string {
    const labels: Record<AtsParameterKey, string> = {
      ATS_PERCENT_PER_YEAR:
        'Percentual anual do adicional por tempo de servico.',
      TRIENIO_PERCENT_PER_PERIOD: 'Percentual por trienio completo.',
      QUINQUENIO_PERCENT_PER_PERIOD: 'Percentual por quinquenio completo.',
      SEXTA_PARTE_SERVICE_YEARS: 'Anos completos exigidos para sexta-parte.',
      SEXTA_PARTE_FRACTION: 'Fracao aplicada na sexta-parte.',
    };
    return labels[key];
  }

  private defaultAtsValue(key: AtsParameterKey): string {
    const values: Record<AtsParameterKey, string> = {
      ATS_PERCENT_PER_YEAR: '1.000000',
      TRIENIO_PERCENT_PER_PERIOD: '3.000000',
      QUINQUENIO_PERCENT_PER_PERIOD: '5.000000',
      SEXTA_PARTE_SERVICE_YEARS: '25',
      SEXTA_PARTE_FRACTION: '0.166666666667',
    };
    return values[key];
  }

  private atsValuePayload(
    key: AtsParameterKey,
    value: string,
  ): Record<string, string> {
    return key === 'SEXTA_PARTE_SERVICE_YEARS' ? { value } : { rate: value };
  }
}
