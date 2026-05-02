import { BadRequestException } from '@nestjs/common';

import { TimesheetAggregatorService } from './timesheet-aggregator.service';

describe('TimesheetAggregatorService', () => {
  it('rejects OPEN periods before payroll bridge aggregation', async () => {
    const databaseService = {
      configured: true,
      query: jest.fn().mockResolvedValueOnce([
        {
          tenant_id: '00000000-0000-4000-8000-000000000100',
          employee_id: '00000000-0000-4000-8000-000000000200',
          period_start: '2026-05-01',
          period_end: '2026-05-31',
          status: 'OPEN',
        },
      ]),
    };
    const service = new TimesheetAggregatorService(databaseService as never);

    await expect(
      service.aggregate('00000000-0000-4000-8000-000000000300'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps aggregate rows returned by ponto.fn_aggregate_timesheet', async () => {
    const databaseService = {
      configured: true,
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            tenant_id: '00000000-0000-4000-8000-000000000100',
            employee_id: '00000000-0000-4000-8000-000000000200',
            period_start: '2026-05-01',
            period_end: '2026-05-31',
            status: 'CLOSED',
          },
        ])
        .mockResolvedValueOnce([
          {
            tenant_id: '00000000-0000-4000-8000-000000000100',
            employee_id: '00000000-0000-4000-8000-000000000200',
            period_start: '2026-05-01',
            period_end: '2026-05-31',
            worked_minutes: '480',
            expected_minutes: '480',
            overtime_50_minutes: '0',
            overtime_100_minutes: '0',
            night_minutes: '137',
            late_minutes: '0',
            absence_unpaid_minutes: '0',
            absence_paid_minutes: '0',
            hour_bank_settlement_minutes: '0',
          },
        ]),
    };
    const service = new TimesheetAggregatorService(databaseService as never);

    await expect(
      service.aggregate('00000000-0000-4000-8000-000000000300'),
    ).resolves.toMatchObject({
      workedMinutes: 480,
      nightMinutes: 137,
    });
  });
});
