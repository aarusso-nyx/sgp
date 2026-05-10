import {
  adapterQueueTopics,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterResponseStatus,
  type QueueAdapterTransport,
  type QueueSubscription,
} from '../../../common/adapters';

export type ReferenceMockAction = 'echo' | 'transient-then-ok' | 'always-retry';

export type ReferenceMockPayload = Readonly<{
  action: ReferenceMockAction;
  value?: unknown;
  delayMs?: number | undefined;
}>;

export type ReferenceMockResponsePayload = Readonly<{
  echoed: unknown;
  attempt: number;
  handledBy: 'reference-mock-responder';
}>;

export type ReferenceMockResponderOptions<TKind extends string> = Readonly<{
  kind: TKind;
  transport: QueueAdapterTransport;
  concurrency?: number | undefined;
  transientFailuresBeforeSuccess?: number | undefined;
  now?: (() => Date) | undefined;
}>;

export class ReferenceMockResponder<TKind extends string = string> {
  private readonly kind: TKind;
  private readonly transport: QueueAdapterTransport;
  private readonly transientFailuresBeforeSuccess: number;
  private readonly now: () => Date;
  private readonly attemptsByIdempotencyKey = new Map<string, number>();
  private readonly subscription: QueueSubscription;

  constructor(options: ReferenceMockResponderOptions<TKind>) {
    this.kind = options.kind;
    this.transport = options.transport;
    this.transientFailuresBeforeSuccess =
      options.transientFailuresBeforeSuccess ?? 1;
    this.now = options.now ?? (() => new Date());
    this.subscription = this.transport.subscribe<
      QueueAdapterRequestEnvelope<TKind, ReferenceMockPayload>
    >(
      adapterQueueTopics(this.kind).request,
      (request) => this.handleRequest(request),
      { concurrency: options.concurrency ?? 4 },
    );
  }

  close(): void {
    this.subscription.unsubscribe();
  }

  private async handleRequest(
    request: QueueAdapterRequestEnvelope<TKind, ReferenceMockPayload>,
  ): Promise<void> {
    if (request.payload.delayMs && request.payload.delayMs > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, request.payload.delayMs),
      );
    }

    const observedAttempt = this.recordAttempt(request['idempotency-key']);
    const status = this.responseStatus(request, observedAttempt);
    const response = this.buildResponse(request, status);

    await this.transport.publish(request['reply-to'], response);
  }

  private recordAttempt(idempotencyKey: string): number {
    const attempt =
      (this.attemptsByIdempotencyKey.get(idempotencyKey) ?? 0) + 1;
    this.attemptsByIdempotencyKey.set(idempotencyKey, attempt);
    return attempt;
  }

  private responseStatus(
    request: QueueAdapterRequestEnvelope<TKind, ReferenceMockPayload>,
    observedAttempt: number,
  ): QueueAdapterResponseStatus {
    if (request.payload.action === 'echo') {
      return 'OK';
    }
    if (request.payload.action === 'transient-then-ok') {
      return observedAttempt <= this.transientFailuresBeforeSuccess
        ? 'RETRY'
        : 'OK';
    }
    if (request.attempt >= request['max-attempts']) {
      return 'DEAD_LETTER';
    }
    return 'RETRY';
  }

  private buildResponse(
    request: QueueAdapterRequestEnvelope<TKind, ReferenceMockPayload>,
    status: QueueAdapterResponseStatus,
  ): QueueAdapterResponseEnvelope<TKind, ReferenceMockResponsePayload> {
    const payload =
      status === 'OK'
        ? {
            echoed: request.payload.value,
            attempt: request.attempt,
            handledBy: 'reference-mock-responder' as const,
          }
        : undefined;

    return {
      'request-id': request['request-id'],
      'correlation-id': request['correlation-id'],
      'created-at': this.now().toISOString(),
      tenant_id: request.tenant_id,
      kind: request.kind,
      status,
      attempt: request.attempt,
      payload,
      error:
        status === 'OK'
          ? undefined
          : {
              kind: status === 'RETRY' ? 'TRANSIENT' : 'MAX_ATTEMPTS_EXCEEDED',
              code:
                status === 'RETRY'
                  ? 'REFERENCE_TRANSIENT'
                  : 'REFERENCE_DEAD_LETTER',
              message:
                status === 'RETRY'
                  ? 'Reference mock requested adapter retry.'
                  : 'Reference mock exhausted adapter attempts.',
            },
    };
  }
}
