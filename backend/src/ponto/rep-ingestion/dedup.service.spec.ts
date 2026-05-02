import { DedupService } from './dedup.service';

describe('DedupService', () => {
  it('marks an already ingested NSR as duplicate', async () => {
    const service = new DedupService();
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ nsr: '10' }] }),
    };

    const result = await service.validate(
      client as never,
      '00000000-0000-4000-8000-000000000060',
      [
        {
          lineNo: 1,
          nsr: 10,
          rawLine: '10;server;20260502;08:00;CLOCK',
          recordedAt: '2026-05-02T11:00:00.000Z',
          employeeId: '00000000-0000-4000-8000-000000000101',
          payload: {},
        },
      ],
    );

    expect(result.duplicate).toBe(true);
    expect(result.duplicateNsrs.has(10)).toBe(true);
  });

  it('rejects NSR regression inside the batch', async () => {
    const service = new DedupService();
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await expect(
      service.validate(
        client as never,
        '00000000-0000-4000-8000-000000000060',
        [
          {
            lineNo: 1,
            nsr: 11,
            rawLine: '11;server;20260502;08:00;CLOCK',
            recordedAt: '2026-05-02T11:00:00.000Z',
            employeeId: '00000000-0000-4000-8000-000000000101',
            payload: {},
          },
          {
            lineNo: 2,
            nsr: 10,
            rawLine: '10;server;20260502;08:05;CLOCK',
            recordedAt: '2026-05-02T11:05:00.000Z',
            employeeId: '00000000-0000-4000-8000-000000000101',
            payload: {},
          },
        ],
      ),
    ).rejects.toThrow('NSR regression');
  });
});
