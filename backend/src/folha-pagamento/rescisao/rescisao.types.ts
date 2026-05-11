import { QueryResultRow } from 'pg';

export interface CatalogRow extends QueryResultRow {
  payroll_type_id: string;
  processing_type_id: string;
}

export interface PayrollRunRow extends QueryResultRow {
  id: string;
  status: string;
}

export interface TerminationContextRow extends QueryResultRow {
  employee_id: string;
  employment_link_id: string;
  contract_type: string | null;
  branch_id: string | null;
  functional_status_id: string | null;
  work_location_id: string | null;
}

export interface ComputedItemRow extends QueryResultRow {
  item_code: string;
  item_kind: string;
  amount: string;
  reference_value: string;
  quantity: string;
  metadata: Record<string, unknown>;
}

export interface TotalsRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export interface RescisaoComponent {
  code: string;
  kind: string;
  amount: string;
  referenceValue: string;
  quantity: string;
  metadata: Record<string, unknown>;
}

export interface RescisaoRunResult {
  payrollRunId: string;
  employmentLinkId: string;
  employeeId: string;
  terminationDate: string;
  cause: string;
  status: string;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
  components: RescisaoComponent[];
}
