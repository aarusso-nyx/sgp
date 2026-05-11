import type { QueryResultRow } from 'pg';

export interface EmployeeContextRow extends QueryResultRow {
  id: string;
  tenant_id: string;
}

export interface PayslipSourceRow extends QueryResultRow {
  tenant_id: string;
  tenant_name: string | null;
  employee_id: string;
  registration: string;
  employee_name: string;
  cpf: string | null;
  employment_link: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  payroll_run_id: string;
  competence_date: string;
  total_earnings: string;
  total_deductions: string;
  net_amount: string;
  irrf_base: string;
  inss_base: string;
  fgts_deposit: string;
  lines: unknown;
}

export interface FileRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  competence: string;
  file_hash: string;
  payroll_run_id: string;
  generated_at?: Date | string | undefined;
}

export interface IdRow extends QueryResultRow {
  id: string;
}

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface RenderedPayslip {
  fileId: string;
  employeeId: string;
  payrollRunId: string;
  competence: string;
  fileHash: string;
  fileName: string;
  buffer: Buffer;
}
