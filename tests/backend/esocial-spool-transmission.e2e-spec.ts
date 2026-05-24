import type {
  EsocialEventsRecord,
  EsocialEventsStatus,
} from '../../backend/src/esocial-events';
import { SgpEsocialTransmissionService } from '../../backend/src/integrations/stynx-esocial/sgp-esocial-transmission.service';

const tenantId = '00000000-0000-4000-8000-000000064001';
const messageId = '00000000-0000-4000-8000-000000064101';

describe('eSocial spool transmission sandbox flow', () => {
  it('signs a pending payload, transmits through the sandbox adapter, and reconciles the receipt', async () => {
    const events = fakeEventsService([
      spoolRow({
        payload: {
          producer: 'sgp',
          eventClass: 'S-1299',
          data: { payrollRunId: 'run-2026-05' },
        },
      }),
    ]);
    const service = new SgpEsocialTransmissionService(events as never);

    await expect(
      service.transmit({
        tenantId,
        messageId,
        signedAt: '2026-05-24T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({
      messageId,
      tenantId,
      eventClass: 'S-1299',
      status: 'ACCEPTED',
      attempt: 1,
      receipt: expect.stringMatching(/^REC-/),
    });

    expect(events.recordSent).toHaveBeenCalledWith({ tenantId, messageId });
    expect(events.recordResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        messageId,
        status: 'ACCEPTED',
        response: expect.objectContaining({
          signing: expect.objectContaining({
            profile: 'SGP-ESOCIAL-SANDBOX-XMLDSIG',
            signedAt: '2026-05-24T12:00:00.000Z',
          }),
          transport: expect.objectContaining({
            adapter: 'sgp-esocial-sandbox-serpro',
            outcome: 'ACCEPTED',
          }),
        }),
      }),
    );
  });

  it('retries a transient adapter error and succeeds on the next pending pass', async () => {
    const retryMessageId = '00000000-0000-4000-8000-000000064102';
    const events = fakeEventsService(
      [
        spoolRow({
          messageId: retryMessageId,
          payload: { data: { forceTransientError: true } },
          maxAttempts: 3,
        }),
      ],
      {
        clearTransientErrorAfterRetry: true,
      },
    );
    const service = new SgpEsocialTransmissionService(events as never);

    await expect(service.processPending(tenantId, 1)).resolves.toMatchObject([
      { messageId: retryMessageId, status: 'RETRY', attempt: 1 },
    ]);
    await expect(service.processPending(tenantId, 1)).resolves.toMatchObject([
      { messageId: retryMessageId, status: 'ACCEPTED', attempt: 2 },
    ]);
  });

  it('deduplicates duplicate enqueue attempts before transmission', async () => {
    const events = fakeEventsService([]);

    const first = await events.recordPending({
      tenantId,
      kind: 'submit',
      eventClass: 'S-2200',
      sourceRef: { employeeId: 'emp-1' },
      payload: { employeeId: 'emp-1', registration: '100' },
    });
    const duplicate = await events.recordPending({
      tenantId,
      kind: 'submit',
      eventClass: 'S-2200',
      sourceRef: { employeeId: 'emp-1' },
      payload: { registration: '100', employeeId: 'emp-1' },
    });

    expect(duplicate.messageId).toBe(first.messageId);
    expect(events.rows()).toHaveLength(1);

    const service = new SgpEsocialTransmissionService(events as never);
    await expect(service.processPending(tenantId, 10)).resolves.toHaveLength(1);
    expect(events.rows()[0]).toMatchObject({
      messageId: first.messageId,
      status: 'ACCEPTED',
      attempt: 1,
    });
  });

  it('moves terminal transport failures to manual-review DLQ without corrupting the queue', async () => {
    const dlqMessageId = '00000000-0000-4000-8000-000000064103';
    const acceptedMessageId = '00000000-0000-4000-8000-000000064104';
    const events = fakeEventsService([
      spoolRow({
        messageId: dlqMessageId,
        attempt: 2,
        maxAttempts: 3,
        payload: { data: { forceTransientError: true } },
      }),
      spoolRow({
        messageId: acceptedMessageId,
        payload: { data: { payrollRunId: 'run-ok' } },
      }),
    ]);
    const service = new SgpEsocialTransmissionService(events as never);

    await expect(service.processPending(tenantId, 10)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          messageId: dlqMessageId,
          status: 'DLQ',
          attempt: 3,
        }),
        expect.objectContaining({
          messageId: acceptedMessageId,
          status: 'ACCEPTED',
          attempt: 1,
        }),
      ]),
    );

    expect(events.rows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          messageId: dlqMessageId,
          status: 'DLQ',
          error: expect.objectContaining({
            code: 'ESOCIAL_RETRY_EXHAUSTED',
          }),
        }),
        expect.objectContaining({
          messageId: acceptedMessageId,
          status: 'ACCEPTED',
        }),
      ]),
    );
  });
});

type RecordPendingInput = Readonly<{
  tenantId: string;
  kind: EsocialEventsRecord['kind'];
  eventClass: string;
  sourceRef?: EsocialEventsRecord['sourceRef'];
  payload: EsocialEventsRecord['payload'];
}>;

