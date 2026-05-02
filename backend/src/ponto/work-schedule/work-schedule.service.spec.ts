import { WorkScheduleService } from './work-schedule.service';

describe('WorkScheduleService', () => {
  it('maps database rows to public summaries', () => {
    const service = new WorkScheduleService({ configured: true } as never);
    const summary = (
      service as unknown as {
        toSummary(row: Record<string, unknown>): unknown;
      }
    ).toSummary({
      work_schedule_id: '00000000-0000-4000-8000-000000000059',
      code: 'DEFAULT-8H',
      name: 'Jornada padrao 8h',
      weekly_hours: '40.00',
      tolerance_minutes: 10,
      status: 'ACTIVE',
      valid_from: '2026-05-02',
      valid_to: null,
    });

    expect(summary).toEqual({
      workScheduleId: '00000000-0000-4000-8000-000000000059',
      code: 'DEFAULT-8H',
      name: 'Jornada padrao 8h',
      weeklyHours: 40,
      toleranceMinutes: 10,
      status: 'ACTIVE',
      validFrom: '2026-05-02',
      validTo: null,
    });
  });
});
