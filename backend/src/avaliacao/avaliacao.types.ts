import { QueryResultRow } from 'pg';

import {
  PerformanceEvaluationStatusInput,
  ProgressionKindInput,
} from './avaliacao.dto';

export interface EmployeeReferenceRow extends QueryResultRow {
  id: string;
  registration: string;
  name: string;
  branch_id: string | null;
  work_location_id: string | null;
  job_position_id: string | null;
  job_function_id: string | null;
  salary_reference_id: string | null;
}

export interface SalaryReferenceAmountRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  amount: string;
}

export interface PerformanceEvaluationSqlRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_registration: string;
  employee_name: string;
  branch_id: string | null;
  work_location_id: string | null;
  job_position_id: string | null;
  job_function_id: string | null;
  period_label: string;
  score: string;
  criteria: unknown;
  evaluator_ref: string;
  evaluated_on: Date | string;
  status: string;
  notes: string;
}

export interface MeritProgressionSqlRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_registration: string;
  employee_name: string;
  performance_evaluation_id: string | null;
  source_salary_reference_id: string | null;
  source_salary_reference_code: string | null;
  target_salary_reference_id: string | null;
  target_salary_reference_code: string | null;
  effective_on: Date | string;
  appointment_act: string;
  kind: string;
  justification: string;
  approved_by_ref: string | null;
}

export interface SalarySimulationSqlRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_registration: string;
  employee_name: string;
  scenario: string;
  result_json: unknown;
  created_by_ref: string | null;
  created_at: Date | string;
  adjustments: unknown;
}

export interface CareerPlanSqlRow extends QueryResultRow {
  id: string;
  employee_id: string | null;
  employee_registration: string | null;
  employee_name: string | null;
  name: string;
  version: string;
  effective_on: Date | string;
  levels_json: unknown;
  references_json: unknown;
  active: boolean;
}

export interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

export interface PerformanceEvaluationSummary {
  id: string;
  funcionarioId: string;
  matricula: string;
  nome: string;
  filialId: string | null;
  lotacaoId: string | null;
  cargoId: string | null;
  funcaoId: string | null;
  periodo: string;
  nota: number;
  criterios: unknown[];
  avaliadorId: string;
  dataAvaliacao: string;
  status: PerformanceEvaluationStatusInput;
  observacao: string;
}

export interface MeritProgressionSummary {
  id: string;
  funcionarioId: string;
  matricula: string;
  nome: string;
  avaliacaoId: string | null;
  referenciaOrigemId: string | null;
  referenciaOrigemCodigo: string | null;
  referenciaDestinoId: string | null;
  referenciaDestinoCodigo: string | null;
  dataVigencia: string;
  atoNomeacao: string;
  tipo: ProgressionKindInput;
  justificativa: string;
  aprovadoPor: string | null;
}

export interface SalarySimulationSummary {
  id: string;
  funcionarioId: string;
  matricula: string;
  nome: string;
  cenario: string;
  resultado: Record<string, unknown>;
  criadoPor: string | null;
  criadoEm: string;
  ajustes: Array<Record<string, unknown>>;
}

export interface CareerPlanSummary {
  id: string;
  funcionarioId: string | null;
  matricula: string | null;
  nomeServidor: string | null;
  nome: string;
  versao: string;
  dataVigencia: string;
  niveis: Record<string, unknown>;
  referencias: Record<string, unknown>;
  ativo: boolean;
}
