import { QueryResultRow } from 'pg';

export type CompetenceStatus =
  | 'OPEN'
  | 'CALCULATING'
  | 'CALCULATED'
  | 'APPROVED'
  | 'GENERATED'
  | 'CLOSED';

export type PayrollRunStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'GENERATED'
  | 'APPROVED'
  | 'CLOSED';

export interface CatalogRow extends QueryResultRow {
  payroll_type_id: string;
  processing_type_id: string;
  base_earning_id: string;
  consignment_deduction_id: string;
}

export interface CompetenceRow extends QueryResultRow {
  id: string;
  competence_year: number;
  competence_month: number;
  status: CompetenceStatus;
  opened_at: Date | string | null;
  closed_at: Date | string | null;
}

export interface RunRow extends QueryResultRow {
  id: string;
  competence_year: number;
  competence_month: number;
  status: PayrollRunStatus;
  employee_count: number;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export interface ReviewRow extends QueryResultRow {
  employee_id: string;
  registration: string;
  employee_name: string;
  total_earnings: string;
  total_deductions: string;
  net_amount: string;
}

export interface ValidationRow extends QueryResultRow {
  validation: Record<string, unknown>;
}

export interface CountRow extends QueryResultRow {
  inserted_count: string;
}

export type MonthlyRubricPhase = 'earning' | 'social_security' | 'income_tax';

export interface FolhaMensalReviewLine {
  employeeId: string;
  registration: string;
  employeeName: string;
  totalEarnings: string;
  totalDeductions: string;
  netAmount: string;
}

export interface FolhaMensalResult {
  competenceId: string;
  payrollRunId: string;
  competenceYear: number;
  competenceMonth: number;
  competenceStatus: CompetenceStatus;
  payrollStatus: PayrollRunStatus;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
  validation?: Record<string, unknown> | undefined;
  review: FolhaMensalReviewLine[];
}
