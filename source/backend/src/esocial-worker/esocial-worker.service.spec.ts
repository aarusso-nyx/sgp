import { ESocialDispatchAdapter } from './esocial-dispatch.adapter';
import { ESocialWorkerService } from './esocial-worker.service';

describe('ESocialWorkerService', () => {
  const event = {
    id: '11111111-1111-4111-8111-111111111111',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    event_type: 'S-2230',
    reference: 'employee/abc',
    competence: '2026-04',
    payload: { leaveId: 'leave-1' },
    schema_version: 'S-1.2',
    retry_count: 0,
  };

  it('processes pending events through XML storage and sandbox dispatch', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([{ id: event.id }])
      .mockResolvedValueOnce([]);

    const storeGeneratedObject = jest.fn().mockResolvedValue({
      storageKind: 'LOCAL',
      storageKey:
        '22222222-2222-4222-8222-222222222222/outputs/esocial/s-2230/2026/04/esocial-s-2230-11111111-1111-4111-8111-111111111111.xml',
      sizeBytes: 512,
      checksum: 'xml-checksum',
    });
    const dispatch = jest.fn().mockResolvedValue({
      mode: 'sandbox',
      accepted: true,
      receiptNumber: 'REC-SANDBOX-S2230-111111111111',
      protocolNumber: 'PROTO-SANDBOX-111111111111',
      responsePayload: { ambiente: 'sandbox' },
    });

    const service = new ESocialWorkerService(
      { configured: true, query } as never,
      { storeGeneratedObject } as never,
      { dispatch } as unknown as ESocialDispatchAdapter,
    );

    await expect(service.pollOnce(5)).resolves.toEqual({
      discovered: 1,
      processed: 1,
      failed: 0,
      skipped: 0,
    });
    expect(storeGeneratedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'application/xml',
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: event.id,
        eventType: 'S-2230',
        schemaVersion: 'S-1.2',
      }),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('PROCESSADO_COM_SUCESSO\'::"ESocialEventStatus"'),
      expect.arrayContaining([event.id, expect.any(String)]),
    );
  });

  it('persists retry metadata for invalid events', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([
        {
          ...event,
          event_type: 'INVALID',
        },
      ])
      .mockResolvedValueOnce([{ id: event.id }])
      .mockResolvedValueOnce([]);

    const service = new ESocialWorkerService(
      { configured: true, query } as never,
      { storeGeneratedObject: jest.fn() } as never,
      { dispatch: jest.fn() } as unknown as ESocialDispatchAdapter,
    );

    await expect(service.pollOnce(1)).resolves.toEqual({
      discovered: 1,
      processed: 0,
      failed: 1,
      skipped: 0,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('last_error_code'),
      [
        event.id,
        'ERRO_TECNICO_RETENTAVEL',
        'eSocial event_type must follow S-9999 format',
      ],
    );
  });

  it('reports status, skips unclaimed events, and bounds polling limits', async () => {
    await expect(
      new ESocialWorkerService(
        { configured: false } as never,
        { storeGeneratedObject: jest.fn() } as never,
        { dispatch: jest.fn() } as unknown as ESocialDispatchAdapter,
      ).status(),
    ).resolves.toMatchObject({
      checks: {
        database: 'not_configured',
        eventsByStatus: {},
      },
    });

    const query = jest
      .fn()
      .mockResolvedValueOnce([{ status: 'PENDENTE', total: '2' }])
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([]);
    const service = new ESocialWorkerService(
      { configured: true, query } as never,
      { storeGeneratedObject: jest.fn() } as never,
      { dispatch: jest.fn() } as unknown as ESocialDispatchAdapter,
    );

    await expect(service.status()).resolves.toMatchObject({
      checks: { database: 'configured', eventsByStatus: { PENDENTE: 2 } },
    });
    await expect(service.pollOnce(0)).resolves.toEqual({
      discovered: 1,
      processed: 0,
      failed: 0,
      skipped: 1,
    });
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [10]);
  });

  it('marks definitive failures and rejects invalid runtime state', async () => {
    const baseQuery = jest
      .fn()
      .mockResolvedValueOnce([
        {
          ...event,
          reference: '',
          retry_count: 2,
        },
      ])
      .mockResolvedValueOnce([{ id: event.id }])
      .mockResolvedValueOnce([]);
    await expect(
      new ESocialWorkerService(
        { configured: true, query: baseQuery } as never,
        { storeGeneratedObject: jest.fn() } as never,
        { dispatch: jest.fn() } as unknown as ESocialDispatchAdapter,
      ).pollOnce(1),
    ).resolves.toMatchObject({ failed: 1 });
    expect(baseQuery).toHaveBeenCalledWith(
      expect.stringContaining('last_error_code'),
      [event.id, 'ERRO_DEFINITIVO', 'eSocial reference is required'],
    );

    for (const invalid of [
      {
        competence: '2026-13',
        message: 'eSocial competence must use YYYY-MM format',
      },
      {
        schema_version: 'S-1.1',
        message: 'Only eSocial schema S-1.2 and S-1.3 are supported',
      },
      { payload: [] as never, message: 'eSocial payload must be an object' },
    ]) {
      const query = jest
        .fn()
        .mockResolvedValueOnce([{ ...event, ...invalid }])
        .mockResolvedValueOnce([{ id: event.id }])
        .mockResolvedValueOnce([]);
      await expect(
        new ESocialWorkerService(
          { configured: true, query } as never,
          { storeGeneratedObject: jest.fn() } as never,
          { dispatch: jest.fn() } as unknown as ESocialDispatchAdapter,
        ).pollOnce(1),
      ).resolves.toMatchObject({ failed: 1 });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('last_error_code'),
        [event.id, 'ERRO_TECNICO_RETENTAVEL', invalid.message],
      );
    }

    await expect(
      new ESocialWorkerService(
        { configured: false } as never,
        { storeGeneratedObject: jest.fn() } as never,
        { dispatch: jest.fn() } as unknown as ESocialDispatchAdapter,
      ).pollOnce(),
    ).rejects.toThrow('DATABASE_URL is required');
  });
});
