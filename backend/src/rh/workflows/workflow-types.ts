import { QueryResultRow } from 'pg';

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface IdRow extends QueryResultRow {
  id: string;
}

export interface WorkflowRow extends QueryResultRow {
  id: string;
  employee_id: string | null;
  employee_registration: string | null;
  employee_name: string | null;
  title: string;
  subtitle: string;
  starts_on: Date | string | null;
  ends_on: Date | string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LookupRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  metadata: Record<string, unknown> | null;
}

export interface RequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

export interface WorkflowDefinition {
  key: string;
  label: string;
  legacyRoute: string;
  table: string;
  employeeScoped: boolean;
  select: string;
  from: string;
  search: string;
  orderBy: string;
  activeDelete?: string | undefined;
}
