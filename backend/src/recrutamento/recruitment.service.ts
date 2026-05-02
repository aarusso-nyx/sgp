import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import {
  AttachRecruitmentCandidatesDto,
  CreateRecruitmentRequestDto,
  RecruitmentCandidateStatusInput,
  RecruitmentHiringTypeInput,
  UpdateRecruitmentCandidateDto,
} from './recruitment.dto';

interface RecruitmentFunctionRow {
  id: string;
  funcaoId: string | null;
  tipoContratacao: RecruitmentHiringTypeInput;
  quantidadeVagas: number;
  requisitos: string;
  turnoId: string | null;
}

interface RecruitmentCandidateRow {
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

interface RecruitmentRequestSqlRow extends QueryResultRow {
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

interface RecruitmentCandidatesSqlRow extends QueryResultRow {
  candidates: RecruitmentCandidateSummary[] | string | null;
}

interface RecruitmentCandidateSqlRow extends QueryResultRow {
  id: string;
  request_id: string;
  person_ref: string;
  curriculum_s3_key: string | null;
  status: string;
  review_comment: string;
}

interface RecruitmentRequestStateRow extends QueryResultRow {
  id: string;
  requester_ref: string;
  status: string;
}

interface RecruitmentCandidateStateRow extends QueryResultRow {
  id: string;
  request_id: string;
  request_status: string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class RecruitmentService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createRequest(
    input: CreateRecruitmentRequestDto,
  ): Promise<RecruitmentRequestSummary> {
    this.ensureDatabase();

    try {
      const rows = await this.databaseService.query<RecruitmentRequestSqlRow>(
        `
        WITH created_request AS (
          INSERT INTO hr.recruitment_request (
            requester_ref,
            branch_id,
            work_location_id,
            reason,
            justification,
            request_date,
            due_date
          )
          VALUES (
            $1,
            NULLIF($2, '')::uuid,
            NULLIF($3, '')::uuid,
            $4,
            $5,
            $6::date,
            NULLIF($7, '')::date
          )
          RETURNING *
        ),
        created_functions AS (
          INSERT INTO hr.recruitment_request_function (
            request_id,
            job_function_id,
            hiring_type,
            vacancy_count,
            requirements,
            shift_id
          )
          SELECT
            request_row.id,
            NULLIF(payload.funcao_id, '')::uuid,
            CASE payload.tipo_contratacao
              WHEN 'EFETIVO' THEN 'EFFECTIVE'::"RecruitmentHiringType"
              WHEN 'COMISSIONADO' THEN 'COMMISSIONED'::"RecruitmentHiringType"
              WHEN 'TERCEIRIZADO' THEN 'CONTRACTOR'::"RecruitmentHiringType"
              WHEN 'ESTAGIO' THEN 'INTERN'::"RecruitmentHiringType"
            END,
            payload.quantidade_vagas,
            COALESCE(payload.requisitos, ''),
            NULLIF(payload.turno_id, '')::uuid
          FROM created_request request_row
          CROSS JOIN LATERAL jsonb_to_recordset($8::jsonb) AS payload(
            funcao_id text,
            tipo_contratacao text,
            quantidade_vagas integer,
            requisitos text,
            turno_id text
          )
          RETURNING *
        )
        SELECT
          request_row.id,
          request_row.requester_ref,
          request_row.branch_id::text,
          request_row.work_location_id::text,
          request_row.reason,
          request_row.justification,
          request_row.request_date,
          request_row.due_date,
          request_row.status::text AS status,
          request_row.completed_at,
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', request_function.id::text,
                  'funcaoId', request_function.job_function_id::text,
                  'tipoContratacao',
                    CASE request_function.hiring_type
                      WHEN 'EFFECTIVE'::"RecruitmentHiringType" THEN 'EFETIVO'
                      WHEN 'COMMISSIONED'::"RecruitmentHiringType" THEN 'COMISSIONADO'
                      WHEN 'CONTRACTOR'::"RecruitmentHiringType" THEN 'TERCEIRIZADO'
                      WHEN 'INTERN'::"RecruitmentHiringType" THEN 'ESTAGIO'
                    END,
                  'quantidadeVagas', request_function.vacancy_count,
                  'requisitos', request_function.requirements,
                  'turnoId', request_function.shift_id::text
                )
                ORDER BY request_function.created_at ASC
              )
              FROM created_functions request_function
            ),
            '[]'::jsonb
          ) AS functions
        FROM created_request request_row
        `,
        [
          input.solicitanteId.trim(),
          input.filialId ?? '',
          input.lotacaoId ?? '',
          input.motivo.trim(),
          input.justificativa.trim(),
          input.dataEntrada,
          input.dataLimite ?? '',
          JSON.stringify(
            input.funcoesRequisitadas.map((entry) => ({
              funcao_id: entry.funcaoId ?? '',
              tipo_contratacao: entry.tipoContratacao,
              quantidade_vagas: entry.quantidadeVagas,
              requisitos: entry.requisitos ?? '',
              turno_id: entry.turnoId ?? '',
            })),
          ),
        ],
      );

      return this.toRequestSummary(rows[0]);
    } catch (error: unknown) {
      this.handleConstraintError(error, 'Recruitment request already exists');
      throw error;
    }
  }

