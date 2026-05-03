import {
  LAI_EXTENSION_DAYS,
  LAI_INITIAL_RESPONSE_DAYS,
  LaiSlaService,
} from './lai-sla.service';

describe('LaiSlaService', () => {
  const service = new LaiSlaService();

  it('computes the statutory initial and extension calendar deadlines', () => {
    const submittedAt = new Date('2026-05-01T10:00:00.000Z');
    const dueAt = service.initialDueAt(submittedAt);
    const extendedDueAt = service.extendedDueAt(dueAt);

    expect(LAI_INITIAL_RESPONSE_DAYS).toBe(20);
    expect(LAI_EXTENSION_DAYS).toBe(10);
    expect(dueAt.toISOString()).toBe('2026-05-21T10:00:00.000Z');
    expect(extendedDueAt.toISOString()).toBe('2026-05-31T10:00:00.000Z');
  });

  it('marks finished requests independently from the deadline clock', () => {
    const summary = service.summarize({
      submittedAt: new Date('2026-05-01T00:00:00.000Z'),
      dueAt: new Date('2026-05-21T00:00:00.000Z'),
      finishedAt: new Date('2026-05-10T00:00:00.000Z'),
      now: new Date('2026-06-01T00:00:00.000Z'),
    });

    expect(summary.status).toBe('FINISHED');
  });
});
