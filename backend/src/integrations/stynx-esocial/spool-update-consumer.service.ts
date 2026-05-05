import { Injectable } from '@nestjs/common';

import type { EsocialSpoolStatus, SpoolUpdateEnvelope } from './contracts';
import { EsocialSpoolService } from '../../esocial-spool';

type SpoolUpdateConsumerResult = Readonly<{
  applied: boolean;
  idempotencyKey: string;
}>;

@Injectable()
export class StynxEsocialSpoolUpdateConsumer {
  constructor(private readonly spoolService: EsocialSpoolService) {}

  async handle(
    envelope: SpoolUpdateEnvelope,
  ): Promise<SpoolUpdateConsumerResult> {
    const targetStatus = envelope.status_transition.to;
    const idempotencyKey = `spool:${envelope.message_id}:${transitionKey(
      envelope.status_transition.from,
      targetStatus,
    )}`;
    const existing = await this.spoolService.findById(
      envelope.tenant_id,
      envelope.message_id,
    );

    if (existing?.status === targetStatus) {
      return { applied: false, idempotencyKey };
    }

    if (targetStatus === 'SENT') {
      await this.spoolService.recordSent({
        tenantId: envelope.tenant_id,
        messageId: envelope.message_id,
      });
      return { applied: true, idempotencyKey };
    }

    if (targetStatus === 'RECEIVED' || targetStatus === 'ACCEPTED') {
      await this.spoolService.recordResponse({
        tenantId: envelope.tenant_id,
        messageId: envelope.message_id,
        status: targetStatus,
        response: envelope.response_payload ?? {},
        responseHash: envelope.response_hash,
      });
      return { applied: true, idempotencyKey };
    }

    if (
      targetStatus === 'RETRY' ||
      targetStatus === 'REJECTED' ||
      targetStatus === 'DLQ'
    ) {
      await this.spoolService.recordError({
        tenantId: envelope.tenant_id,
        messageId: envelope.message_id,
        status: targetStatus,
        error: envelope.error ?? {
          code: `STYNX_ESOCIAL_${targetStatus}`,
          message: `stynx-esocial transitioned message to ${targetStatus}`,
        },
        response: envelope.response_payload,
        responseHash: envelope.response_hash,
      });
      return { applied: true, idempotencyKey };
    }

    return { applied: false, idempotencyKey };
  }
}

function transitionKey(
  from: EsocialSpoolStatus | undefined,
  to: EsocialSpoolStatus,
): string {
  return `${from ?? 'NONE'}>${to}`;
}
