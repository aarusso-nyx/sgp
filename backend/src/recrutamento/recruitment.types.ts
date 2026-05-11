import { QueryResultRow } from 'pg';

import {
  RecruitmentCandidateStatusInput,
  RecruitmentHiringTypeInput,
} from './recruitment.dto';

export interface RecruitmentFunctionRow {
  id: string;
  funcaoId: string | null;
  tipoContratacao: RecruitmentHiringTypeInput;
  quantidadeVagas: number;
  requisitos: string;
  turnoId: string | null;
}

export interface RecruitmentCandidateRow {
  id: string;
  pessoaId: string;
  curriculoS3Key: string | null;
  situacao: RecruitmentCandidateStatusInput;
  comentarioAnalise: string;
}

export interface RecruitmentRequestSummary {
  id: string;
  solicitanteId: string;
  filialId: string | null;
  lotacaoId: string | null;
  motivo: string;
  justificativa: string;
  dataEntrada: string;
  dataLimite: string | null;
  situacao: string;
  concluidoEm: string | null;
  funcoesRequisitadas: RecruitmentFunctionRow[];
}

export interface RecruitmentCandidateSummary extends RecruitmentCandidateRow {
  requisicaoId: string;
}

export interface RecruitmentRequestSqlRow extends QueryResultRow {
  id: string;
  requester_ref: string;
  branch_id: string | null;
  work_location_id: string | null;
  reason: string;
  justification: string;
  request_date: Date | string;
  due_date: Date | string | null;
  status: string;
  completed_at: Date | string | null;
  functions: RecruitmentFunctionRow[] | string | null;
}

export interface RecruitmentCandidatesSqlRow extends QueryResultRow {
  candidates: RecruitmentCandidateSummary[] | string | null;
}

export interface RecruitmentCandidateSqlRow extends QueryResultRow {
  id: string;
  request_id: string;
  person_ref: string;
  curriculum_s3_key: string | null;
  status: string;
  review_comment: string;
}

export interface RecruitmentRequestStateRow extends QueryResultRow {
  id: string;
  requester_ref: string;
  status: string;
}

export interface RecruitmentCandidateStateRow extends QueryResultRow {
  id: string;
  request_id: string;
  request_status: string;
}

export interface CountRow extends QueryResultRow {
  total: string;
}
