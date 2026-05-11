import { BadRequestException } from '@nestjs/common';

import { RequestContextStore } from '../../../common/request-context/request-context.store';
import { ReintegrationKind } from './reintegration-order.dto';
import { ReintegrationOrderService } from './reintegration-order.service';

const FIXTURE_REINSTATEMENT_AT = new Date(Date.UTC(2026, 4, 2, 3, 0, 0));

describe('ReintegrationOrderService branch behavior', () => {
  it('summaries optional dates through the slim coordinator', () => {
    const service = serviceWithClient();
    const runtime = service as unknown as {
      toSummary(row: Record<string, unknown>): unknown;
    };

    expect(
      runtime.toSummary({
        id: 'order',
        employment_link_id: 'link',
        original_termination_event_id: 'event',
        reinstatement_date: FIXTURE_REINSTATEMENT_AT,
        kind: 'JUDICIAL',
        process_number: null,
        court: null,
        decision_date: '2026-05-03',
        attachment_uri: null,
        status: 'REGISTERED',
        applied_at: null,
        created_at: '2026-05-04T00:00:00.000Z',
        original_s2299_receipt: null,
      }),
    ).toMatchObject({
      reinstatementDate: '2026-05-02',
      appliedAt: null,
      createdAt: '2026-05-04T00:00:00.000Z',
    });
  });

  it('keeps direct construction compatible for future-date validation', async () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 4, 8, 12)));
    const service = serviceWithClient();

    await RequestContextStore.run(
      {
        tenantId: 'tenant',
        permissions: [],
      },
      async () => {
        await expect(
          service.register('link', {
            employmentLinkId: 'link',
            reinstatementDate: '2999-01-01',
            decisionDate: '2026-05-01',
            kind: ReintegrationKind.JUDICIAL,
            processNumber: '12345678901234567890',
          }),
        ).rejects.toThrow(BadRequestException);
      },
    );

    jest.useRealTimers();
  });
});

function serviceWithClient(): ReintegrationOrderService {
  return new ReintegrationOrderService({
    transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback({ query: jest.fn(async () => ({ rows: [] })) }),
  } as never);
}