  async forwardRequest(
    requestId: string,
    actorUsername?: string,
  ): Promise<RecruitmentRequestSummary> {
    this.ensureDatabase();

    const current = await this.getRequestState(requestId);
    if (!current) {
      throw new NotFoundException('Recruitment request not found');
    }
    if (current.status !== 'DRAFT') {
      throw new BadRequestException(
        'Recruitment request can only be forwarded from draft state',
      );
    }
    if (actorUsername && current.requester_ref !== actorUsername) {
      throw new ForbiddenException(
        'Only the request creator can forward the recruitment request',
      );
    }

    const rows = await this.databaseService.query<RecruitmentRequestSqlRow>(
      `
      WITH updated_request AS (
        UPDATE hr.recruitment_request
        SET status = 'IN_PROGRESS'::"RecruitmentRequestStatus",
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING *
      ),
      notification_insert AS (
        INSERT INTO public.notification (
          module_key,
          title,
          body,
          metadata
        )
        SELECT
          'recrutamento',
          'Requisicao encaminhada',
          'A requisicao de pessoal foi encaminhada para analise do RH.',
          jsonb_build_object(
            'eventKey',
            'notificacoes.requisicao.encaminhada',
            'requisicaoId',
            request_row.id::text
          )
        FROM updated_request request_row
      )
      SELECT
        request_row.id,
        request_row.requester_ref,
        request_row.branch_id::text,
        request_row.work_location_id::text,
        request_row.reason,
        request_row.justification,
        request_row.request_date,
        request_row.due_date,
        request_row.status::text AS status,
        request_row.completed_at,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', request_function.id::text,
                'funcaoId', request_function.job_function_id::text,
                'tipoContratacao',
                  CASE request_function.hiring_type
                    WHEN 'EFFECTIVE'::"RecruitmentHiringType" THEN 'EFETIVO'
                    WHEN 'COMMISSIONED'::"RecruitmentHiringType" THEN 'COMISSIONADO'
                    WHEN 'CONTRACTOR'::"RecruitmentHiringType" THEN 'TERCEIRIZADO'
                    WHEN 'INTERN'::"RecruitmentHiringType" THEN 'ESTAGIO'
                  END,
                'quantidadeVagas', request_function.vacancy_count,
                'requisitos', request_function.requirements,
                'turnoId', request_function.shift_id::text
              )
              ORDER BY request_function.created_at ASC
            )
            FROM hr.recruitment_request_function request_function
            WHERE request_function.request_id = request_row.id
          ),
          '[]'::jsonb
        ) AS functions
      FROM updated_request request_row
      `,
      [requestId],
    );

    return this.toRequestSummary(rows[0]);
  }

  async attachCandidates(
    requestId: string,
    input: AttachRecruitmentCandidatesDto,
  ): Promise<{
    requisicaoId: string;
    candidatos: RecruitmentCandidateSummary[];
  }> {
    this.ensureDatabase();

    const current = await this.getRequestState(requestId);
    if (!current) {
      throw new NotFoundException('Recruitment request not found');
    }
    if (current.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Candidates can only be attached to requests in progress',
      );
    }

