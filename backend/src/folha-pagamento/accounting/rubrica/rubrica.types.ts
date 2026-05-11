import { QueryResultRow } from 'pg';

import { RubricaType } from './rubrica.dto';

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface RubricaRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  kind: string;
  taxable: boolean;
  active: boolean;
  incidences: Record<string, unknown>;
  starts_on: Date | string;
  ends_on: Date | string | null;
  formula_alias: string | null;
  formula_expression: string | null;
  formula_dependencies: string[] | null;
  formula_version: number;
  formula_ready: boolean;
  formula_error: string | null;
  esocial_code: string | null;
  official_rubric_code: string | null;
  attributes: RubricaAttributeRecord[] | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LinkRow extends QueryResultRow {
  id: string;
  job_position_id: string;
  job_position_code: string | null;
  job_position_name: string | null;
  rubrica_id: string;
  rubrica_code: string | null;
  rubrica_description: string | null;
  starts_on: Date | string | null;
  ends_on: Date | string | null;
  application_condition: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PreviewRow extends QueryResultRow {
  amount: string | null;
}

export interface RubricaAttributeRecord {
  id: string;
  name: string;
  type: string;
  defaultValue: string | null;
  required: boolean;
}

export interface RubricaRecord {
  id: string;
  code: string;
  description: string;
  type: RubricaType;
  taxable: boolean;
  active: boolean;
  incidences: Record<string, unknown>;
  startsOn: string;
  endsOn: string | null;
  formulaAlias: string | null;
  formulaExpression: string | null;
  formulaDependencies: string[];
  formulaReady: boolean;
  formulaError: string | null;
  esocialCode: string | null;
  officialRubricCode: string | null;
  attributes: RubricaAttributeRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface RubricaCompileResult {
  ready: boolean;
  error: string | null;
  dependencies: string[];
}

export interface RubricaPreviewResult {
  rubricaId: string;
  employeeId: string;
  competence: string;
  amount: string | null;
  attributes: Record<string, unknown>;
}

export interface JobPositionRubricaRecord {
  id: string;
  jobPositionId: string;
  jobPositionCode: string | null;
  jobPositionName: string | null;
  rubricaId: string;
  rubricaCode: string | null;
  rubricaDescription: string | null;
  startsOn: string | null;
  endsOn: string | null;
  applicationCondition: string;
  createdAt: string;
  updatedAt: string;
}

export const KIND_BY_TYPE: Record<RubricaType, string> = {
  provento: 'EARNING',
  desconto: 'DEDUCTION',
  informativa: 'INFORMATION',
  base: 'BASE',
};

export const TYPE_BY_KIND: Record<string, RubricaType> = {
  EARNING: 'provento',
  DEDUCTION: 'desconto',
  INFORMATION: 'informativa',
  BASE: 'base',
};
