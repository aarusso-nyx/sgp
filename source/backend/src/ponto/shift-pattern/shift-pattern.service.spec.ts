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
});
