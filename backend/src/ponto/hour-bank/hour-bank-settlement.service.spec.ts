import { HourBankSettlementService } from './hour-bank-settlement.service';

describe('HourBankSettlementService', () => {
  it('settles once for a payroll run and returns zero on a repeated run', async () => {
    const databaseService = {
      configured: true,
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            settled_count: '1',
            overtime_minutes: '300',
            deduction_minutes: '0',
          },
        ])
        .mockResolvedValueOnce([
          {
            settled_count: '0',
            overtime_minutes: '0',
            deduction_minutes: '0',
          },
        ]),
    };
    const service = new HourBankSettlementService(databaseService as never);
    const input = {
      payrollRunId: '00000000-0000-4000-8000-000000000063',
    };

    await expect(service.settleExpired(input)).resolves.toEqual({
      settledCount: 1,
      overtimeMinutes: 300,
      deductionMinutes: 0,
    });
    await expect(service.settleExpired(input)).resolves.toEqual({
      settledCount: 0,
      overtimeMinutes: 0,
      deductionMinutes: 0,
    });
  });
});
