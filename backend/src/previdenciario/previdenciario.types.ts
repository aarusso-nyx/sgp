import { QueryResultRow } from 'pg';

import { S2418BuildInput } from '../esocial-worker/builders/s2418.builder';

export interface EmployeeRetirementRow extends QueryResultRow {
  id: string;
  registration: string;
  name: string;
  birth_date: Date | string | null;
  hired_on: Date | string | null;
  cpf: string | null;
}

export interface RetirementRuleRow extends QueryResultRow {
  id: string;
  name: string;
  legal_basis: string;
  age_criteria: unknown;
  contribution_time_criteria: unknown;
  grace_period_criteria: unknown;
  applicable_employment_link: string | null;
  active: boolean;
}

export interface RetirementSimulationRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  rule_id: string;
  rule_name: string;
  result: unknown;
  details_json: unknown;
  simulated_on: Date | string;
  created_by_ref: string | null;
}

export interface RetirementGrantRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  rule_id: string;
  rule_name: string;
  granted_on: Date | string;
  legal_basis: string;
  appointment_act: string;
  status: string;
  notes: string;
  granted_by_ref: string | null;
}

export interface PensionCompensationRow extends QueryResultRow {
  id: string;
  employee_id: string | null;
  registration: string | null;
  employee_name: string | null;
  certificate_ref: string | null;
  origin_regime: string;
  amount: string;
  status: string;
  notes: string;
}

export interface PensionGrantRow extends QueryResultRow {
  id: string;
  instituting_employee_id: string | null;
  registration: string | null;
  employee_name: string | null;
  beneficiary_name: string;
  beneficiary_cpf: string | null;
  kinship: string | null;
  benefit_type: string;
  apportionment_type: string;
  share_percent: string;
  adjustment_mode: string;
  nature: string;
  granted_on: Date | string;
  ceased_on: Date | string | null;
  legal_basis: string;
  notes: string;
}

export interface ContributionTimeCertificateRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  period_start: Date | string;
  period_end: Date | string;
  issuing_agency: string;
  issuance_act: string;
  storage_key: string | null;
  issued_at: Date | string;
  issued_by_ref: string | null;
}

export interface PrevidentiaryDeclarationRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  type: string;
  issued_at: Date | string;
  storage_key: string | null;
  issued_by_ref: string | null;
}

export interface RecertificationCampaignRow extends QueryResultRow {
  id: string;
  type: string;
  cycle_start: Date | string;
  cycle_end: Date | string;
  filter_json: unknown;
  active: boolean;
}

export interface RecertificationBeneficiaryRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  campaign_id: string | null;
  type: string;
  next_due_date: Date | string;
  status: string;
}

export interface RecertificationRecordRow extends QueryResultRow {
  id: string;
  beneficiary_id: string;
  recertified_on: Date | string;
  operator_ref: string;
  snapshot_json: unknown;
  receipt_storage_key: string | null;
}

export interface ExternalLifeProofRow extends QueryResultRow {
  id: string;
  beneficiary_id: string;
  channel: string;
  authentication_json: unknown;
  proven_at: Date | string;
}

export interface BeneficiaryContactHistoryRow extends QueryResultRow {
  id: string;
  beneficiary_id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  contacted_on: Date | string;
  user_ref: string;
  notes: string;
}

export interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

export interface S2405EligibilityRow extends QueryResultRow {
  retirement_grant_id: string;
}

export interface S2418ReactivationEmissionInput extends S2418BuildInput {
  sourceKind: 'RETIREMENT' | 'PENSION';
}
