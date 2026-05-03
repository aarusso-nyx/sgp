import { BadRequestException } from '@nestjs/common';

import { BusinessDaysService } from './business-days.service';

describe('BusinessDaysService', () => {
  function service(rows: unknown[] = []) {
    const query = jest.fn().mockResolvedValue(rows);
    return {
      query,
      service: new BusinessDaysService({
        configured: true,
        query,
      } as never),
    };
  }

  it('counts weekdays and configured tenant holidays', async () => {
    const { service: businessDays } = service([
      {
        business_date: '2026-01-20',
        is_business_day: false,
        codes: ['FER-SP'],
        names: ['Feriado Municipal'],
      },
    ]);

    await expect(
      businessDays.getWorkingDays({
        startDate: '2026-01-19',
        endDate: '2026-01-25',
      }),
    ).resolves.toEqual({
      startDate: '2026-01-19',
      endDate: '2026-01-25',
      totalDays: 7,
      workingDays: 4,
      nonWorkingDays: 3,
      dates: [
        {
          date: '2026-01-19',
          isBusinessDay: true,
          source: 'default',
          codes: [],
          names: [],
        },
        {
          date: '2026-01-20',
          isBusinessDay: false,
          source: 'configured',
          codes: ['FER-SP'],
          names: ['Feriado Municipal'],
        },
        {
          date: '2026-01-21',
          isBusinessDay: true,
          source: 'default',
          codes: [],
          names: [],
        },
        {
          date: '2026-01-22',
          isBusinessDay: true,
          source: 'default',
          codes: [],
          names: [],
        },
        {
          date: '2026-01-23',
          isBusinessDay: true,
          source: 'default',
          codes: [],
          names: [],
        },
        {
          date: '2026-01-24',
          isBusinessDay: false,
          source: 'default',
          codes: [],
          names: [],
        },
        {
          date: '2026-01-25',
          isBusinessDay: false,
          source: 'default',
          codes: [],
          names: [],
        },
      ],
    });
  });

  it('lets configured records mark weekends as working days', async () => {
    const { service: businessDays } = service([
      {
        business_date: '2026-01-24',
        is_business_day: true,
        codes: ['COMP-SAB'],
        names: ['Compensacao'],
      },
    ]);

    await expect(
      businessDays.countWorkingDays('2026-01-24', '2026-01-25'),
    ).resolves.toBe(1);
  });

  it('rejects invalid or inverted ranges', async () => {
    const { service: businessDays } = service();

    await expect(
      businessDays.countWorkingDays('2026-02-01', '2026-01-01'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      businessDays.countWorkingDays('2026-02-31', '2026-03-01'),
    ).rejects.toThrow(BadRequestException);
  });
});
