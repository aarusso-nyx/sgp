import {
  LAI_EXTENSION_DAYS,
  LAI_INITIAL_RESPONSE_DAYS,
  LaiSlaService,
} from './lai-sla.service';
import {
  TEST_INSTANT_2026_05_01T00_00_00_000Z,
  TEST_INSTANT_2026_05_01T10_00_00_000Z,
  TEST_INSTANT_2026_05_10T00_00_00_000Z,
  TEST_INSTANT_2026_05_21T00_00_00_000Z,
  TEST_INSTANT_2026_06_01T00_00_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';

describe('LaiSlaService', () => {
  const service = new LaiSlaService();

  it('computes the statutory initial and extension calendar deadlines', () => {
    const submittedAt = new Date(TEST_INSTANT_2026_05_01T10_00_00_000Z);
    const dueAt = service.initialDueAt(submittedAt);
    const extendedDueAt = service.extendedDueAt(dueAt);

    expect(LAI_INITIAL_RESPONSE_DAYS).toBe(20);
    expect(LAI_EXTENSION_DAYS).toBe(10);
    expect(dueAt.toISOString()).toBe('2026-05-21T10:00:00.000Z');
    expect(extendedDueAt.toISOString()).toBe('2026-05-31T10:00:00.000Z');
  });

  it('marks finished requests independently from the deadline clock', () => {
    const summary = service.summarize({
      submittedAt: new Date(TEST_INSTANT_2026_05_01T00_00_00_000Z),
      dueAt: new Date(TEST_INSTANT_2026_05_21T00_00_00_000Z),
      finishedAt: new Date(TEST_INSTANT_2026_05_10T00_00_00_000Z),
      now: new Date(TEST_INSTANT_2026_06_01T00_00_00_000Z),
    });

    expect(summary.status).toBe('FINISHED');
  });
});
