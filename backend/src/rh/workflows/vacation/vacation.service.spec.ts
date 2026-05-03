import {
  TEST_DATE_2025_01_01,
  TEST_DATE_2025_12_31,
  TEST_DATE_2026_01_01,
  TEST_DATE_2026_01_02,
  TEST_DATE_2026_01_05,
  TEST_DATE_2026_01_10,
  TEST_DATE_2026_01_20,
  TEST_DATE_2026_01_21,
  TEST_DATE_2026_02_01,
  TEST_DATE_2026_02_05,
  TEST_DATE_2026_02_10,
  TEST_DATE_2026_03_01,
  TEST_DATE_2026_03_05,
  TEST_DATE_2026_04_01,
  TEST_DATE_2026_04_05,
  TEST_INSTANT_2026_01_01_00_00_00_000Z,
} from './../../../../../tests/backend/helpers/date-fixtures';
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
                accrual_period_start: TEST_DATE_2025_01_01,
                accrual_period_end: TEST_DATE_2025_12_31,
                installment_number: 1,
                pecuniary_bonus_days: 10,
                starts_on: TEST_DATE_2026_01_02,
                ends_on: TEST_DATE_2026_01_21,
                days: 20,
                status: 'programado',
                created_at: TEST_INSTANT_2026_01_01_00_00_00_000Z,
                updated_at: TEST_INSTANT_2026_01_01_00_00_00_000Z,
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
        accrual_period_start: TEST_DATE_2025_01_01,
        accrual_period_end: TEST_DATE_2025_12_31,
        accrued_days: 30,
        used_days: 0,
        pecuniary_bonus_days: 0,
        available_days: 30,
      },
    ]);
    const service = new VacationService(db as never);

    await expect(
      service.getBalance(
        employeeId,
        new Date(TEST_INSTANT_2026_01_01_00_00_00_000Z),
      ),
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
        accrualPeriodStart: TEST_DATE_2025_01_01,
        accrualPeriodEnd: TEST_DATE_2025_12_31,
        installments: [
          { startsOn: TEST_DATE_2026_01_01, endsOn: TEST_DATE_2026_01_05 },
          { startsOn: TEST_DATE_2026_02_01, endsOn: TEST_DATE_2026_02_05 },
          { startsOn: TEST_DATE_2026_03_01, endsOn: TEST_DATE_2026_03_05 },
          { startsOn: TEST_DATE_2026_04_01, endsOn: TEST_DATE_2026_04_05 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects pecuniary bonus above ten days', async () => {
    const service = new VacationService(database() as never);

    await expect(
      service.schedule({
        employeeId,
        accrualPeriodStart: TEST_DATE_2025_01_01,
        accrualPeriodEnd: TEST_DATE_2025_12_31,
        pecuniaryBonusDays: 11,
        installments: [
          { startsOn: TEST_DATE_2026_01_01, endsOn: TEST_DATE_2026_01_20 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires one celetista installment with at least fourteen continuous days', async () => {
    const service = new VacationService(database('celetista') as never);

    await expect(
      service.schedule({
        employeeId,
        accrualPeriodStart: TEST_DATE_2025_01_01,
        accrualPeriodEnd: TEST_DATE_2025_12_31,
        installments: [
          { startsOn: TEST_DATE_2026_01_01, endsOn: TEST_DATE_2026_01_10 },
          { startsOn: TEST_DATE_2026_02_01, endsOn: TEST_DATE_2026_02_10 },
        ],
      }),
    ).rejects.toThrow('at least 14 continuous days');
  });

  it('uses the business-day calendar when installment days are omitted', async () => {
    const db = database();
    const businessDays = {
      countWorkingDays: jest.fn().mockResolvedValue(14),
    };
    const service = new VacationService(db as never, businessDays as never);

    await service.schedule({
      employeeId,
      accrualPeriodStart: TEST_DATE_2025_01_01,
      accrualPeriodEnd: TEST_DATE_2025_12_31,
      installments: [
        { startsOn: TEST_DATE_2026_01_02, endsOn: TEST_DATE_2026_01_21 },
      ],
    });

    expect(businessDays.countWorkingDays).toHaveBeenCalledWith(
      TEST_DATE_2026_01_02,
      TEST_DATE_2026_01_21,
    );
    expect(db.client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.vacation_record'),
      expect.arrayContaining([14]),
    );
  });
});
