import { createHash } from 'node:crypto';

import {
  adapterQueueTopics,
  type QueueAdapterErrorEnvelope,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
  type QueueSubscription,
} from '../../common/adapters';

export type OfficialLayoutRelayScenario =
  'ACCEPT' | 'TRANSIENT_ERROR' | 'DEFINITIVE_ERROR';

export type OfficialLayoutRelayDecision<ResponsePayload> =
  | {
      status: 'OK';
      payload: ResponsePayload;
    }
  | {
      status: 'RETRY' | 'DEAD_LETTER';
      error: QueueAdapterErrorEnvelope;
    };

export type OfficialLayoutRelayMockResponderOptions = Readonly<{
  transport: QueueAdapterTransport;
  concurrency?: number | undefined;
  now?: (() => Date) | undefined;
}>;

export abstract class OfficialLayoutRelayMockResponderBase<
  RelayKind extends string,
  RequestPayload,
  ResponsePayload,
> {
  protected readonly now: () => Date;

  private readonly transport: QueueAdapterTransport;
  private readonly subscription: QueueSubscription;

  protected constructor(
    private readonly queueKind: RelayKind,
    options: OfficialLayoutRelayMockResponderOptions,
  ) {
    this.transport = options.transport;
    this.now = options.now ?? (() => new Date());
    this.subscription = this.transport.subscribe<
      QueueAdapterRequestEnvelope<RelayKind, RequestPayload>
    >(
      adapterQueueTopics(queueKind).request,
      (request) => this.handleRequest(request),
      { concurrency: options.concurrency ?? 4 },
    );
  }

  close(): void {
    this.subscription.unsubscribe();
  }

  protected abstract evaluate(
    request: QueueAdapterRequestEnvelope<RelayKind, RequestPayload>,
  ): OfficialLayoutRelayDecision<ResponsePayload>;

  protected error(
    status: 'RETRY' | 'DEAD_LETTER',
    kind: QueueAdapterErrorEnvelope['kind'],
    code: string,
    message: string,
  ): OfficialLayoutRelayDecision<ResponsePayload> {
    return {
      status,
      error: {
        kind,
        code,
        message,
      },
    };
  }

  protected sha256(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  protected sha256String(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private async handleRequest(
    request: QueueAdapterRequestEnvelope<RelayKind, RequestPayload>,
  ): Promise<void> {
    const decision = this.evaluate(request);
    await this.transport.publish(
      request['reply-to'],
      this.buildResponse(request, decision),
    );
  }

  private buildResponse(
    request: QueueAdapterRequestEnvelope<RelayKind, RequestPayload>,
    decision: OfficialLayoutRelayDecision<ResponsePayload>,
  ): QueueAdapterResponseEnvelope<RelayKind, ResponsePayload> {
    return {
      'request-id': request['request-id'],
      'correlation-id': request['correlation-id'],
      'created-at': this.now().toISOString(),
      tenant_id: request.tenant_id,
      kind: this.queueKind,
      status: decision.status,
      attempt: request.attempt,
      payload: decision.status === 'OK' ? decision.payload : undefined,
      error: decision.status === 'OK' ? undefined : decision.error,
    };
  }
}
