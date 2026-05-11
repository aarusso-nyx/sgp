import type { QueryResultRow } from 'pg';

export interface PensionistaImportAcceptedRow {
  rowNumber: number;
  payrollItemId: string;
  pensionId: string;
  pensionBeneficiaryId: string;
  pensionistaEmployeeId: string;
  pensionistaRegistration: string;
  earningDeductionId: string;
  earningDeductionCode: string;
  amount: string;
  payrollItemIdempotencyKey: string;
  pensionIdempotencyKey: string;
  operation: 'created' | 'updated';
}

export interface PensionistaImportRejectedRow {
  rowNumber: number;
  message: string;
}

export interface PensionistaImportResult {
  payrollRunId: string;
  fileName: string;
  fileHash: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  accepted: PensionistaImportAcceptedRow[];
  errors: PensionistaImportRejectedRow[];
}

export interface PensionistaNormalizedImportRow {
  rowNumber: number;
  pensionId: string;
  pensionistaRegistration: string;
  pensionistaEmployeeId: string | null;
  pensionBeneficiaryId: string | null;
  earningDeductionCode: string;
  amount: string;
  quantity: string | null;
  referenceValue: string | null;
  notes: string;
}

export interface PensionistaParsedImportFile {
  fileName: string;
  fileHash: string;
  rows: PensionistaNormalizedImportRow[];
}

export interface PensionistaPayrollRunRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  competence_year: number;
  competence_month: number;
  status: string;
}

export interface PensionistaRow extends QueryResultRow {
  id: string;
  registration: string;
  beneficiary_id: string;
}

export interface PensionRow extends QueryResultRow {
  id: string;
}

export interface PensionistaEarningDeductionRow extends QueryResultRow {
  id: string;
  code: string;
}

export interface PensionistaImportedItemRow extends QueryResultRow {
  id: string;
  inserted: boolean;
}

export interface PensionistaFinancialTotalsRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export interface PensionistaValidatedImportRow {
  row: PensionistaNormalizedImportRow;
  pensionista: PensionistaRow;
  pension: PensionRow;
  earning: PensionistaEarningDeductionRow;
  payrollItemIdempotencyKey: string;
  pensionIdempotencyKey: string;
}

export interface PensionistaImportValidation {
  run: PensionistaPayrollRunRow;
  acceptedRows: PensionistaValidatedImportRow[];
  errors: PensionistaImportRejectedRow[];
}
