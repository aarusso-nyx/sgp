import { QueryResultRow } from 'pg';

export interface PayrollRunRow extends QueryResultRow {
  id: string;
  competence_year: number;
  competence_month: number;
  processing_type: string | null;
  payroll_type: string | null;
  branch_name: string | null;
  payment_date: Date | string | null;
  status: string;
  employee_count: number;
  total_net: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface PayrollRunDetailRow extends PayrollRunRow {
  branch_id: string | null;
  payroll_type_id: string;
  payroll_type_code: string | null;
  processing_type_id: string;
  processing_type_code: string | null;
}

export interface PayrollRunHistoryRow extends QueryResultRow {
  id: string;
  status: string;
  changed_at: Date | string;
  note: string;
  kind: string | null;
  employee_count: string | null;
  total_net: string | null;
}

export interface TerminatedEmployeeRow extends QueryResultRow {
  employee_id: string;
  functional_status_id: string | null;
  branch_id: string | null;
  salary_amount: string | null;
  hired_on: Date | string | null;
  terminated_on: Date | string | null;
}

export interface FinancialTotalsRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export interface EligibleEmployeeRow extends QueryResultRow {
  employee_id: string;
  branch_id: string | null;
  work_location_id: string | null;
  functional_status_id: string | null;
  job_position_id: string | null;
  employment_link_id: string | null;
  salary_amount: string | null;
}

export interface PayrollMappingRow extends QueryResultRow {
  earning_deduction_id: string;
  code: string;
  description: string;
  kind: string;
  formula_expression: string | null;
  default_amount: string | null;
  default_quantity: string | null;
}

export interface AdvanceInsertRow extends QueryResultRow {
  id: string;
}

export interface SoftDeletedItemRow extends QueryResultRow {
  id: string;
}
