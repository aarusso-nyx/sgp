export interface TimesheetPayrollAggregate {
  tenantId: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  workedMinutes: number;
  expectedMinutes: number;
  overtime50Minutes: number;
  overtime100Minutes: number;
  nightMinutes: number;
  lateMinutes: number;
  absenceUnpaidMinutes: number;
  absencePaidMinutes: number;
  hourBankSettlementMinutes: number;
}

export type PayrollBridgeLineCode =
  | 'PONTO_HE50'
  | 'PONTO_HE100'
  | 'PONTO_NIGHT'
  | 'PONTO_LATE'
  | 'PONTO_ABSENCE'
  | 'PONTO_HOUR_BANK';

export interface PayrollBridgeLine {
  code: PayrollBridgeLineCode;
  earningDeductionId: string;
  kind: 'EARNING' | 'DEDUCTION';
  quantityHours: string;
  referenceValue: string;
  amount: string;
  sourceMinutes: number;
}

export interface PayrollBridgePreview {
  timesheetPeriodId: string;
  payrollRunId: string;
  aggregate: TimesheetPayrollAggregate;
  lines: PayrollBridgeLine[];
  alreadyApplied: boolean;
}

export interface PayrollBridgeApplyResult extends PayrollBridgePreview {
  payrollBridgeEventId: string;
  appliedAt: string;
}
