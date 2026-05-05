import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';

export const ESOCIAL_QUEUE_TRANSPORT_FLAG = 'esocial.queue.transport';
export const ESOCIAL_QUEUE_TRANSPORT_PARAMETER_KEY = `feature-flag:${ESOCIAL_QUEUE_TRANSPORT_FLAG}`;

export type EsocialQueueTransportMode = 'in-memory' | 'sqs';

type FeatureFlagRow = QueryResultRow & {
  value: unknown;
};

@Injectable()
export class EsocialQueueTransportFlag {
  constructor(private readonly databaseService: DatabaseService) {}

  async resolve(tenantId: string): Promise<EsocialQueueTransportMode> {
    if (!this.databaseService.configured) {
      return 'in-memory';
    }

    return RequestContextStore.run(
      {
        ...RequestContextStore.get(),
        tenantId,
        permissions: ['gestao.read'],
      },
      async () => {
        const [row] = await this.databaseService.query<FeatureFlagRow>(
          `
          SELECT value
          FROM public.system_parameter
          WHERE tenant_id = $1::uuid
            AND key = $2
          LIMIT 1
          `,
          [tenantId, ESOCIAL_QUEUE_TRANSPORT_PARAMETER_KEY],
        );

        return normalizeTransportFlag(row?.value);
      },
    );
  }
}

function normalizeTransportFlag(value: unknown): EsocialQueueTransportMode {
  if (value === 'sqs' || value === 'in-memory') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return 'in-memory';
  }

  const record = value as Record<string, unknown>;
  if (record.active === false) {
    return 'in-memory';
  }

  const transport = record.transport ?? record.value;
  return transport === 'sqs' ? 'sqs' : 'in-memory';
}
