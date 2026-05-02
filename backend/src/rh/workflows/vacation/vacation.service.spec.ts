import { BadRequestException } from '@nestjs/common';

import { VacationService } from './vacation.service';

describe('VacationService', () => {
  const employeeId = '00000000-0000-4000-8000-000000000001';

  function database(contractType = 'statutory') {
    const query = jest.fn();
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM hr.employee employee')) {
          return {
            rows: [
              {
                employee_id: employeeId,
                tenant_id: '00000000-0000-0000-0000-000000000100',
                contract_type: contractType,
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO hr.vacation_record')) {
          return {
            rows: [
              {
                id: 'vac-1',
                employee_id: employeeId,
                accrual_period_start: '2025-01-01',
                accrual_period_end: '2025-12-31',
                installment_number: 1,
                pecuniary_bonus_days: 10,
                starts_on: '2026-01-02',
                ends_on: '2026-01-21',
                days: 20,
                status: 'programado',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
              },
            ],
          };
        }
        return { rows: [] };
      }),
    };
    return {
      configured: true,
      query,
      transaction: (callback: (input: typeof client) => Promise<unknown>) =>
        callback(client),
      client,
    };
  }

  it('returns vacation balance rows from the database function', async () => {
    const db = database();
    db.query.mockResolvedValueOnce([
      {
        employee_id: employeeId,
        accrual_period_start: '2025-01-01',
        accrual_period_end: '2025-12-31',
        accrued_days: 30,
        used_days: 0,
        pecuniary_bonus_days: 0,
        available_days: 30,
      },
    ]);
    const service = new VacationService(db as never);

    await expect(
      service.getBalance(employeeId, new Date('2026-01-01T00:00:00Z')),
    ).resolves.toEqual([
      expect.objectContaining({
        employeeId,
        accruedDays: 30,
        availableDays: 30,
      }),
    ]);
  });

  it('rejects more than three installments', async () => {
    const service = new VacationService(database() as never);

    await expect(
      service.schedule({
        employeeId,
        accrualPeriodStart: '2025-01-01',
        accrualPeriodEnd: '2025-12-31',
        installments: [
          { startsOn: '2026-01-01', endsOn: '2026-01-05' },
          { startsOn: '2026-02-01', endsOn: '2026-02-05' },
          { startsOn: '2026-03-01', endsOn: '2026-03-05' },
          { startsOn: '2026-04-01', endsOn: '2026-04-05' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects pecuniary bonus above ten days', async () => {
    const service = new VacationService(database() as never);

    await expect(
      service.schedule({
        employeeId,
        accrualPeriodStart: '2025-01-01',
        accrualPeriodEnd: '2025-12-31',
        pecuniaryBonusDays: 11,
        installments: [{ startsOn: '2026-01-01', endsOn: '2026-01-20' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires one celetista installment with at least fourteen continuous days', async () => {
    const service = new VacationService(database('celetista') as never);

    await expect(
      service.schedule({
        employeeId,
        accrualPeriodStart: '2025-01-01',
        accrualPeriodEnd: '2025-12-31',
        installments: [
          { startsOn: '2026-01-01', endsOn: '2026-01-10' },
          { startsOn: '2026-02-01', endsOn: '2026-02-10' },
        ],
      }),
    ).rejects.toThrow('at least 14 continuous days');
  });
});
