import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@stynx-nyx/feature-flags';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { SystemParameterFeatureFlagProvider } from './system-parameter-feature-flag.provider';

export const ESOCIAL_QUEUE_TRANSPORT_FLAG = 'esocial.queue.transport';
export const ESOCIAL_QUEUE_TRANSPORT_PARAMETER_KEY = `feature-flag:${ESOCIAL_QUEUE_TRANSPORT_FLAG}`;

export type EsocialQueueTransportMode = 'in-memory' | 'sqs';

@Injectable()
export class EsocialQueueTransportFlag {
  private readonly featureFlags: FeatureFlagsService;

  constructor(
    private readonly featureFlagProvider: SystemParameterFeatureFlagProvider,
  ) {
    this.featureFlags = new FeatureFlagsService(featureFlagProvider);
  }

  async resolve(tenantId: string): Promise<EsocialQueueTransportMode> {
    return RequestContextStore.run(
      {
        ...RequestContextStore.get(),
        tenantId,
        permissions: ['gestao.read'],
      },
      async () => {
        const evaluation = await this.featureFlags.evaluate(
          ESOCIAL_QUEUE_TRANSPORT_FLAG,
          { tenantId },
          false,
        );
        return normalizeTransportFlag(evaluation.value);
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
