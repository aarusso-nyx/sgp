/* eslint-disable */
import { BadRequestException } from '@nestjs/common';

import { ShiftPatternService } from './shift-pattern.service';

describe('ShiftPatternService', () => {
  const service = new ShiftPatternService({ configured: true } as never);

  it('validates a 12x36 cycle with positive working minutes', () => {
    expect(() =>
      service.validatePattern({
        code: '12X36-NOTURNO',
        name: '12x36 noturno',
        cycleDays: 2,
        kind: 'CLT_12X36',
        days: [
          {
            dayIndex: 0,
            isWorking: true,
            entryTime: '19:00',
            exitTime: '07:00',
            lunchMinutes: 0,
            nightShiftFlag: true,
            hazardFlag: true,
          },
          { dayIndex: 1, isWorking: false },
        ],
      }),
    ).not.toThrow();
    expect(
      service.expectedMinutes({
        entryTime: '19:00',
        exitTime: '07:00',
        lunchMinutes: 0,
      }),
    ).toBe(720);
  });

  it('rejects incomplete cycles', () => {
    expect(() =>
      service.validatePattern({
        code: 'BAD',
        name: 'Bad',
        cycleDays: 2,
        kind: 'CLT_12X36',
        days: [{ dayIndex: 0, isWorking: false }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid day indexes and non-positive working days', () => {
    expect(() =>
      service.validatePattern({
        code: 'BAD-IDX',
        name: 'Bad index',
        cycleDays: 1,
        kind: 'CLT_12X36',
        days: [{ dayIndex: 1, isWorking: false }],
      }),
    ).toThrow('Shift pattern day indexes must cover the full cycle');

    expect(() =>
      service.validatePattern({
        code: 'BAD-TIME',
        name: 'Bad time',
        cycleDays: 1,
        kind: 'CLT_12X36',
        days: [{ dayIndex: 0, isWorking: true, entryTime: '08:00' }],
      }),
    ).toThrow('Working pattern days require entry and exit times');

    expect(() =>
      service.validatePattern({
        code: 'BAD-MIN',
        name: 'Bad minutes',
        cycleDays: 1,
        kind: 'CLT_12X36',
        days: [
          {
            dayIndex: 0,
            isWorking: true,
            entryTime: '08:00',
            exitTime: '09:00',
            lunchMinutes: 60,
          },
        ],
      }),
    ).toThrow('Working pattern days must produce positive minutes');
  });

  it('creates patterns and maps day summaries through a transaction client', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              shift_pattern_id: 'pattern-1',
              code: 'ADM',
              name: 'Administrativo',
              cycle_days: 1,
              kind: 'ADMINISTRATIVE',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              day_index: 0,
              is_working: true,
              entry_time: '08:00',
              exit_time: '17:00',
              lunch_minutes: 60,
              night_shift_flag: false,
              hazard_flag: true,
            },
          ],
        }),
    };
    const db = {
      configured: true,
      transaction: jest.fn((fn) => fn(client)),
      query: jest.fn(),
    };
    const transactional = new ShiftPatternService(db as never);

    await expect(
      transactional.create({
        code: ' ADM ',
        name: ' Administrativo ',
        cycleDays: 1,
        kind: 'ADMINISTRATIVE',
        days: [
          {
            dayIndex: 0,
            isWorking: true,
            entryTime: '08:00',
            exitTime: '17:00',
            lunchMinutes: 60,
            hazardFlag: true,
          },
        ],
      }),
    ).resolves.toMatchObject({
      shiftPatternId: 'pattern-1',
      days: [{ expectedMinutes: 480, hazardFlag: true }],
    });
  });

  it('maps assignment updates, explicit validTo clearing, and not-found errors', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          shift_assignment_id: 'assign-1',
          employee_id: 'employee-1',
          shift_pattern_id: 'pattern-1',
          anchor_date: new Date('2026-05-01T00:00:00.000Z'),
          valid_from: '2026-05-01',
          valid_to: null,
        },
      ])
      .mockResolvedValueOnce([]);
    const dbService = new ShiftPatternService({
      configured: true,
      query,
    } as never);

    await expect(
      dbService.updateAssignment('assign-1', { validTo: null }),
    ).resolves.toMatchObject({
      shiftAssignmentId: 'assign-1',
      anchorDate: '2026-05-01',
      validTo: null,
    });
    expect(query.mock.calls[0][1][4]).toBeNull();

    await expect(dbService.updateAssignment('missing', {})).rejects.toThrow(
      'Shift assignment not found',
    );
  });

  it('requires a configured database for DB-backed operations', async () => {
    const unavailable = new ShiftPatternService({ configured: false } as never);

    await expect(unavailable.list()).rejects.toThrow(
      'DATABASE_URL is not configured',
    );
  });
});
