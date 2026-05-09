import { createHash } from 'node:crypto';

import {
  SgpQueueAdapter,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
} from '../../../common/adapters';
import {
  SICONFI_RELAY_QUEUE_KIND,
  type SiconfiRelayKind,
  type SiconfiRelayRequestPayload,
  type SiconfiRelayResponsePayload,
  type SiconfiRelayScenario,
} from '../../../external/mocks/siconfi-relay';
import type { SiconfiFiscalStatementInput } from '../rreo-rgf.generator';
import { domainError } from '../../../common/errors/domain-error';

export type SiconfiQueueAdapterOptions = Readonly<{
  transport?: QueueAdapterTransport | undefined;
  queue?: SgpQueueAdapter<SiconfiRelayKind> | undefined;
  maxAttempts?: number | undefined;
  responseTimeoutMs?: number | undefined;
  retryDelayMs?: ((attempt: number) => number) | undefined;
  now?: (() => Date) | undefined;
  idFactory?: (() => string) | undefined;
}>;

export type SubmitSiconfiFiscalStatementInput = Readonly<{
  tenantId: string;
  submissionId: string;
  statement: SiconfiFiscalStatementInput;
  content: string;
  scenario?: SiconfiRelayScenario | undefined;
  idempotencyKey?: string | undefined;
  correlationId?: string | undefined;
  requestId?: string | undefined;
  maxAttempts?: number | undefined;
}>;

export type SiconfiQueueDispatchState = Readonly<{
  system: 'SICONFI';
  submissionId: string;
  tenantId: string;
  declaration: 'RREO' | 'RGF';
  layoutEdition: string;
  sourceUrl: string;
  contentHash: string;
  protocol: string;
  status: 'SANDBOX_ACK';
  submittedAt: string;
  responseAt: string;
  boundary: SiconfiRelayResponsePayload['boundary'];
}>;

export type SubmitSiconfiFiscalStatementResult = Readonly<{
  queueResponse: QueueAdapterResponseEnvelope<
    SiconfiRelayKind,
    SiconfiRelayResponsePayload
  >;
  relay: SiconfiRelayResponsePayload;
  dispatchState: SiconfiQueueDispatchState;
}>;

export class SiconfiQueueAdapter {
  private readonly queue: SgpQueueAdapter<SiconfiRelayKind>;
  private readonly ownsQueue: boolean;

  constructor(options: SiconfiQueueAdapterOptions) {
    if (options.queue) {
      this.queue = options.queue;
      this.ownsQueue = false;
      return;
    }
    if (!options.transport) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'SiconfiQueueAdapter requires either a queue or a queue transport.',
      );
    }
    this.queue = new SgpQueueAdapter({
      kind: SICONFI_RELAY_QUEUE_KIND,
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

  async submitFiscalStatement(
    input: SubmitSiconfiFiscalStatementInput,
  ): Promise<SubmitSiconfiFiscalStatementResult> {
    const payload = this.buildPayload(input);
    const queueResponse = await this.queue.request<
      SiconfiRelayRequestPayload,
      SiconfiRelayResponsePayload
    >({
      tenantId: input.tenantId,
      requestId: input.requestId,
      correlationId: input.correlationId,
      idempotencyKey:
        input.idempotencyKey ??
        [
          input.tenantId,
          'siconfi',
          input.submissionId,
          payload.contentHash,
        ].join(':'),
      maxAttempts: input.maxAttempts,
      payload,
    });

    const relay = queueResponse.payload;
    if (!relay) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'SICONFI relay returned an OK response without payload.',
      );
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
    input: SubmitSiconfiFiscalStatementInput,
  ): SiconfiRelayRequestPayload {
    const content = Buffer.from(input.content, 'utf8');
    return {
      submissionId: input.submissionId,
      sourceStatus: input.statement.sourceStatus,
      declaration: input.statement.declaration,
      layoutEdition: input.statement.layoutEdition,
      sourceUrl: input.statement.sourceUrl,
      tenantIbgeCode: input.statement.tenantIbgeCode,
      period: input.statement.period,
      contentHash: sha256(content),
      contentBase64: content.toString('base64'),
      scenario: input.scenario,
    };
  }

  private assertRelayPayload(
    input: SubmitSiconfiFiscalStatementInput,
    payload: SiconfiRelayRequestPayload,
    relay: SiconfiRelayResponsePayload,
  ): void {
    if (relay.submissionId !== input.submissionId) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'SICONFI relay returned a different submission id.',
      );
    }
    if (relay.hashes.contentSha256 !== payload.contentHash) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'SICONFI relay returned a different content hash.',
      );
    }
    if (
      relay.declaration !== input.statement.declaration ||
      relay.layoutEdition !== input.statement.layoutEdition ||
      relay.period !== input.statement.period
    ) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'SICONFI relay returned different fiscal metadata.',
      );
    }
  }

  private buildDispatchState(
    input: SubmitSiconfiFiscalStatementInput,
    payload: SiconfiRelayRequestPayload,
    relay: SiconfiRelayResponsePayload,
    queueResponse: QueueAdapterResponseEnvelope<
      SiconfiRelayKind,
      SiconfiRelayResponsePayload
    >,
  ): SiconfiQueueDispatchState {
    return {
      system: 'SICONFI',
      submissionId: input.submissionId,
      tenantId: input.tenantId,
      declaration: input.statement.declaration,
      layoutEdition: input.statement.layoutEdition,
      sourceUrl: input.statement.sourceUrl,
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
