import type {
  EsocialEventsRecord,
  EsocialEventsStatus,
} from '../../esocial-events';
import { SgpEsocialTransmissionService } from './sgp-esocial-transmission.service';

const TENANT_ID = '00000000-0000-4000-8000-000000000001';
const MESSAGE_ID = '00000000-0000-4000-8000-000000000101';

describe('SgpEsocialTransmissionService', () => {
  it('signs, transmits, and records accepted spool rows', async () => {
    const events = fakeEventsService([
      row({
        payload: { producer: 'sgp', eventClass: 'S-1000', data: { code: 'A' } },
      }),
    ]);
    const service = new SgpEsocialTransmissionService(events as never);

    const result = await service.transmit({
      tenantId: TENANT_ID,
      messageId: MESSAGE_ID,
      signedAt: '2026-05-10T12:00:00.000Z',
    });

    expect(result).toMatchObject({
      messageId: MESSAGE_ID,
      status: 'ACCEPTED',
      attempt: 1,
      receipt: expect.stringMatching(/^REC-/),
    });
    expect(events.recordSent).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      messageId: MESSAGE_ID,
    });
    expect(events.recordResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        messageId: MESSAGE_ID,
        status: 'ACCEPTED',
        response: expect.objectContaining({
          signing: expect.objectContaining({
            profile: 'SGP-ESOCIAL-SANDBOX-XMLDSIG',
            algorithm: 'SHA256-RSA-SANDBOX',
            signedAt: '2026-05-10T12:00:00.000Z',
          }),
          transport: expect.objectContaining({
            adapter: 'sgp-esocial-sandbox-serpro',
            outcome: 'ACCEPTED',
          }),
        }),
      }),
    );
  });

  it('records retryable transport errors before retry exhaustion', async () => {
    const events = fakeEventsService([
      row({
        payload: { data: { forceTransientError: true } },
        maxAttempts: 3,
      }),
    ]);
    const service = new SgpEsocialTransmissionService(events as never);

    const result = await service.transmit({
      tenantId: TENANT_ID,
      messageId: MESSAGE_ID,
    });

    expect(result.status).toBe('RETRY');
    expect(events.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'RETRY',
        error: expect.objectContaining({ code: 'ESOCIAL_RETRY' }),
      }),
    );
  });

  it('moves transient failures to DLQ after max attempts', async () => {
    const events = fakeEventsService([
      row({
        attempt: 2,
        maxAttempts: 3,
        payload: { data: { forceTransientError: true } },
      }),
    ]);
    const service = new SgpEsocialTransmissionService(events as never);

    const result = await service.transmit({
      tenantId: TENANT_ID,
      messageId: MESSAGE_ID,
    });

    expect(result).toMatchObject({ status: 'DLQ', attempt: 3 });
    expect(events.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DLQ',
        error: expect.objectContaining({ code: 'ESOCIAL_RETRY_EXHAUSTED' }),
      }),
    );
  });

  it('records definitive validation rejection as terminal rejected', async () => {
    const events = fakeEventsService([
      row({ payload: { data: { forceReject: true } } }),
    ]);
    const service = new SgpEsocialTransmissionService(events as never);

    const result = await service.transmit({
      tenantId: TENANT_ID,
      messageId: MESSAGE_ID,
    });

    expect(result.status).toBe('REJECTED');
    expect(events.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'REJECTED',
        error: expect.objectContaining({ code: 'ESOCIAL_REJECTED' }),
      }),
    );
  });

  it('does not retransmit terminal rows', async () => {
    const events = fakeEventsService([row({ status: 'ACCEPTED', attempt: 1 })]);
    const service = new SgpEsocialTransmissionService(events as never);

    const result = await service.transmit({
      tenantId: TENANT_ID,
      messageId: MESSAGE_ID,
    });

    expect(result).toMatchObject({ status: 'ACCEPTED', skipped: true });
    expect(events.recordSent).not.toHaveBeenCalled();
  });

  it('processes pending and retry rows up to the requested limit', async () => {
    const first = row({ messageId: MESSAGE_ID, status: 'PENDING' });
    const second = row({
      messageId: '00000000-0000-4000-8000-000000000102',
      status: 'RETRY',
      payload: { data: { forceTransientError: true } },
    });
    const events = fakeEventsService([first, second]);
    const service = new SgpEsocialTransmissionService(events as never);

    const results = await service.processPending(TENANT_ID, 2);

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.status)).toEqual([
      'ACCEPTED',
      'RETRY',
    ]);
  });
});

function fakeEventsService(initialRows: EsocialEventsRecord[]) {
  const rows = new Map(initialRows.map((entry) => [entry.messageId, entry]));
  const service = {
    findById: jest.fn((tenantId: string, messageId: string) =>
      Promise.resolve(
        rows.get(messageId)?.tenantId === tenantId ? rows.get(messageId) : null,
      ),
    ),
    findByTenant: jest.fn(
      (
        tenantId: string,
        filters: { status?: EsocialEventsStatus; limit?: number },
      ) =>
        Promise.resolve(
          [...rows.values()]
            .filter(
              (entry) =>
                entry.tenantId === tenantId &&
                (!filters.status || entry.status === filters.status),
            )
            .slice(0, filters.limit ?? 100),
        ),
    ),
    recordSent: jest.fn(
      ({
        tenantId,
        messageId,
      }: {
        tenantId: string;
        messageId: string;
      }): Promise<EsocialEventsRecord> => {
        const current = rows.get(messageId);
        if (!current || current.tenantId !== tenantId) {
          throw new Error(`row not found: ${messageId}`);
        }
        const updated = {
          ...current,
          status: 'SENT' as const,
          attempt: current.attempt + 1,
          sentAt: '2026-05-10T12:00:00.000Z',
        };
        rows.set(messageId, updated);
        return Promise.resolve(updated);
      },
    ),
    recordResponse: jest.fn((input) => {
      const current = rows.get(input.messageId);
      const updated = {
        ...current,
        status: input.status,
        response: input.response,
        receivedAt: '2026-05-10T12:01:00.000Z',
        terminalAt: '2026-05-10T12:01:00.000Z',
      } as EsocialEventsRecord;
      rows.set(input.messageId, updated);
      return Promise.resolve(updated);
    }),
    recordError: jest.fn((input) => {
      const current = rows.get(input.messageId);
      const updated = {
        ...current,
        status: input.status,
        error: input.error,
        response: input.response ?? current?.response ?? null,
        receivedAt: '2026-05-10T12:01:00.000Z',
        terminalAt:
          input.status === 'RETRY'
            ? (current?.terminalAt ?? null)
            : '2026-05-10T12:01:00.000Z',
      } as EsocialEventsRecord;
      rows.set(input.messageId, updated);
      return Promise.resolve(updated);
    }),
  };
  return service;
}

function row(
  overrides: Partial<EsocialEventsRecord> = {},
): EsocialEventsRecord {
  return {
    messageId: MESSAGE_ID,
    tenantId: TENANT_ID,
    kind: 'tabelas',
    eventClass: 'S-1000',
    sourceRef: { sourceEntityKind: 'hr.company' },
    payload: { producer: 'sgp', eventClass: 'S-1000', data: {} },
    payloadHash: 'payload-hash',
    response: null,
    responseHash: null,
    status: 'PENDING',
    attempt: 0,
    maxAttempts: 3,
    error: null,
    createdAt: '2026-05-10T11:59:00.000Z',
    sentAt: null,
    receivedAt: null,
    terminalAt: null,
    actorSub: null,
    actorLogin: null,
    requestId: null,
    ...overrides,
  };
}
