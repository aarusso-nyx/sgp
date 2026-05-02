import { PayrollLineBuilderService } from './payroll-line-builder.service';

describe('PayrollLineBuilderService', () => {
  it('builds golden payroll lines with Decimal arithmetic and CLT night reduced hour', async () => {
    const databaseService = {
      configured: true,
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: '00000000-0000-4000-8000-000000000501',
            code: 'PONTO_HE50',
            kind: 'EARNING',
          },
          {
            id: '00000000-0000-4000-8000-000000000502',
            code: 'PONTO_HE100',
            kind: 'EARNING',
          },
          {
            id: '00000000-0000-4000-8000-000000000503',
            code: 'PONTO_NIGHT',
            kind: 'EARNING',
          },
          {
            id: '00000000-0000-4000-8000-000000000504',
            code: 'PONTO_LATE',
            kind: 'DEDUCTION',
          },
        ])
        .mockResolvedValue([{ amount: '10.00' }]),
    };
    const service = new PayrollLineBuilderService(databaseService as never);

    const lines = await service.buildLines(
      {
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
        workedMinutes: 1000,
        expectedMinutes: 900,
        overtime50Minutes: 60,
        overtime100Minutes: 30,
        nightMinutes: 480,
        lateMinutes: 15,
        absenceUnpaidMinutes: 0,
        absencePaidMinutes: 0,
        hourBankSettlementMinutes: 0,
      },
      5,
      2026,
    );

    expect(lines).toEqual([
      expect.objectContaining({
        code: 'PONTO_HE50',
        quantityHours: '1.0000',
        amount: '15.00',
      }),
      expect.objectContaining({
        code: 'PONTO_HE100',
        quantityHours: '0.5000',
        amount: '10.00',
      }),
      expect.objectContaining({
        code: 'PONTO_NIGHT',
        quantityHours: '8.0000',
        amount: '16.00',
      }),
      expect.objectContaining({
        code: 'PONTO_LATE',
        quantityHours: '0.2500',
        amount: '2.50',
      }),
    ]);
  });
});
