import {
  adapterQueueTopics,
  cappedExponentialJitterRetryStrategy,
  InMemoryQueueTransport,
  linearRetryStrategy,
  QueueAdapterDeliveryError,
  type QueueAdapterDeadLetterEnvelope,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueRetryStrategy,
  SgpQueueAdapter,
} from './queue-adapter';
import {
  ReferenceMockResponder,
  type ReferenceMockPayload,
  type ReferenceMockResponsePayload,
} from '../../external/mocks/_reference';
import { TEST_INSTANT_2026_05_04T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('queue retry strategies', () => {
  it('keeps capped exponential jitter inside the configured floor and range', () => {
    expect(
      cappedExponentialJitterRetryStrategy(2, {
        jitterUnit: 0,
      }),
    ).toBe(250);
    expect(
      cappedExponentialJitterRetryStrategy(2, {
        jitterUnit: 0.5,
      }),
    ).toBe(275);
    expect(
      cappedExponentialJitterRetryStrategy(2, {
        jitterUnit: 1,
      }),
    ).toBe(300);
  });

  it('caps high retry attempts at the configured maximum delay', () => {
    expect(
      cappedExponentialJitterRetryStrategy(20, {
        jitterUnit: 0,
      }),
    ).toBe(30_000);
    expect(
      cappedExponentialJitterRetryStrategy(20, {
        jitterUnit: 1,
      }),
    ).toBe(30_000);
  });

  it('keeps the deterministic linear retry strategy available for injection', () => {
    expect(linearRetryStrategy(0)).toBe(0);
    expect(linearRetryStrategy(2)).toBe(200);
    expect(linearRetryStrategy(5)).toBe(500);
  });
});

describe('SGP adapter mock queue contract', () => {
  const kind = 'reference' as const;
  const topics = adapterQueueTopics(kind);
  const fixedNow = () => new Date(TEST_INSTANT_2026_05_04T00_00_00_000Z);

  let transport: InMemoryQueueTransport;
  let adapter: SgpQueueAdapter<typeof kind>;
  let responder: ReferenceMockResponder<typeof kind>;

  afterEach(() => {
    adapter?.close();
    responder?.close();
  });

  function setup(
    transientFailuresBeforeSuccess = 1,
    retryDelayMs: QueueRetryStrategy = () => 0,
  ): void {
    transport = new InMemoryQueueTransport();
    responder = new ReferenceMockResponder({
      kind,
      transport,
      concurrency: 8,
      transientFailuresBeforeSuccess,
      now: fixedNow,
    });
    adapter = new SgpQueueAdapter({
      kind,
      transport,
      retryDelayMs,
      responseTimeoutMs: 1_000,
      now: fixedNow,
    });
  }

  it('publishes a request envelope and resolves a correlated response envelope', async () => {
    setup();

    const response = await adapter.request<
      ReferenceMockPayload,
      ReferenceMockResponsePayload
    >({
      tenantId: 'tenant-a',
      idempotencyKey: 'tenant-a:echo:1',
      correlationId: 'corr-echo-1',
      payload: { action: 'echo', value: { amount: 42 } },
    });

    expect(response).toEqual(
      expect.objectContaining({
        'correlation-id': 'corr-echo-1',
        tenant_id: 'tenant-a',
        kind,
        status: 'OK',
        attempt: 1,
        payload: {
          echoed: { amount: 42 },
          attempt: 1,
          handledBy: 'reference-mock-responder',
        },
      }),
    );

    const [request] = transport.history<
      QueueAdapterRequestEnvelope<typeof kind, ReferenceMockPayload>
    >(topics.request);
    expect(request).toEqual(
      expect.objectContaining({
        'request-id': expect.any(String),
        'correlation-id': 'corr-echo-1',
        'idempotency-key': 'tenant-a:echo:1',
        'reply-to': topics.response,
        'dead-letter-topic': topics.deadLetter,
        tenant_id: 'tenant-a',
        kind,
        payload: { action: 'echo', value: { amount: 42 } },
        attempt: 1,
        'max-attempts': 3,
      }),
    );
  });

  it('retries transient responses with the same correlation and idempotency keys', async () => {
    setup(1);

    const response = await adapter.request<
      ReferenceMockPayload,
      ReferenceMockResponsePayload
    >({
      tenantId: 'tenant-a',
      idempotencyKey: 'tenant-a:transient:1',
      correlationId: 'corr-transient-1',
      payload: { action: 'transient-then-ok', value: 'accepted' },
    });

    expect(response.status).toBe('OK');
    expect(response.payload).toEqual({
      echoed: 'accepted',
      attempt: 2,
      handledBy: 'reference-mock-responder',
    });

    const requests = transport.history<
      QueueAdapterRequestEnvelope<typeof kind, ReferenceMockPayload>
    >(topics.request);
    const responses = transport.history<
      QueueAdapterResponseEnvelope<typeof kind>
    >(topics.response);
    expect(requests.map((request) => request.attempt)).toEqual([1, 2]);
    expect(
      requests.map((request) => [
        request['correlation-id'],
        request['idempotency-key'],
      ]),
    ).toEqual([
      ['corr-transient-1', 'tenant-a:transient:1'],
      ['corr-transient-1', 'tenant-a:transient:1'],
    ]);
    expect(responses.map((retryResponse) => retryResponse.status)).toEqual([
      'RETRY',
      'OK',
    ]);
  });

  it('uses an injected deterministic strategy when scheduling retries', async () => {
    const retryDelayMs = jest.fn(() => 0);
    setup(1, retryDelayMs);

    const response = await adapter.request<
      ReferenceMockPayload,
      ReferenceMockResponsePayload
    >({
      tenantId: 'tenant-a',
      idempotencyKey: 'tenant-a:deterministic-retry:1',
      correlationId: 'corr-deterministic-retry-1',
      payload: { action: 'transient-then-ok', value: 'accepted' },
    });

    expect(response.status).toBe('OK');
    expect(retryDelayMs).toHaveBeenCalledTimes(1);
    expect(retryDelayMs).toHaveBeenCalledWith(2);
  });

  it('moves exhausted retry requests to the dead-letter topic', async () => {
    setup();

    await expect(
      adapter.request<ReferenceMockPayload, ReferenceMockResponsePayload>({
        tenantId: 'tenant-a',
        idempotencyKey: 'tenant-a:dlq:1',
        correlationId: 'corr-dlq-1',
        maxAttempts: 2,
        payload: { action: 'always-retry', value: 'never accepted' },
      }),
    ).rejects.toBeInstanceOf(QueueAdapterDeliveryError);

    const requests = transport.history<
      QueueAdapterRequestEnvelope<typeof kind, ReferenceMockPayload>
    >(topics.request);
    const deadLetters = transport.history<
      QueueAdapterDeadLetterEnvelope<typeof kind>
    >(topics.deadLetter);

    expect(requests.map((request) => request.attempt)).toEqual([1, 2]);
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toEqual(
      expect.objectContaining({
        reason: 'Reference mock exhausted adapter attempts.',
        request: expect.objectContaining({
          'correlation-id': 'corr-dlq-1',
          attempt: 2,
          'max-attempts': 2,
        }),
        response: expect.objectContaining({
          status: 'DEAD_LETTER',
          error: expect.objectContaining({
            code: 'REFERENCE_DEAD_LETTER',
          }),
        }),
      }),
    );
  });

  it('keeps concurrent responses matched by request id and correlation id', async () => {
    setup();

    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        adapter.request<ReferenceMockPayload, ReferenceMockResponsePayload>({
          tenantId: 'tenant-a',
          idempotencyKey: `tenant-a:concurrent:${index}`,
          correlationId: `corr-concurrent-${index}`,
          payload: {
            action: 'echo',
            value: index,
            delayMs: index % 3 === 0 ? 5 : 0,
          },
        }),
      ),
    );

    const byCorrelation = new Map(
      responses.map((response) => [response['correlation-id'], response]),
    );

    for (let index = 0; index < 12; index += 1) {
      const response = byCorrelation.get(`corr-concurrent-${index}`);
      expect(response?.status).toBe('OK');
      expect(response?.payload?.echoed).toBe(index);
    }

    const requestIds = new Set(
      responses.map((response) => response['request-id']),
    );
    expect(requestIds.size).toBe(12);
  });
});
