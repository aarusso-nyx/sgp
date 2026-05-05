import { createHash } from 'node:crypto';

import {
  adapterQueueTopics,
  type QueueAdapterErrorEnvelope,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
  type QueueSubscription,
} from '../../../common/adapters';

export const SIOPS_RELAY_QUEUE_KIND = 'siops' as const;

export type SiopsRelayKind = typeof SIOPS_RELAY_QUEUE_KIND;
export type SiopsRelayScenario =
  | 'ACCEPT'
  | 'TRANSIENT_ERROR'
  | 'DEFINITIVE_ERROR';

export type SiopsRelayRequestPayload = Readonly<{
  exportId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  period: string;
  contentHash: string;
  contentBase64: string;
  scenario?: SiopsRelayScenario;
}>;

export type SiopsRelayResponsePayload = Readonly<{
  relay: 'siops-relay';
  handledBy: 'siops-relay-mock';
  exportId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  period: string;
  ack: {
    protocol: string;
    status: 'SANDBOX_ACK';
    receivedAt: string;
    message: string;
  };
  boundary: {
    transmission: 'OUT_OF_SCOPE';
    acceptance: 'NOT_ASSERTED';
  };
  hashes: {
    requestSha256: string;
    contentSha256: string;
    evidenceHash: string;
  };
}>;

type RelayDecision =
  | {
      status: 'OK';
      payload: SiopsRelayResponsePayload;
    }
  | {
      status: 'RETRY' | 'DEAD_LETTER';
      error: QueueAdapterErrorEnvelope;
    };

export type SiopsRelayMockResponderOptions = Readonly<{
  transport: QueueAdapterTransport;
  concurrency?: number;
  now?: () => Date;
}>;

export class SiopsRelayMockResponder {
  private readonly transport: QueueAdapterTransport;
  private readonly now: () => Date;
  private readonly subscription: QueueSubscription;

  constructor(options: SiopsRelayMockResponderOptions) {
    this.transport = options.transport;
    this.now = options.now ?? (() => new Date());
    this.subscription = this.transport.subscribe<
      QueueAdapterRequestEnvelope<SiopsRelayKind, SiopsRelayRequestPayload>
    >(
      adapterQueueTopics(SIOPS_RELAY_QUEUE_KIND).request,
      (request) => this.handleRequest(request),
      { concurrency: options.concurrency ?? 4 },
    );
  }

  close(): void {
    this.subscription.unsubscribe();
  }

  private async handleRequest(
    request: QueueAdapterRequestEnvelope<
      SiopsRelayKind,
      SiopsRelayRequestPayload
    >,
  ): Promise<void> {
    const decision = this.evaluate(request);
    await this.transport.publish(
      request['reply-to'],
      this.buildResponse(request, decision),
    );
  }

  private evaluate(
    request: QueueAdapterRequestEnvelope<
      SiopsRelayKind,
      SiopsRelayRequestPayload
    >,
  ): RelayDecision {
    const payload = request.payload;
    if (payload.scenario === 'TRANSIENT_ERROR') {
      return this.error('RETRY', 'TRANSIENT', 'SIOPS_RELAY_TRANSIENT');
    }
    if (payload.scenario === 'DEFINITIVE_ERROR') {
      return this.error('DEAD_LETTER', 'DEFINITIVE', 'SIOPS_RELAY_DEFINITIVE');
    }
    if (!payload.exportId) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_MISSING_EXPORT',
        'SIOPS relay requests must carry an export id.',
      );
    }
    if (!payload.layoutEdition || !payload.sourceUrl) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_LAYOUT_METADATA_REQUIRED',
        'SIOPS relay requests must carry caller-selected layout metadata.',
      );
    }
    if (payload.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_SOURCE_STATUS_UNSUPPORTED',
        'SIOPS relay only accepts caller-selected official-layout artifacts.',
      );
    }

    const content = Buffer.from(payload.contentBase64, 'base64');
    const contentSha256 = sha256(content);
    if (content.byteLength === 0 || contentSha256 !== payload.contentHash) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_CONTENT_HASH_MISMATCH',
        'SIOPS relay content hash does not match the submitted artifact.',
      );
    }

    const receivedAt = this.now().toISOString();
    const requestSha256 = sha256String(JSON.stringify(payload));
    const protocol = [
      'SIOPS',
      payload.period,
      contentSha256.slice(0, 16).toUpperCase(),
    ].join('-');

    return {
      status: 'OK',
      payload: {
        relay: 'siops-relay',
        handledBy: 'siops-relay-mock',
        exportId: payload.exportId,
        sourceStatus: payload.sourceStatus,
        layoutEdition: payload.layoutEdition,
        sourceUrl: payload.sourceUrl,
        tenantIbgeCode: payload.tenantIbgeCode,
        period: payload.period,
        ack: {
          protocol,
          status: 'SANDBOX_ACK',
          receivedAt,
          message:
            'Mock SIOPS relay accepted the local health fiscal CSV artifact for queue evidence.',
        },
        boundary: {
          transmission: 'OUT_OF_SCOPE',
          acceptance: 'NOT_ASSERTED',
        },
        hashes: {
          requestSha256,
          contentSha256,
          evidenceHash: sha256String(
            `${payload.exportId}:${request.tenant_id}:${contentSha256}`,
          ),
        },
      },
    };
  }

  private buildResponse(
    request: QueueAdapterRequestEnvelope<
      SiopsRelayKind,
      SiopsRelayRequestPayload
    >,
    decision: RelayDecision,
  ): QueueAdapterResponseEnvelope<SiopsRelayKind, SiopsRelayResponsePayload> {
    return {
      'request-id': request['request-id'],
      'correlation-id': request['correlation-id'],
      'created-at': this.now().toISOString(),
      tenant_id: request.tenant_id,
      kind: request.kind,
      status: decision.status,
      attempt: request.attempt,
      payload: decision.status === 'OK' ? decision.payload : undefined,
      error: decision.status === 'OK' ? undefined : decision.error,
    };
  }

  private error(
    status: 'RETRY' | 'DEAD_LETTER',
    kind: QueueAdapterErrorEnvelope['kind'],
    code: string,
    message = 'Mock SIOPS relay requested adapter retry.',
  ): RelayDecision {
    return {
      status,
      error: {
        kind,
        code,
        message,
      },
    };
  }
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function sha256String(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
