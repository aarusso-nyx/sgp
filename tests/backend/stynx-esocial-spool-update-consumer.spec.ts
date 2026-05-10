import { StynxEsocialEventsUpdateConsumer } from '../../backend/src/integrations/stynx-esocial/spool-update-consumer.service';

const tenantId = '00000000-0000-4000-8000-000000060801';
const messageId = '00000000-0000-4000-8000-000000060802';

describe('StynxEsocialEventsUpdateConsumer', () => {
  it('applies ACCEPTED spool updates through EsocialEventsService', async () => {
    const spoolService = {
      findById: jest.fn().mockResolvedValue({ status: 'SENT' }),
      recordResponse: jest.fn().mockResolvedValue({ status: 'ACCEPTED' }),
      recordSent: jest.fn(),
      recordError: jest.fn(),
    };
    const consumer = new StynxEsocialEventsUpdateConsumer(
      spoolService as never,
    );

    await expect(
      consumer.handle({
        tenant_id: tenantId,
        message_id: messageId,
        kind: 'submit',
        status_transition: {
          from: 'SENT',
          to: 'ACCEPTED',
        },
        response_payload: { receiptNumber: '1.1.1' },
        response_hash:
          '451b8de5e3db8ac4d42723254fe9545038a1e4e6bc2dcbce57c050ee2ed8bc92',
        occurred_at: '2026-05-04T12:00:00.000Z',
      }),
    ).resolves.toEqual({
      applied: true,
      idempotencyKey: `spool:${messageId}:SENT>ACCEPTED`,
    });

    expect(spoolService.recordResponse).toHaveBeenCalledWith({
      tenantId,
      messageId,
      status: 'ACCEPTED',
      response: { receiptNumber: '1.1.1' },
      responseHash:
        '451b8de5e3db8ac4d42723254fe9545038a1e4e6bc2dcbce57c050ee2ed8bc92',
    });
  });

  it('skips idempotent duplicate transitions', async () => {
    const spoolService = {
      findById: jest.fn().mockResolvedValue({ status: 'ACCEPTED' }),
      recordResponse: jest.fn(),
      recordSent: jest.fn(),
      recordError: jest.fn(),
    };
    const consumer = new StynxEsocialEventsUpdateConsumer(
      spoolService as never,
    );

    await expect(
      consumer.handle({
        tenant_id: tenantId,
        message_id: messageId,
        kind: 'submit',
        status_transition: {
          from: 'SENT',
          to: 'ACCEPTED',
        },
        occurred_at: '2026-05-04T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({ applied: false });
    expect(spoolService.recordResponse).not.toHaveBeenCalled();
  });

  it('handles sent, received, error, and unsupported transitions', async () => {
    const spoolService = {
      findById: jest.fn().mockResolvedValue(null),
      recordResponse: jest.fn().mockResolvedValue({}),
      recordSent: jest.fn().mockResolvedValue({}),
      recordError: jest.fn().mockResolvedValue({}),
    };
    const consumer = new StynxEsocialEventsUpdateConsumer(
      spoolService as never,
    );

    await expect(
      consumer.handle({
        tenant_id: tenantId,
        message_id: messageId,
        kind: 'submit',
        status_transition: { to: 'SENT' },
        occurred_at: '2026-05-04T12:00:00.000Z',
      }),
    ).resolves.toEqual({
      applied: true,
      idempotencyKey: `spool:${messageId}:NONE>SENT`,
    });

    await expect(
      consumer.handle({
        tenant_id: tenantId,
        message_id: messageId,
        kind: 'submit',
        status_transition: { from: 'SENT', to: 'RECEIVED' },
        occurred_at: '2026-05-04T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({ applied: true });

    await expect(
      consumer.handle({
        tenant_id: tenantId,
        message_id: messageId,
        kind: 'submit',
        status_transition: { from: 'RECEIVED', to: 'RETRY' },
        response_payload: { code: 'E' },
        occurred_at: '2026-05-04T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({ applied: true });

    await expect(
      consumer.handle({
        tenant_id: tenantId,
        message_id: messageId,
        kind: 'submit',
        status_transition: { from: 'RETRY', to: 'DLQ' },
        error: { code: 'DLQ', message: 'dead letter' },
        response_hash:
          '451b8de5e3db8ac4d42723254fe9545038a1e4e6bc2dcbce57c050ee2ed8bc92',
        occurred_at: '2026-05-04T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({ applied: true });

    await expect(
      consumer.handle({
        tenant_id: tenantId,
        message_id: messageId,
        kind: 'submit',
        status_transition: { from: 'DLQ', to: 'QUEUED' as never },
        occurred_at: '2026-05-04T12:00:00.000Z',
      }),
    ).resolves.toMatchObject({ applied: false });

    expect(spoolService.recordSent).toHaveBeenCalledWith({
      tenantId,
      messageId,
    });
    expect(spoolService.recordResponse).toHaveBeenCalledWith({
      tenantId,
      messageId,
      status: 'RECEIVED',
      response: {},
    });
    expect(spoolService.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'RETRY',
        error: {
          code: 'STYNX_ESOCIAL_RETRY',
          message: 'stynx-esocial transitioned message to RETRY',
        },
        response: { code: 'E' },
      }),
    );
    expect(spoolService.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DLQ',
        error: { code: 'DLQ', message: 'dead letter' },
        responseHash:
          '451b8de5e3db8ac4d42723254fe9545038a1e4e6bc2dcbce57c050ee2ed8bc92',
      }),
    );
  });
});
