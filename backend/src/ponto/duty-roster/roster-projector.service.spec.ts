import { RosterProjectorService } from './roster-projector.service';

describe('RosterProjectorService', () => {
  const service = new RosterProjectorService({ configured: true } as never);

  function rows() {
    return [
      {
        shift_assignment_id: '00000000-0000-4000-8000-000000000062',
        shift_pattern_id: '00000000-0000-4000-8000-000000000063',
        anchor_date: '2026-05-01',
        valid_from: '2026-05-01',
        valid_to: null,
        cycle_days: 2,
        day_index: 0,
        is_working: true,
        entry_time: '19:00:00',
        exit_time: '07:00:00',
        lunch_minutes: 0,
        night_shift_flag: true,
        hazard_flag: false,
      },
      {
        shift_assignment_id: '00000000-0000-4000-8000-000000000062',
        shift_pattern_id: '00000000-0000-4000-8000-000000000063',
        anchor_date: '2026-05-01',
        valid_from: '2026-05-01',
        valid_to: null,
        cycle_days: 2,
        day_index: 1,
        is_working: false,
        entry_time: null,
        exit_time: null,
        lunch_minutes: null,
        night_shift_flag: false,
        hazard_flag: false,
      },
    ];
  }

  it('projects a 12x36 pattern anchored on 2026-05-01 through 90 days', () => {
    const projected = service.projectShiftPattern(
      '00000000-0000-4000-8000-000000000061',
      '2026-05-01',
      '2026-07-29',
      rows(),
    );

    expect(projected).toHaveLength(90);
    expect(projected[0]).toMatchObject({
      workDate: '2026-05-01',
      expectedMinutes: 720,
      nightShiftFlag: true,
      source: 'SHIFT_PATTERN',
    });
    expect(projected[1]).toMatchObject({
      workDate: '2026-05-02',
      expectedMinutes: 0,
    });
    expect(projected[88]).toMatchObject({
      workDate: '2026-07-28',
      expectedMinutes: 720,
    });
    expect(projected[89]).toMatchObject({
      workDate: '2026-07-29',
      expectedMinutes: 0,
    });
  });

  it('continues the anchored 12x36 pattern correctly through 2026-12-31', () => {
    const projected = service.projectShiftPattern(
      '00000000-0000-4000-8000-000000000061',
      '2026-12-29',
      '2026-12-31',
      rows(),
    );

    expect(
      projected.map((entry) => [entry.workDate, entry.expectedMinutes]),
    ).toEqual([
      ['2026-12-29', 720],
      ['2026-12-30', 0],
      ['2026-12-31', 720],
    ]);
  });
});