function fakeEventsService(
  initialRows: EsocialEventsRecord[],
  options: { clearTransientErrorAfterRetry?: boolean } = {},
) {
  const rows = new Map(initialRows.map((entry) => [entry.messageId, entry]));
  let nextId = 900;
  const service = {
    rows: () => [...rows.values()],
    recordPending: jest.fn(
      async (input: RecordPendingInput): Promise<EsocialEventsRecord> => {
        const payloadHash = stableHash(input.payload);
        const existing = [...rows.values()].find(
          (entry) =>
            entry.tenantId === input.tenantId &&
            entry.kind === input.kind &&
            entry.eventClass === input.eventClass &&
            entry.payloadHash === payloadHash &&
            !['REJECTED', 'DLQ'].includes(entry.status),
        );
        if (existing) return existing;
        nextId += 1;
        const created = spoolRow({
          messageId: `00000000-0000-4000-8000-${String(nextId).padStart(12, '0')}`,
          tenantId: input.tenantId,
          kind: input.kind,
          eventClass: input.eventClass,
          sourceRef: input.sourceRef ?? {},
          payload: input.payload,
          payloadHash,
        });
        rows.set(created.messageId, created);
        return created;
      },
    ),
    findById: jest.fn((rowTenantId: string, rowMessageId: string) =>
      Promise.resolve(
        rows.get(rowMessageId)?.tenantId === rowTenantId
          ? rows.get(rowMessageId)
          : null,
      ),
    ),
    findByTenant: jest.fn(
      (
        rowTenantId: string,
        filters: { status?: EsocialEventsStatus; limit?: number },
      ) =>
        Promise.resolve(
          [...rows.values()]
            .filter(
              (entry) =>
                entry.tenantId === rowTenantId &&
                (!filters.status || entry.status === filters.status),
            )
            .slice(0, filters.limit ?? 100),
        ),
    ),
    recordSent: jest.fn(
      async (input: {
        tenantId: string;
        messageId: string;
      }): Promise<EsocialEventsRecord> => {
        const current = requireRow(rows, input.tenantId, input.messageId);
        const updated = {
          ...current,
          status: 'SENT' as const,
          attempt: current.attempt + 1,
          sentAt: '2026-05-24T12:01:00.000Z',
        };
        rows.set(input.messageId, updated);
        return updated;
      },
    ),
    recordResponse: jest.fn(async (input) => {
      const current = requireRow(rows, input.tenantId, input.messageId);
      const updated = {
        ...current,
        status: input.status ?? 'ACCEPTED',
        response: input.response,
        responseHash: input.responseHash ?? stableHash(input.response),
        receivedAt: '2026-05-24T12:02:00.000Z',
        terminalAt:
          input.status === 'RECEIVED' ? null : '2026-05-24T12:02:00.000Z',
      } as EsocialEventsRecord;
      rows.set(input.messageId, updated);
      return updated;
    }),
    recordError: jest.fn(async (input) => {
      const current = requireRow(rows, input.tenantId, input.messageId);
      const payload =
        options.clearTransientErrorAfterRetry && input.status === 'RETRY'
          ? removeTransientFlag(current.payload)
          : current.payload;
      const updated = {
        ...current,
        status: input.status,
        payload,
        error: input.error,
        response: input.response ?? current.response,
        responseHash: input.responseHash ?? current.responseHash,
        receivedAt: '2026-05-24T12:02:00.000Z',
        terminalAt:
          input.status === 'RETRY' ? null : '2026-05-24T12:02:00.000Z',
      } as EsocialEventsRecord;
      rows.set(input.messageId, updated);
      return updated;
    }),
  };
  return service;
}

function requireRow(
  rows: Map<string, EsocialEventsRecord>,
  rowTenantId: string,
  rowMessageId: string,
): EsocialEventsRecord {
  const row = rows.get(rowMessageId);
  if (!row || row.tenantId !== rowTenantId) {
    throw new Error(`eSocial spool row not found: ${rowMessageId}`);
  }
  return row;
}

function removeTransientFlag(payload: EsocialEventsRecord['payload']) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const root = { ...payload };
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    root.data = { ...root.data, forceTransientError: false };
  }
  return root;
}

function spoolRow(
  overrides: Partial<EsocialEventsRecord> = {},
): EsocialEventsRecord {
  return {
    messageId,
    tenantId,
    kind: 'submit',
    eventClass: 'S-1299',
    sourceRef: { sourceEntityKind: 'payroll.run' },
    payload: { producer: 'sgp', eventClass: 'S-1299', data: {} },
    payloadHash: 'payload-hash',
    response: null,
    responseHash: null,
    status: 'PENDING',
    attempt: 0,
    maxAttempts: 3,
    error: null,
    createdAt: '2026-05-24T12:00:00.000Z',
    sentAt: null,
    receivedAt: null,
    terminalAt: null,
    actorSub: null,
    actorLogin: null,
    requestId: null,
    ...overrides,
  };
}

function stableHash(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort());
}
