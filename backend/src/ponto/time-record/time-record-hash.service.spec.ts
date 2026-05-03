import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../../database/database.service';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import { TimeRecordHashService } from './time-record-hash.service';

describe('TimeRecordHashService', () => {
  const service = new TimeRecordHashService(
    new DatabaseService({} as ConfigService),
  );

  it('canonicalizes object keys in deterministic order', () => {
    expect(service.canonicalize({ b: 2, a: { d: false, c: true } })).toBe(
      '{"a":{"c":true,"d":false},"b":2}',
    );
  });

  it('verifies a golden chain of 100 records and rejects mutation', () => {
    const employeeId = '00000000-0000-4000-8000-000000000001';
    let prevHash: Buffer | null = null;
    const records = Array.from({ length: 100 }, (_, index) => {
      const nsr = index + 1;
      const record = service.recordForHash({
        employeeId,
        recordedAt: formatInstantIso(new Date(Date.UTC(2026, 4, 2, 11, nsr))),
        source: 'MANUAL_ADJUSTMENT',
        nsr,
        rawPayload: { device: 'manual', sequence: nsr },
      });
      const recordHash = service.calculateHash(prevHash, record);
      const entry = { prevHash, recordHash, record };
      prevHash = recordHash;
      return entry;
    });

    expect(service.verifyChain(records)).toBe(true);
    records[42] = {
      ...records[42],
      record: {
        ...records[42].record,
        rawPayload: { device: 'manual', sequence: 999 },
      },
    };
    expect(service.verifyChain(records)).toBe(false);
  });

  it('verifies a chain across monthly partition boundaries', () => {
    const employeeId = '00000000-0000-4000-8000-000000000001';
    const recordedInstants = [
      '2026-04-30T23:58:00.000Z',
      '2026-05-01T00:02:00.000Z',
      '2026-05-31T23:59:00.000Z',
      '2026-06-01T00:01:00.000Z',
    ];
    let prevHash: Buffer | null = null;
    const records = recordedInstants.map((recordedAt, index) => {
      const nsr = index + 1;
      const record = service.recordForHash({
        employeeId,
        recordedAt,
        source: 'MANUAL_ADJUSTMENT',
        nsr,
        rawPayload: { device: 'manual', sequence: nsr },
      });
      const recordHash = service.calculateHash(prevHash, record);
      const entry = { prevHash, recordHash, record };
      prevHash = recordHash;
      return entry;
    });

    expect(service.verifyChain(records)).toBe(true);
  });

  it('rejects manual creation when prev_hash diverges from the latest record', async () => {
    const latestHash = Buffer.from('aa'.repeat(32), 'hex');
    const fakeDatabase = {
      transaction: jest.fn(
        async (callback: (client: unknown) => Promise<unknown>) =>
          callback({
            query: jest.fn().mockResolvedValue({
              rows: [{ nsr: '10', record_hash: latestHash }],
            }),
          }),
      ),
    };
    const serviceWithFakeDb = new TimeRecordHashService(fakeDatabase as never);

    await expect(
      serviceWithFakeDb.createManual({
        employeeId: '00000000-0000-4000-8000-000000000001',
        recordedAt: '2026-05-02T11:00:00.000Z',
        source: 'MANUAL_ADJUSTMENT',
        nsr: 11,
        prevHash: 'bb'.repeat(32),
        rawPayload: {},
      }),
    ).rejects.toThrow('prev_hash does not match');
  });
});