    try {
      const rows =
        await this.databaseService.query<RecruitmentCandidatesSqlRow>(
          `
        WITH inserted_candidates AS (
          INSERT INTO hr.recruitment_candidate (
            request_id,
            person_ref,
            curriculum_s3_key
          )
          SELECT
            $1::uuid,
            payload.pessoa_id,
            NULLIF(payload.curriculo_s3_key, '')
          FROM jsonb_to_recordset($2::jsonb) AS payload(
            pessoa_id text,
            curriculo_s3_key text
          )
          RETURNING *
        )
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', candidate.id::text,
              'requisicaoId', candidate.request_id::text,
              'pessoaId', candidate.person_ref,
              'curriculoS3Key', candidate.curriculum_s3_key,
              'situacao',
                CASE candidate.status
                  WHEN 'PENDING'::"RecruitmentCandidateStatus" THEN 'PENDENTE'
                  WHEN 'APPROVED'::"RecruitmentCandidateStatus" THEN 'APROVADO'
                  WHEN 'REJECTED'::"RecruitmentCandidateStatus" THEN 'REPROVADO'
                END,
              'comentarioAnalise', candidate.review_comment
            )
            ORDER BY candidate.created_at ASC
          ),
          '[]'::jsonb
        ) AS candidates
        FROM inserted_candidates candidate
        `,
          [
            requestId,
            JSON.stringify(
              input.candidatos.map((entry) => ({
                pessoa_id: entry.pessoaId.trim(),
                curriculo_s3_key: entry.curriculoS3Key ?? '',
              })),
            ),
          ],
        );

      return {
        requisicaoId: requestId,
        candidatos: this.parseJsonArray<RecruitmentCandidateSummary>(
          rows[0]?.candidates,
        ),
      };
    } catch (error: unknown) {
      this.handleConstraintError(
        error,
        'Candidate is already linked to this recruitment request',
      );
      throw error;
    }
  }

  async updateCandidate(
    candidateId: string,
    input: UpdateRecruitmentCandidateDto,
  ): Promise<RecruitmentCandidateSummary> {
    this.ensureDatabase();

    const current = await this.getCandidateState(candidateId);
    if (!current) {
      throw new NotFoundException('Recruitment candidate not found');
    }
    if (current.request_status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Candidate analysis can only be updated while the request is in progress',
      );
    }

    const rows = await this.databaseService.query<RecruitmentCandidateSqlRow>(
      `
      UPDATE hr.recruitment_candidate candidate
      SET
        status =
          CASE $2
            WHEN 'PENDENTE' THEN 'PENDING'::"RecruitmentCandidateStatus"
            WHEN 'APROVADO' THEN 'APPROVED'::"RecruitmentCandidateStatus"
            WHEN 'REPROVADO' THEN 'REJECTED'::"RecruitmentCandidateStatus"
          END,
        review_comment = $3,
        updated_at = now()
      FROM hr.recruitment_request request_row
      WHERE candidate.id = $1::uuid
        AND request_row.id = candidate.request_id
      RETURNING
        candidate.id,
        candidate.request_id,
        candidate.person_ref,
        candidate.curriculum_s3_key,
        candidate.status::text AS status,
        candidate.review_comment
      `,
      [candidateId, input.situacao, input.comentarioAnalise?.trim() ?? ''],
    );

    return this.toCandidateSummary(rows[0]);
  }

  async concludeRequest(requestId: string): Promise<RecruitmentRequestSummary> {
    this.ensureDatabase();

    const current = await this.getRequestState(requestId);
    if (!current) {
      throw new NotFoundException('Recruitment request not found');
    }
    if (current.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Recruitment request can only be concluded from in-progress state',
      );
    }

