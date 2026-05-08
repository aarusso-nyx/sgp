import { createHash } from 'node:crypto';

import {
  SgpQueueAdapter,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
} from '../../../common/adapters';
import {
  SIOPE_RELAY_QUEUE_KIND,
  type SiopeRelayKind,
  type SiopeRelayRequestPayload,
  type SiopeRelayResponsePayload,
  type SiopeRelayScenario,
} from '../../../external/mocks/siope-relay';
import type { SiopeExportInput } from '../siope-export.generator';

export type SiopeQueueAdapterOptions = Readonly<{
  transport?: QueueAdapterTransport | undefined;
  queue?: SgpQueueAdapter<SiopeRelayKind> | undefined;
  maxAttempts?: number | undefined;
  responseTimeoutMs?: number | undefined;
  retryDelayMs?: ((attempt: number) => number) | undefined;
  now?: (() => Date) | undefined;
  idFactory?: (() => string) | undefined;
}>;

export type SubmitSiopeExportInput = Readonly<{
  tenantId: string;
  exportId: string;
  export: SiopeExportInput;
  content: string;
  scenario?: SiopeRelayScenario | undefined;
  idempotencyKey?: string | undefined;
  correlationId?: string | undefined;
  requestId?: string | undefined;
  maxAttempts?: number | undefined;
}>;

export type SiopeQueueDispatchState = Readonly<{
  system: 'SIOPE';
  exportId: string;
  tenantId: string;
  layoutEdition: string;
  sourceUrl: string;
  year: number;
  contentHash: string;
  protocol: string;
  status: 'SANDBOX_ACK';
  submittedAt: string;
  responseAt: string;
  boundary: SiopeRelayResponsePayload['boundary'];
}>;

export type SubmitSiopeExportResult = Readonly<{
  queueResponse: QueueAdapterResponseEnvelope<
    SiopeRelayKind,
    SiopeRelayResponsePayload
  >;
  relay: SiopeRelayResponsePayload;
  dispatchState: SiopeQueueDispatchState;
}>;

export class SiopeQueueAdapter {
  private readonly queue: SgpQueueAdapter<SiopeRelayKind>;
  private readonly ownsQueue: boolean;

  constructor(options: SiopeQueueAdapterOptions) {
    if (options.queue) {
      this.queue = options.queue;
      this.ownsQueue = false;
      return;
    }
    if (!options.transport) {
      throw new Error(
        'SiopeQueueAdapter requires either a queue or a queue transport.',
      );
    }
    this.queue = new SgpQueueAdapter({
      kind: SIOPE_RELAY_QUEUE_KIND,
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
    input: SubmitSiopeExportInput,
  ): Promise<SubmitSiopeExportResult> {
    const payload = this.buildPayload(input);
    const queueResponse = await this.queue.request<
      SiopeRelayRequestPayload,
      SiopeRelayResponsePayload
    >({
      tenantId: input.tenantId,
      requestId: input.requestId,
      correlationId: input.correlationId,
      idempotencyKey:
        input.idempotencyKey ??
        [input.tenantId, 'siope', input.exportId, payload.contentHash].join(
          ':',
        ),
      maxAttempts: input.maxAttempts,
      payload,
    });

    const relay = queueResponse.payload;
    if (!relay) {
      throw new Error('SIOPE relay returned an OK response without payload.');
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
    input: SubmitSiopeExportInput,
  ): SiopeRelayRequestPayload {
    const content = Buffer.from(input.content, 'utf8');
    return {
      exportId: input.exportId,
      sourceStatus: input.export.sourceStatus,
      layoutEdition: input.export.layoutEdition,
      sourceUrl: input.export.sourceUrl,
      tenantIbgeCode: input.export.tenantIbgeCode,
      year: input.export.year,
      contentHash: sha256(content),
      contentBase64: content.toString('base64'),
      scenario: input.scenario,
    };
  }

  private assertRelayPayload(
    input: SubmitSiopeExportInput,
    payload: SiopeRelayRequestPayload,
    relay: SiopeRelayResponsePayload,
  ): void {
    if (relay.exportId !== input.exportId) {
      throw new Error('SIOPE relay returned a different export id.');
    }
    if (relay.hashes.contentSha256 !== payload.contentHash) {
      throw new Error('SIOPE relay returned a different content hash.');
    }
    if (
      relay.layoutEdition !== input.export.layoutEdition ||
      relay.year !== input.export.year
    ) {
      throw new Error('SIOPE relay returned different fiscal metadata.');
    }
  }

  private buildDispatchState(
    input: SubmitSiopeExportInput,
    payload: SiopeRelayRequestPayload,
    relay: SiopeRelayResponsePayload,
    queueResponse: QueueAdapterResponseEnvelope<
      SiopeRelayKind,
      SiopeRelayResponsePayload
    >,
  ): SiopeQueueDispatchState {
    return {
      system: 'SIOPE',
      exportId: input.exportId,
      tenantId: input.tenantId,
      layoutEdition: input.export.layoutEdition,
      sourceUrl: input.export.sourceUrl,
      year: input.export.year,
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
