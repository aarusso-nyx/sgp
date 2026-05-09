import { RequestContextStore } from '../../backend/src/common/request-context/request-context.store';
import { DetProjectionService } from '../../backend/src/det';

const tenantId = '00000000-0000-4000-8000-000000070801';
const messageId = '00000000-0000-4000-8000-000000070802';
const receivedAt = '2026-05-08T12:00:00.000Z';
const createdAt = '2026-05-08T12:00:01.000Z';

const row = {
  id: messageId,
  tenant_id: tenantId,
  external_message_id: 'DET-2026-0001',
  subject: 'Fiscal notice',
  sender: 'SIT',
  received_at: receivedAt,
  due_at: null,
  read_at: null,
  acknowledged_at: null,
  status: 'UNREAD',
  source_payload: { normalized: true },
  latest_update_payload: { normalized: true },
  annotation: null,
  created_at: createdAt,
  updated_at: createdAt,
} as const;

describe('DetProjectionService', () => {
  it('lists tenant-local inbox projection rows by status', async () => {
    const query = jest.fn().mockResolvedValueOnce([row]);
    const service = new DetProjectionService({ query } as never);

    await expect(service.list({ status: 'UNREAD' })).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: messageId,
          tenantId,
          externalMessageId: 'DET-2026-0001',
          status: 'UNREAD',
          receivedAt: receivedAt,
        }),
      ],
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM fiscal.det_message_projection'),
      ['UNREAD'],
    );
  });

  it('upserts inbox updates from the future stynx-det boundary', async () => {
    const query = jest.fn().mockResolvedValueOnce([row]);
    const service = new DetProjectionService({ query } as never);

    await expect(
      service.applyInboxUpdate({
        externalMessageId: 'DET-2026-0001',
        subject: 'Fiscal notice',
        sender: 'SIT',
        receivedAt,
        status: 'UNREAD',
        payload: { normalized: true },
      }),
    ).resolves.toMatchObject({
      id: messageId,
      externalMessageId: 'DET-2026-0001',
      status: 'UNREAD',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (tenant_id, external_message_id)'),
      [
        'DET-2026-0001',
        'Fiscal notice',
        'SIT',
        receivedAt,
        null,
        null,
        null,
        'UNREAD',
        JSON.stringify({ normalized: true }),
      ],
    );
  });

  it('records acknowledgement requests without performing the external DET act', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        ...row,
        status: 'ACK_REQUESTED',
        latest_update_payload: {
          source: 'sgp',
          action: 'acknowledgement.requested',
        },
      },
    ]);
    const service = new DetProjectionService({ query } as never);

    await RequestContextStore.run(
      {
        actor: {
          sub: 'operator-1',
          username: 'operator@example.test',
          tenantId,
          groups: [],
          permissions: ['det.message.write'],
        },
      },
      async () => {
        await expect(
          service.requestAcknowledgement(messageId, { note: 'Please ack.' }),
        ).resolves.toMatchObject({
          id: messageId,
          status: 'ACK_REQUESTED',
        });
      },
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "status = 'ACK_REQUESTED'::fiscal.det_message_status",
      ),
      [messageId, 'operator@example.test', 'Please ack.'],
    );
  });
});
