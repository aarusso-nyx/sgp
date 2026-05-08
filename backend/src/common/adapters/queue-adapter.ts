import { randomUUID } from 'node:crypto';

import { requestId, RequestId, tenantId, TenantId } from '../types/branded-ids';

export type QueueAdapterResponseStatus = 'OK' | 'RETRY' | 'DEAD_LETTER';

export type QueueAdapterErrorKind =
  | 'TRANSIENT'
  | 'DEFINITIVE'
  | 'TIMEOUT'
  | 'MAX_ATTEMPTS_EXCEEDED';

export type QueueAdapterTopics<TKind extends string = string> = Readonly<{
  kind: TKind;
  request: string;
  response: string;
  deadLetter: string;
}>;

export type QueueAdapterErrorEnvelope = Readonly<{
  kind: QueueAdapterErrorKind;
  code: string;
  message: string;
  details?: unknown;
}>;

export type QueueAdapterRequestEnvelope<
  TKind extends string = string,
  TPayload = unknown,
> = Readonly<{
  'request-id': RequestId;
  'correlation-id': RequestId;
  'idempotency-key': string;
  'reply-to': string;
  'dead-letter-topic': string;
  'created-at': string;
  tenant_id: TenantId;
  kind: TKind;
  payload: TPayload;
  attempt: number;
  'max-attempts': number;
}>;

export type QueueAdapterResponseEnvelope<
  TKind extends string = string,
  TPayload = unknown,
> = Readonly<{
  'request-id': RequestId;
  'correlation-id': RequestId;
  'created-at': string;
  tenant_id: TenantId;
  kind: TKind;
  status: QueueAdapterResponseStatus;
  attempt: number;
  payload?: TPayload | undefined;
  error?: QueueAdapterErrorEnvelope | undefined;
}>;

export type QueueAdapterDeadLetterEnvelope<
  TKind extends string = string,
  TPayload = unknown,
> = Readonly<{
  request: QueueAdapterRequestEnvelope<TKind, TPayload>;
  response?: QueueAdapterResponseEnvelope<TKind, unknown> | undefined;
  reason: string;
  'dead-lettered-at': string;
}>;

export type QueueMessageHandler<TMessage> = (
  message: TMessage,
  topic: string,
) => void | Promise<void>;

export type QueueSubscription = Readonly<{
  unsubscribe: () => void;
}>;

export interface QueueAdapterTransport {
  publish<TMessage>(topic: string, message: TMessage): Promise<void>;
  subscribe<TMessage>(
    topic: string,
    handler: QueueMessageHandler<TMessage>,
    options?: { concurrency?: number },
  ): QueueSubscription;
}

export type QueueAdapterObservability<TKind extends string> = Readonly<{
  onRequestPublished?: (
    request: QueueAdapterRequestEnvelope<TKind, unknown>,
    topics: QueueAdapterTopics<TKind>,
  ) => void;
  onResponseReceived?: (
    response: QueueAdapterResponseEnvelope<TKind, unknown>,
    topics: QueueAdapterTopics<TKind>,
  ) => void;
  onRetryScheduled?: (
    response: QueueAdapterResponseEnvelope<TKind, unknown>,
    retryRequest: QueueAdapterRequestEnvelope<TKind, unknown>,
    topics: QueueAdapterTopics<TKind>,
  ) => void;
  onDeadLetter?: (
    deadLetter: QueueAdapterDeadLetterEnvelope<TKind, unknown>,
    topics: QueueAdapterTopics<TKind>,
  ) => void;
}>;

export type QueueAdapterRequestInput<TPayload> = Readonly<{
  tenantId: TenantId | string;
  payload: TPayload;
  idempotencyKey?: string | undefined;
  correlationId?: RequestId | string | undefined;
  requestId?: RequestId | string | undefined;
  maxAttempts?: number | undefined;
  onPublished?: (
    request: QueueAdapterRequestEnvelope<string, TPayload>,
  ) => void | Promise<void>;
}>;

