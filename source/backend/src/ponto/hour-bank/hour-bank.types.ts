export type HourBankRegime = 'CLT_INDIVIDUAL' | 'CLT_COLETIVO' | 'ESTATUTARIO';

export type HourBankMovementKind =
  | 'ACCRUAL_POSITIVE'
  | 'ACCRUAL_NEGATIVE'
  | 'COMPENSATION'
  | 'SETTLEMENT_OVERTIME'
  | 'SETTLEMENT_DEDUCTION'
  | 'MANUAL_ADJUSTMENT';

export interface HourBankSummary {
  hourBankId: string;
  employeeId: string;
  regime: HourBankRegime;
  openedAt: string;
  expiresAt: string;
  balanceMinutes: number;
  status: string;
}

export interface HourBankMovement {
  hourBankMovementId: string;
  hourBankId: string;
  workDate: string;
  kind: HourBankMovementKind;
  minutes: number;
  sourceTimeRecordIds: string[];
  createdAt: string;
  payrollRunId: string | null;
}
