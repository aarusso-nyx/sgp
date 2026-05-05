import { createHash } from 'node:crypto';

import {
  adapterQueueTopics,
  type QueueAdapterErrorEnvelope,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
  type QueueSubscription,
} from '../../../common/adapters';

export const SICONFI_RELAY_QUEUE_KIND = 'siconfi' as const;

export type SiconfiRelayKind = typeof SICONFI_RELAY_QUEUE_KIND;
export type SiconfiRelayScenario =
  | 'ACCEPT'
  | 'TRANSIENT_ERROR'
  | 'DEFINITIVE_ERROR';

export type SiconfiRelayRequestPayload = Readonly<{
  submissionId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  declaration: 'RREO' | 'RGF';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  period: string;
  contentHash: string;
  contentBase64: string;
  scenario?: SiconfiRelayScenario;
}>;

export type SiconfiRelayResponsePayload = Readonly<{
  relay: 'siconfi-relay';
  handledBy: 'siconfi-relay-mock';
  submissionId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  declaration: 'RREO' | 'RGF';
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
      payload: SiconfiRelayResponsePayload;
    }
  | {
      status: 'RETRY' | 'DEAD_LETTER';
      error: QueueAdapterErrorEnvelope;
    };

export type SiconfiRelayMockResponderOptions = Readonly<{
  transport: QueueAdapterTransport;
  concurrency?: number;
  now?: () => Date;
}>;

export class SiconfiRelayMockResponder {
  private readonly transport: QueueAdapterTransport;
  private readonly now: () => Date;
  private readonly subscription: QueueSubscription;

  constructor(options: SiconfiRelayMockResponderOptions) {
    this.transport = options.transport;
    this.now = options.now ?? (() => new Date());
    this.subscription = this.transport.subscribe<
      QueueAdapterRequestEnvelope<SiconfiRelayKind, SiconfiRelayRequestPayload>
    >(
      adapterQueueTopics(SICONFI_RELAY_QUEUE_KIND).request,
      (request) => this.handleRequest(request),
      { concurrency: options.concurrency ?? 4 },
    );
  }

  close(): void {
    this.subscription.unsubscribe();
  }

  private async handleRequest(
    request: QueueAdapterRequestEnvelope<
      SiconfiRelayKind,
      SiconfiRelayRequestPayload
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
      SiconfiRelayKind,
      SiconfiRelayRequestPayload
    >,
  ): RelayDecision {
    const payload = request.payload;
    if (payload.scenario === 'TRANSIENT_ERROR') {
      return this.error('RETRY', 'TRANSIENT', 'SICONFI_RELAY_TRANSIENT');
    }
    if (payload.scenario === 'DEFINITIVE_ERROR') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_DEFINITIVE',
      );
    }
    if (!payload.submissionId) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_MISSING_SUBMISSION',
        'SICONFI relay requests must carry a submission id.',
      );
    }
    if (!payload.layoutEdition || !payload.sourceUrl) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_LAYOUT_METADATA_REQUIRED',
        'SICONFI relay requests must carry caller-selected layout metadata.',
      );
    }
    if (payload.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_SOURCE_STATUS_UNSUPPORTED',
        'SICONFI relay only accepts caller-selected official-layout artifacts.',
      );
    }

    const content = Buffer.from(payload.contentBase64, 'base64');
    const contentSha256 = sha256(content);
    if (content.byteLength === 0 || contentSha256 !== payload.contentHash) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_CONTENT_HASH_MISMATCH',
        'SICONFI relay content hash does not match the submitted artifact.',
      );
    }

    const receivedAt = this.now().toISOString();
    const requestSha256 = sha256String(JSON.stringify(payload));
    const protocol = [
      'SICONFI',
      payload.declaration,
      payload.period,
      contentSha256.slice(0, 16).toUpperCase(),
    ].join('-');

    return {
      status: 'OK',
      payload: {
        relay: 'siconfi-relay',
        handledBy: 'siconfi-relay-mock',
        submissionId: payload.submissionId,
        sourceStatus: payload.sourceStatus,
        declaration: payload.declaration,
        layoutEdition: payload.layoutEdition,
        sourceUrl: payload.sourceUrl,
        tenantIbgeCode: payload.tenantIbgeCode,
        period: payload.period,
        ack: {
          protocol,
          status: 'SANDBOX_ACK',
          receivedAt,
          message:
            'Mock SICONFI relay accepted the local fiscal CSV artifact for queue evidence.',
        },
        boundary: {
          transmission: 'OUT_OF_SCOPE',
          acceptance: 'NOT_ASSERTED',
        },
        hashes: {
          requestSha256,
          contentSha256,
          evidenceHash: sha256String(
            `${payload.submissionId}:${request.tenant_id}:${contentSha256}`,
          ),
        },
      },
    };
  }

  private buildResponse(
    request: QueueAdapterRequestEnvelope<
      SiconfiRelayKind,
      SiconfiRelayRequestPayload
    >,
    decision: RelayDecision,
  ): QueueAdapterResponseEnvelope<
    SiconfiRelayKind,
    SiconfiRelayResponsePayload
  > {
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
    message = 'Mock SICONFI relay requested adapter retry.',
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
