import { JustificationPayrollBridgeService } from './justification-payroll-bridge.service';

describe('JustificationPayrollBridgeService', () => {
  const service = new JustificationPayrollBridgeService({
    configured: true,
  } as never);

  it('maps paid justifications to paid minutes and no deduction minutes', () => {
    const treatment = service.toTreatment(
      {
        employee_id: 'employee-1',
        absence_justification_id: 'justification-1',
        absence_start: '2026-05-01T08:00:00.000Z',
        absence_end: '2026-05-01T12:00:00.000Z',
        payroll_treatment: 'PAID',
      },
      '2026-05-01T00:00:00.000Z',
      '2026-05-01T23:59:59.000Z',
    );

    expect(treatment.payrollTreatment).toBe('PAID');
    expect(treatment.paidMinutes).toBe(240);
    expect(treatment.unpaidMinutes).toBe(0);
  });

  it('clips the returned interval to payroll calculation bounds', () => {
    const treatment = service.toTreatment(
      {
        employee_id: 'employee-1',
        absence_justification_id: 'justification-1',
        absence_start: '2026-05-01T08:00:00.000Z',
        absence_end: '2026-05-01T18:00:00.000Z',
        payroll_treatment: 'HOUR_BANK_NEUTRAL',
      },
      '2026-05-01T10:00:00.000Z',
      '2026-05-01T12:00:00.000Z',
    );

    expect(treatment.hourBankNeutralMinutes).toBe(120);
    expect(treatment.intervalStart).toBe('2026-05-01T10:00:00.000Z');
    expect(treatment.intervalEnd).toBe('2026-05-01T12:00:00.000Z');
  });
});