export type QueueRetryStrategy = (attempt: number) => number;

export type QueueJitterRetryStrategyOptions = Readonly<{
  baseDelayMs?: number | undefined;
  maxDelayMs?: number | undefined;
  jitterUnit?: number | undefined;
}>;

export type SgpQueueAdapterOptions<TKind extends string> = Readonly<{
  kind: TKind;
  transport: QueueAdapterTransport;
  maxAttempts?: number | undefined;
  responseTimeoutMs?: number | undefined;
  retryDelayMs?: QueueRetryStrategy | undefined;
  baseDelayMs?: number | undefined;
  maxDelayMs?: number | undefined;
  now?: (() => Date) | undefined;
  idFactory?: (() => string) | undefined;
  observability?: QueueAdapterObservability<TKind> | undefined;
}>;

type PendingRequest<TKind extends string> = {
  request: QueueAdapterRequestEnvelope<TKind, unknown>;
  resolve: (response: QueueAdapterResponseEnvelope<TKind, unknown>) => void;
  reject: (error: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type InternalSubscriber = {
  handler: QueueMessageHandler<unknown>;
  concurrency: number;
  active: number;
  closed: boolean;
  queue: Array<{ topic: string; message: unknown }>;
};

export class QueueAdapterDeliveryError<TKind extends string> extends Error {
  constructor(
    readonly request: QueueAdapterRequestEnvelope<TKind, unknown>,
    readonly response: QueueAdapterResponseEnvelope<TKind, unknown> | undefined,
    readonly deadLetter: QueueAdapterDeadLetterEnvelope<TKind, unknown>,
  ) {
    super(deadLetter.reason);
  }
}

export function linearRetryStrategy(attempt: number): number {
  return Math.max(0, Math.trunc(attempt)) * 100;
}

export function cappedExponentialJitterRetryStrategy(
  attempt: number,
  options: QueueJitterRetryStrategyOptions = {},
): number {
  const baseDelayMs = normalizeDelayMs(options.baseDelayMs ?? 250);
  const maxDelayMs = normalizeDelayMs(options.maxDelayMs ?? 30_000);
  const boundedAttempt = Number.isFinite(attempt) ? Math.trunc(attempt) : 1;
  const retryIndex = Math.max(0, boundedAttempt - 2);
  const exponentialDelayMs =
    baseDelayMs === 0 ? 0 : baseDelayMs * 2 ** retryIndex;
  const floorDelayMs = Math.min(exponentialDelayMs, maxDelayMs);
  const jitterRangeMs = Math.max(
    0,
    Math.min(maxDelayMs - floorDelayMs, Math.trunc(floorDelayMs * 0.2)),
  );
  const jitterUnit = normalizeJitterUnit(options.jitterUnit ?? Math.random());

  return floorDelayMs + Math.trunc(jitterRangeMs * jitterUnit);
}

export function adapterQueueTopics<TKind extends string>(
  kind: TKind,
): QueueAdapterTopics<TKind> {
  const normalizedKind = kind.trim();
  if (!normalizedKind) {
    throw new Error('Queue adapter kind must be non-empty.');
  }

  return {
    kind: normalizedKind as TKind,
    request: `sgp.adapter.${normalizedKind}.request`,
    response: `sgp.adapter.${normalizedKind}.response`,
    deadLetter: `sgp.adapter.${normalizedKind}.dlq`,
  };
}

export class InMemoryQueueTransport implements QueueAdapterTransport {
  private readonly subscribers = new Map<string, Set<InternalSubscriber>>();
  private readonly publishedMessages = new Map<string, unknown[]>();

  publish<TMessage>(topic: string, message: TMessage): Promise<void> {
    const history = this.publishedMessages.get(topic) ?? [];
    history.push(message);
    this.publishedMessages.set(topic, history);

    for (const subscriber of this.subscribers.get(topic) ?? []) {
      if (!subscriber.closed) {
        subscriber.queue.push({ topic, message });
        this.drainSubscriber(subscriber);
      }
    }

    return Promise.resolve();
  }

  subscribe<TMessage>(
    topic: string,
    handler: QueueMessageHandler<TMessage>,
    options: { concurrency?: number } = {},
  ): QueueSubscription {
    const subscriber: InternalSubscriber = {
      handler: (message, messageTopic) =>
        handler(message as TMessage, messageTopic),
      concurrency: Math.max(1, options.concurrency ?? 1),
      active: 0,
      closed: false,
      queue: [],
    };
    const topicSubscribers = this.subscribers.get(topic) ?? new Set();
    topicSubscribers.add(subscriber);
    this.subscribers.set(topic, topicSubscribers);

    return {
      unsubscribe: () => {
        subscriber.closed = true;
        topicSubscribers.delete(subscriber);
      },
    };
  }

  history<TMessage>(topic: string): readonly TMessage[] {
    return (this.publishedMessages.get(topic) ?? []) as readonly TMessage[];
  }

  depth(topic: string): number {
    return this.publishedMessages.get(topic)?.length ?? 0;
  }

  private drainSubscriber(subscriber: InternalSubscriber): void {
    while (
      !subscriber.closed &&
      subscriber.active < subscriber.concurrency &&
      subscriber.queue.length > 0
    ) {
      const next = subscriber.queue.shift();
      if (!next) return;

      subscriber.active += 1;
      Promise.resolve()
        .then(() => subscriber.handler(next.message, next.topic))
        .catch(() => undefined)
        .finally(() => {
          subscriber.active -= 1;
          this.drainSubscriber(subscriber);
        });
    }
  }
}

export class SgpQueueAdapter<TKind extends string> {
  readonly topics: QueueAdapterTopics<TKind>;

  private readonly transport: QueueAdapterTransport;
  private readonly maxAttempts: number;
  private readonly responseTimeoutMs: number;
  private readonly retryDelayMs: QueueRetryStrategy;
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private readonly observability?: QueueAdapterObservability<TKind> | undefined;
  private readonly pending = new Map<string, PendingRequest<TKind>>();
  private readonly responseSubscription: QueueSubscription;

  constructor(options: SgpQueueAdapterOptions<TKind>) {
    this.transport = options.transport;
    this.topics = adapterQueueTopics(options.kind);
    this.maxAttempts = options.maxAttempts ?? 3;
    this.responseTimeoutMs = options.responseTimeoutMs ?? 5_000;
    this.retryDelayMs =
      options.retryDelayMs ??
      ((attempt) =>
        cappedExponentialJitterRetryStrategy(attempt, {
          baseDelayMs: options.baseDelayMs,
          maxDelayMs: options.maxDelayMs,
        }));
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
    this.observability = options.observability;
    this.responseSubscription = this.transport.subscribe<
      QueueAdapterResponseEnvelope<TKind, unknown>
    >(this.topics.response, (response) => this.handleResponse(response), {
      concurrency: 32,
    });
  }

  async request<TPayload, TResponse = unknown>(
    input: QueueAdapterRequestInput<TPayload>,
  ): Promise<QueueAdapterResponseEnvelope<TKind, TResponse>> {
    const request = this.buildRequest(input);
    const responsePromise = new Promise<
      QueueAdapterResponseEnvelope<TKind, unknown>
    >((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(request['request-id']);
        reject(
          new Error(
            `Timed out waiting for adapter response ${request['request-id']}`,
          ),
        );
      }, this.responseTimeoutMs);

      this.pending.set(request['request-id'], {
        request,
        resolve,
        reject,
        timeout,
      });
    });

    await this.publishRequest(request);
    await input.onPublished?.(
      request as QueueAdapterRequestEnvelope<string, TPayload>,
    );
    return responsePromise as Promise<
      QueueAdapterResponseEnvelope<TKind, TResponse>
    >;
  }

  close(): void {
    this.responseSubscription.unsubscribe();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(
        new Error('Queue adapter closed before response arrived.'),
      );
    }
    this.pending.clear();
  }

  private buildRequest<TPayload>(
    input: QueueAdapterRequestInput<TPayload>,
  ): QueueAdapterRequestEnvelope<TKind, TPayload> {
    const nextRequestId = requestId(input.requestId ?? this.idFactory());
    const maxAttempts = input.maxAttempts ?? this.maxAttempts;
    if (maxAttempts < 1) {
      throw new Error('Queue adapter maxAttempts must be at least 1.');
    }

    return {
      'request-id': nextRequestId,
      'correlation-id': requestId(input.correlationId ?? nextRequestId),
      'idempotency-key': input.idempotencyKey ?? nextRequestId,
      'reply-to': this.topics.response,
      'dead-letter-topic': this.topics.deadLetter,
      'created-at': this.now().toISOString(),
      tenant_id: tenantId(input.tenantId),
      kind: this.topics.kind,
      payload: input.payload,
      attempt: 1,
      'max-attempts': maxAttempts,
    };
  }

  private async publishRequest(
    request: QueueAdapterRequestEnvelope<TKind, unknown>,
  ): Promise<void> {
    await this.transport.publish(this.topics.request, request);
    this.observability?.onRequestPublished?.(request, this.topics);
  }

  private handleResponse(
    response: QueueAdapterResponseEnvelope<TKind, unknown>,
  ): void {
    this.observability?.onResponseReceived?.(response, this.topics);
    const pending = this.pending.get(response['request-id']);
    if (!pending) return;

    if (response['correlation-id'] !== pending.request['correlation-id']) {
      this.rejectPending(
        pending,
        new Error(
          `Mismatched adapter correlation-id for ${response['request-id']}`,
        ),
      );
      return;
    }

    if (response.status === 'OK') {
      this.resolvePending(pending, response);
      return;
    }

    if (
      response.status === 'RETRY' &&
      pending.request.attempt < pending.request['max-attempts']
    ) {
      const retryRequest = {
        ...pending.request,
        attempt: pending.request.attempt + 1,
        'created-at': this.now().toISOString(),
      } satisfies QueueAdapterRequestEnvelope<TKind, unknown>;
      pending.request = retryRequest;
      this.observability?.onRetryScheduled?.(
        response,
        retryRequest,
        this.topics,
      );
      setTimeout(() => {
        this.publishRequest(retryRequest).catch((error: unknown) =>
          this.rejectPending(pending, error),
        );
      }, this.retryDelayMs(retryRequest.attempt));
      return;
    }

    const reason =
      response.status === 'DEAD_LETTER'
        ? (response.error?.message ?? 'Adapter request moved to dead letter.')
        : `Adapter request exceeded ${pending.request['max-attempts']} attempts.`;
    this.deadLetterPending(pending, response, reason).catch((error: unknown) =>
      this.rejectPending(pending, error),
    );
  }

  private resolvePending(
    pending: PendingRequest<TKind>,
    response: QueueAdapterResponseEnvelope<TKind, unknown>,
  ): void {
    clearTimeout(pending.timeout);
    this.pending.delete(pending.request['request-id']);
    pending.resolve(response);
  }

  private rejectPending(pending: PendingRequest<TKind>, error: unknown): void {
    clearTimeout(pending.timeout);
    this.pending.delete(pending.request['request-id']);
    pending.reject(error);
  }

  private async deadLetterPending(
    pending: PendingRequest<TKind>,
    response: QueueAdapterResponseEnvelope<TKind, unknown>,
    reason: string,
  ): Promise<void> {
    const deadLetter = {
      request: pending.request,
      response,
      reason,
      'dead-lettered-at': this.now().toISOString(),
    } satisfies QueueAdapterDeadLetterEnvelope<TKind, unknown>;
    this.observability?.onDeadLetter?.(deadLetter, this.topics);
    await this.transport.publish(this.topics.deadLetter, deadLetter);
    this.rejectPending(
      pending,
      new QueueAdapterDeliveryError(pending.request, response, deadLetter),
    );
  }
}

function normalizeDelayMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function normalizeJitterUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, 1));
}
