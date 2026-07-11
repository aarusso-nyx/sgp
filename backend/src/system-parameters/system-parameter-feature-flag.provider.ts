import { Injectable } from '@nestjs/common';
import type {
  FeatureFlagProvider,
  FlagContext,
  FlagEvaluation,
  FlagValue,
} from '@stynx-nyx/feature-flags';
import type { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';

type FeatureFlagRow = QueryResultRow & {
  value: unknown;
};

@Injectable()
export class SystemParameterFeatureFlagProvider implements FeatureFlagProvider {
  constructor(private readonly databaseService: DatabaseService) {}

  async evaluate(
    flag: string,
    context: FlagContext,
    fallback: FlagValue,
  ): Promise<FlagEvaluation> {
    if (!this.databaseService.configured) {
      return { flag, value: fallback, source: 'fallback', context };
    }

    const tenantId = context.tenantId ?? RequestContextStore.get()?.tenantId;
    const rows = tenantId
      ? await this.databaseService.query<FeatureFlagRow>(
          `
          SELECT value
          FROM public.system_parameter
          WHERE tenant_id = $1::uuid
            AND key = $2
          LIMIT 1
          `,
          [tenantId, `feature-flag:${flag}`],
        )
      : await this.databaseService.query<FeatureFlagRow>(
          `
          SELECT value
          FROM public.system_parameter
          WHERE tenant_id = public.sgp_current_tenant_uuid()
            AND key = $1
          LIMIT 1
          `,
          [`feature-flag:${flag}`],
        );

    const row = rows[0];
    return {
      flag,
      value: row ? normalizeFeatureFlagValue(row.value, fallback) : fallback,
      source: row ? 'tenant' : 'fallback',
      context: tenantId ? { ...context, tenantId } : context,
    };
  }
}

export function normalizeFeatureFlagValue(
  value: unknown,
  fallback: FlagValue,
): FlagValue {
  if (typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const output: Record<string, boolean | string | number> = {};
  for (const [key, candidate] of Object.entries(record)) {
    if (
      typeof candidate === 'boolean' ||
      typeof candidate === 'string' ||
      (typeof candidate === 'number' && Number.isFinite(candidate))
    ) {
      output[key] = candidate;
    }
  }
  return Object.keys(output).length > 0 ? output : fallback;
}
