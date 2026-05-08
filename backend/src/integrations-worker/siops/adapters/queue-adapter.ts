import { createHash } from 'node:crypto';

import {
  SgpQueueAdapter,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
} from '../../../common/adapters';
import {
  SIOPS_RELAY_QUEUE_KIND,
  type SiopsRelayKind,
  type SiopsRelayRequestPayload,
  type SiopsRelayResponsePayload,
  type SiopsRelayScenario,
} from '../../../external/mocks/siops-relay';
import type { SiopsExportInput } from '../siops-export.generator';

export type SiopsQueueAdapterOptions = Readonly<{
  transport?: QueueAdapterTransport | undefined;
  queue?: SgpQueueAdapter<SiopsRelayKind> | undefined;
  maxAttempts?: number | undefined;
  responseTimeoutMs?: number | undefined;
  retryDelayMs?: ((attempt: number) => number) | undefined;
  now?: (() => Date) | undefined;
  idFactory?: (() => string) | undefined;
}>;

export type SubmitSiopsExportInput = Readonly<{
  tenantId: string;
  exportId: string;
  export: SiopsExportInput;
  content: string;
  scenario?: SiopsRelayScenario | undefined;
  idempotencyKey?: string | undefined;
  correlationId?: string | undefined;
  requestId?: string | undefined;
  maxAttempts?: number | undefined;
}>;

export type SiopsQueueDispatchState = Readonly<{
  system: 'SIOPS';
  exportId: string;
  tenantId: string;
  layoutEdition: string;
  sourceUrl: string;
  period: string;
  contentHash: string;
  protocol: string;
  status: 'SANDBOX_ACK';
  submittedAt: string;
  responseAt: string;
  boundary: SiopsRelayResponsePayload['boundary'];
}>;

export type SubmitSiopsExportResult = Readonly<{
  queueResponse: QueueAdapterResponseEnvelope<
    SiopsRelayKind,
    SiopsRelayResponsePayload
  >;
  relay: SiopsRelayResponsePayload;
  dispatchState: SiopsQueueDispatchState;
}>;

export class SiopsQueueAdapter {
  private readonly queue: SgpQueueAdapter<SiopsRelayKind>;
  private readonly ownsQueue: boolean;

  constructor(options: SiopsQueueAdapterOptions) {
    if (options.queue) {
      this.queue = options.queue;
      this.ownsQueue = false;
      return;
    }
    if (!options.transport) {
      throw new Error(
        'SiopsQueueAdapter requires either a queue or a queue transport.',
      );
    }
    this.queue = new SgpQueueAdapter({
      kind: SIOPS_RELAY_QUEUE_KIND,
      transport: options.transport,
      maxAttempts: options.maxAttempts,
      responseTimeoutMs: options.responseTimeoutMs,
      retryDelayMs: options.retryDelayMs,
      now: options.now,
      idFactory: options.idFactory,
    });
    this.ownsQueue = true;
  }

  close(): void {
    if (this.ownsQueue) {
      this.queue.close();
    }
  }

  async submitExport(
    input: SubmitSiopsExportInput,
  ): Promise<SubmitSiopsExportResult> {
    const payload = this.buildPayload(input);
    const queueResponse = await this.queue.request<
      SiopsRelayRequestPayload,
      SiopsRelayResponsePayload
    >({
      tenantId: input.tenantId,
      requestId: input.requestId,
      correlationId: input.correlationId,
      idempotencyKey:
        input.idempotencyKey ??
        [input.tenantId, 'siops', input.exportId, payload.contentHash].join(
          ':',
        ),
      maxAttempts: input.maxAttempts,
      payload,
    });

    const relay = queueResponse.payload;
    if (!relay) {
      throw new Error('SIOPS relay returned an OK response without payload.');
    }
    this.assertRelayPayload(input, payload, relay);

    return {
      queueResponse,
      relay,
      dispatchState: this.buildDispatchState(
        input,
        payload,
        relay,
        queueResponse,
      ),
    };
  }

  private buildPayload(
    input: SubmitSiopsExportInput,
  ): SiopsRelayRequestPayload {
    const content = Buffer.from(input.content, 'utf8');
    return {
      exportId: input.exportId,
      sourceStatus: input.export.sourceStatus,
      layoutEdition: input.export.layoutEdition,
      sourceUrl: input.export.sourceUrl,
      tenantIbgeCode: input.export.tenantIbgeCode,
      period: input.export.period,
      contentHash: sha256(content),
      contentBase64: content.toString('base64'),
      scenario: input.scenario,
    };
  }

  private assertRelayPayload(
    input: SubmitSiopsExportInput,
    payload: SiopsRelayRequestPayload,
    relay: SiopsRelayResponsePayload,
  ): void {
    if (relay.exportId !== input.exportId) {
      throw new Error('SIOPS relay returned a different export id.');
    }
    if (relay.hashes.contentSha256 !== payload.contentHash) {
      throw new Error('SIOPS relay returned a different content hash.');
    }
    if (
      relay.layoutEdition !== input.export.layoutEdition ||
      relay.period !== input.export.period
    ) {
      throw new Error('SIOPS relay returned different fiscal metadata.');
    }
  }

  private buildDispatchState(
    input: SubmitSiopsExportInput,
    payload: SiopsRelayRequestPayload,
    relay: SiopsRelayResponsePayload,
    queueResponse: QueueAdapterResponseEnvelope<
      SiopsRelayKind,
      SiopsRelayResponsePayload
    >,
  ): SiopsQueueDispatchState {
    return {
      system: 'SIOPS',
      exportId: input.exportId,
      tenantId: input.tenantId,
      layoutEdition: input.export.layoutEdition,
      sourceUrl: input.export.sourceUrl,
      period: input.export.period,
      contentHash: payload.contentHash,
      protocol: relay.ack.protocol,
      status: relay.ack.status,
      submittedAt: relay.ack.receivedAt,
      responseAt: queueResponse['created-at'],
      boundary: relay.boundary,
    };
  }
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
