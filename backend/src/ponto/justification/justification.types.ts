export type AbsenceJustificationKind =
  | 'MEDICAL'
  | 'MARRIAGE'
  | 'BEREAVEMENT'
  | 'BLOOD_DONATION'
  | 'MILITARY'
  | 'VOTING'
  | 'PATERNITY'
  | 'MATERNITY'
  | 'LEGAL_DUTY'
  | 'UNION'
  | 'TRAINING'
  | 'OTHER';

export type AbsenceJustificationStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type AbsencePayrollTreatment = 'PAID' | 'UNPAID' | 'HOUR_BANK_NEUTRAL';

export interface AbsenceJustification {
  absenceJustificationId: string;
  employeeId: string;
  kind: AbsenceJustificationKind;
  absenceStart: string;
  absenceEnd: string;
  status: AbsenceJustificationStatus;
  reason: string;
  attachmentId: string | null;
  requestedByUserId: string;
  approvedByUserId: string | null;
  decidedAt: string | null;
  payrollTreatment: AbsencePayrollTreatment;
  medicalLeaveId: string | null;
}

export interface PayrollJustificationTreatment {
  employeeId: string;
  absenceJustificationId: string;
  intervalStart: string;
  intervalEnd: string;
  payrollTreatment: AbsencePayrollTreatment;
  paidMinutes: number;
  unpaidMinutes: number;
  hourBankNeutralMinutes: number;
}
