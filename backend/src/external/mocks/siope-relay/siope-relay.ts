import { createHash } from 'node:crypto';

import {
  adapterQueueTopics,
  type QueueAdapterErrorEnvelope,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
  type QueueSubscription,
} from '../../../common/adapters';

export const SIOPE_RELAY_QUEUE_KIND = 'siope' as const;

export type SiopeRelayKind = typeof SIOPE_RELAY_QUEUE_KIND;
export type SiopeRelayScenario =
  | 'ACCEPT'
  | 'TRANSIENT_ERROR'
  | 'DEFINITIVE_ERROR';

export type SiopeRelayRequestPayload = Readonly<{
  exportId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  year: number;
  contentHash: string;
  contentBase64: string;
  scenario?: SiopeRelayScenario;
}>;

export type SiopeRelayResponsePayload = Readonly<{
  relay: 'siope-relay';
  handledBy: 'siope-relay-mock';
  exportId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  year: number;
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
      payload: SiopeRelayResponsePayload;
    }
  | {
      status: 'RETRY' | 'DEAD_LETTER';
      error: QueueAdapterErrorEnvelope;
    };

export type SiopeRelayMockResponderOptions = Readonly<{
  transport: QueueAdapterTransport;
  concurrency?: number;
  now?: () => Date;
}>;

export class SiopeRelayMockResponder {
  private readonly transport: QueueAdapterTransport;
  private readonly now: () => Date;
  private readonly subscription: QueueSubscription;

  constructor(options: SiopeRelayMockResponderOptions) {
    this.transport = options.transport;
    this.now = options.now ?? (() => new Date());
    this.subscription = this.transport.subscribe<
      QueueAdapterRequestEnvelope<SiopeRelayKind, SiopeRelayRequestPayload>
    >(
      adapterQueueTopics(SIOPE_RELAY_QUEUE_KIND).request,
      (request) => this.handleRequest(request),
      { concurrency: options.concurrency ?? 4 },
    );
  }

  close(): void {
    this.subscription.unsubscribe();
  }

  private async handleRequest(
    request: QueueAdapterRequestEnvelope<
      SiopeRelayKind,
      SiopeRelayRequestPayload
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
      SiopeRelayKind,
      SiopeRelayRequestPayload
    >,
  ): RelayDecision {
    const payload = request.payload;
    if (payload.scenario === 'TRANSIENT_ERROR') {
      return this.error('RETRY', 'TRANSIENT', 'SIOPE_RELAY_TRANSIENT');
    }
    if (payload.scenario === 'DEFINITIVE_ERROR') {
      return this.error('DEAD_LETTER', 'DEFINITIVE', 'SIOPE_RELAY_DEFINITIVE');
    }
    if (!payload.exportId) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_MISSING_EXPORT',
        'SIOPE relay requests must carry an export id.',
      );
    }
    if (!payload.layoutEdition || !payload.sourceUrl) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_LAYOUT_METADATA_REQUIRED',
        'SIOPE relay requests must carry caller-selected layout metadata.',
      );
    }
    if (payload.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_SOURCE_STATUS_UNSUPPORTED',
        'SIOPE relay only accepts caller-selected official-layout artifacts.',
      );
    }

    const content = Buffer.from(payload.contentBase64, 'base64');
    const contentSha256 = sha256(content);
    if (content.byteLength === 0 || contentSha256 !== payload.contentHash) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_CONTENT_HASH_MISMATCH',
        'SIOPE relay content hash does not match the submitted artifact.',
      );
    }

    const receivedAt = this.now().toISOString();
    const requestSha256 = sha256String(JSON.stringify(payload));
    const protocol = [
      'SIOPE',
      String(payload.year),
      contentSha256.slice(0, 16).toUpperCase(),
    ].join('-');

    return {
      status: 'OK',
      payload: {
        relay: 'siope-relay',
        handledBy: 'siope-relay-mock',
        exportId: payload.exportId,
        sourceStatus: payload.sourceStatus,
        layoutEdition: payload.layoutEdition,
        sourceUrl: payload.sourceUrl,
        tenantIbgeCode: payload.tenantIbgeCode,
        year: payload.year,
        ack: {
          protocol,
          status: 'SANDBOX_ACK',
          receivedAt,
          message:
            'Mock SIOPE relay accepted the local education fiscal CSV artifact for queue evidence.',
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
      SiopeRelayKind,
      SiopeRelayRequestPayload
    >,
    decision: RelayDecision,
  ): QueueAdapterResponseEnvelope<SiopeRelayKind, SiopeRelayResponsePayload> {
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
    message = 'Mock SIOPE relay requested adapter retry.',
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
