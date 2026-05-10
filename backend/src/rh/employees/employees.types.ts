import { QueryResultRow } from 'pg';

export interface EmployeeSummary {
  id: string;
  registration: string;
  name: string;
  cpf: string | null;
  email: string | null;
  lifecycleStatus: string;
  functionalStatus: string | null;
  branch: string | null;
  active: boolean;
  abonoPermanenciaAtivo: boolean;
  abonoPermanenciaInicio: string | null;
  abonoPermanenciaFundamento: string | null;
  recruitmentOrigin: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListRow extends QueryResultRow {
  id: string;
  registration: string;
  name: string;
  cpf: string | null;
  email: string | null;
  lifecycle_status: string;
  functional_status: string | null;
  branch_name: string | null;
  branch_id?: string | null | undefined;
  active: boolean;
  abono_permanencia_ativo?: boolean | undefined;
  abono_permanencia_inicio?: Date | string | null | undefined;
  abono_permanencia_fundamento?: string | null | undefined;
  recruitment_origin?: string | null | undefined;
  version?: number | string | undefined;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AbonoPermanenciaRow extends QueryResultRow {
  id: string;
  active: boolean;
  starts_on: Date | string | null;
  legal_basis: string | null;
  audit_event_id?: string | undefined;
  version?: number | string | undefined;
  updated_at: Date | string;
}

export interface IdRow extends QueryResultRow {
  id: string;
}

export interface VersionedIdRow extends IdRow {
  version: number | string;
}

export interface AdmitRow extends EmployeeListRow {
  contract_id: string;
}

export interface PayrollRunRefRow extends QueryResultRow {
  id: string;
  status: string;
}

export interface EmployeeRegimeRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  registration: string;
  name: string;
  functional_status_id: string | null;
  version: number | string;
}

export interface RegimeChangeRow extends QueryResultRow {
  employee_id: string;
  employment_link_id: string;
  employment_contract_id: string;
  contract_type: string;
  effective_on: Date | string;
  end_date: Date | string | null;
  status_history_id: string;
  audit_event_id: string;
  employee_version: number | string;
  employment_link_version: number | string;
}

export interface VersionRow extends QueryResultRow {
  version: number | string;
}

export interface EmployeeTerminationResult {
  employee: EmployeeSummary;
  payrollRunId: string | null;
  payrollRunStatus: string | null;
}

export interface EmployeeAdmissionResult {
  employeeId: string;
  employmentContractId: string;
  employee: EmployeeSummary;
}

export interface ContractRegimeChangeResult {
  employeeId: string;
  employmentLinkId: string;
  employmentContractId: string;
  contractType: string;
  effectiveOn: string;
  endDate: string | null;
  statusHistoryId: string;
  auditEventId: string;
  employeeVersion: number;
  employmentLinkVersion: number;
}

export interface EmployeeDossier {
  funcionarioId: string;
  tipo: 'dossie';
  emitidoEm: string;
  status: 'AVAILABLE';
  employee: EmployeeSummary;
  statusHistory: Array<{
    id: string;
    functionalStatus: string;
    startsOn: string;
    endsOn: string | null;
    notes: string;
  }>;
  contracts: Array<{
    id: string;
    startsOn: string;
    endsOn: string | null;
    status: string;
  }>;
}

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface StatusHistoryRow extends QueryResultRow {
  id: string;
  functional_status: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  notes: string;
}

export interface ContractRow extends QueryResultRow {
  id: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  status: string;
}

export interface CadastralChangeRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  section: string;
  status: string;
  previous_payload: Record<string, unknown>;
  requested_payload: Record<string, unknown>;
  decision_notes: string | null;
  requested_by_sub: string | null;
  requested_by_login: string | null;
  decided_by_sub: string | null;
  decided_by_login: string | null;
  requested_at: Date | string;
  decided_at: Date | string | null;
}