    const approvedCount = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.recruitment_candidate
      WHERE request_id = $1::uuid
        AND status = 'APPROVED'::"RecruitmentCandidateStatus"
      `,
      [requestId],
    );
    if (Number(approvedCount[0]?.total ?? 0) === 0) {
      throw new BadRequestException(
        'Recruitment request requires at least one approved candidate before conclusion',
      );
    }

    const rows = await this.databaseService.query<RecruitmentRequestSqlRow>(
      `
      WITH updated_request AS (
        UPDATE hr.recruitment_request
        SET status = 'COMPLETED'::"RecruitmentRequestStatus",
            completed_at = now(),
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING *
      ),
      notification_insert AS (
        INSERT INTO public.notification (
          module_key,
          title,
          body,
          metadata
        )
        SELECT
          'recrutamento',
          'Requisicao concluida',
          'A analise da requisicao de pessoal foi concluida.',
          jsonb_build_object(
            'eventKey',
            'notificacoes.requisicao.concluida',
            'requisicaoId',
            request_row.id::text,
            'requesterRef',
            request_row.requester_ref
          )
        FROM updated_request request_row
      )
      SELECT
        request_row.id,
        request_row.requester_ref,
        request_row.branch_id::text,
        request_row.work_location_id::text,
        request_row.reason,
        request_row.justification,
        request_row.request_date,
        request_row.due_date,
        request_row.status::text AS status,
        request_row.completed_at,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', request_function.id::text,
                'funcaoId', request_function.job_function_id::text,
                'tipoContratacao',
                  CASE request_function.hiring_type
                    WHEN 'EFFECTIVE'::"RecruitmentHiringType" THEN 'EFETIVO'
                    WHEN 'COMMISSIONED'::"RecruitmentHiringType" THEN 'COMISSIONADO'
                    WHEN 'CONTRACTOR'::"RecruitmentHiringType" THEN 'TERCEIRIZADO'
                    WHEN 'INTERN'::"RecruitmentHiringType" THEN 'ESTAGIO'
                  END,
                'quantidadeVagas', request_function.vacancy_count,
                'requisitos', request_function.requirements,
                'turnoId', request_function.shift_id::text
              )
              ORDER BY request_function.created_at ASC
            )
            FROM hr.recruitment_request_function request_function
            WHERE request_function.request_id = request_row.id
          ),
          '[]'::jsonb
        ) AS functions
      FROM updated_request request_row
      `,
      [requestId],
    );

    return this.toRequestSummary(rows[0]);
  }

  private async getRequestState(
    requestId: string,
  ): Promise<RecruitmentRequestStateRow | null> {
    const rows = await this.databaseService.query<RecruitmentRequestStateRow>(
      `
      SELECT id, requester_ref, status::text AS status
      FROM hr.recruitment_request
      WHERE id = $1::uuid
      `,
      [requestId],
    );
    return rows[0] ?? null;
  }

  private async getCandidateState(
    candidateId: string,
  ): Promise<RecruitmentCandidateStateRow | null> {
    const rows = await this.databaseService.query<RecruitmentCandidateStateRow>(
      `
      SELECT
        candidate.id,
        candidate.request_id,
        request_row.status::text AS request_status
      FROM hr.recruitment_candidate candidate
      JOIN hr.recruitment_request request_row
        ON request_row.id = candidate.request_id
      WHERE candidate.id = $1::uuid
      `,
      [candidateId],
    );
    return rows[0] ?? null;
  }

  private toRequestSummary(
    row: RecruitmentRequestSqlRow | undefined,
  ): RecruitmentRequestSummary {
    if (!row) {
      throw new NotFoundException('Recruitment request not found');
    }

    return {
      id: row.id,
      solicitanteId: row.requester_ref,
      filialId: row.branch_id,
      lotacaoId: row.work_location_id,
      motivo: row.reason,
      justificativa: row.justification,
      dataEntrada: this.toDateOnly(row.request_date),
      dataLimite: row.due_date ? this.toDateOnly(row.due_date) : null,
      situacao: this.toApiRequestStatus(row.status),
      concluidoEm: row.completed_at ? this.toIso(row.completed_at) : null,
      funcoesRequisitadas: this.parseJsonArray<RecruitmentFunctionRow>(
        row.functions,
      ),
    };
  }

  private toCandidateSummary(
    row: RecruitmentCandidateSqlRow | undefined,
  ): RecruitmentCandidateSummary {
    if (!row) {
      throw new NotFoundException('Recruitment candidate not found');
    }

    return {
      id: row.id,
      requisicaoId: row.request_id,
      pessoaId: row.person_ref,
      curriculoS3Key: row.curriculum_s3_key,
      situacao: this.toApiCandidateStatus(row.status),
      comentarioAnalise: row.review_comment,
    };
  }

  private parseJsonArray<T>(value: T[] | string | null | undefined): T[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return JSON.parse(value) as T[];
  }

  private toApiRequestStatus(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'RASCUNHO';
      case 'IN_PROGRESS':
        return 'EM_PROCESSO';
      case 'COMPLETED':
        return 'CONCLUIDO';
      case 'CANCELED':
        return 'CANCELADO';
      default:
        return status;
    }
  }

  private toApiCandidateStatus(
    status: string,
  ): RecruitmentCandidateStatusInput {
    switch (status) {
      case 'PENDING':
        return 'PENDENTE';
      case 'APPROVED':
        return 'APROVADO';
      case 'REJECTED':
        return 'REPROVADO';
      default:
        throw new BadRequestException(
          `Unsupported candidate status: ${status}`,
        );
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for recruitment operations',
      );
    }
  }

  private toDateOnly(value: Date | string): string {
    const normalized =
      value instanceof Date ? value.toISOString() : String(value);
    return normalized.slice(0, 10);
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private handleConstraintError(error: unknown, message: string): void {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      throw new ConflictException(message);
    }
  }
}
