import { ConflictException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  AttachRecruitmentCandidatesDto,
  CreateRecruitmentRequestDto,
  UpdateRecruitmentCandidateDto,
} from './recruitment.dto';
import { RecruitmentLifecycle } from './recruitment.lifecycle';
import { RecruitmentMapper } from './recruitment.mapper';
import {
  RecruitmentCandidateSqlRow,
  RecruitmentCandidateSummary,
  RecruitmentCandidatesSqlRow,
  RecruitmentRequestSqlRow,
  RecruitmentRequestSummary,
} from './recruitment.types';

export type {
  RecruitmentCandidateSummary,
  RecruitmentRequestSummary,
} from './recruitment.types';

@Injectable()
export class RecruitmentService {
  private readonly lifecycle: RecruitmentLifecycle;
  private readonly mapper = new RecruitmentMapper();

  constructor(private readonly databaseService: DatabaseService) {
    this.lifecycle = new RecruitmentLifecycle(databaseService);
  }

  async createRequest(
    input: CreateRecruitmentRequestDto,
  ): Promise<RecruitmentRequestSummary> {
    this.lifecycle.ensureDatabase();

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

      return this.mapper.toRequestSummary(rows[0]);
    } catch (error: unknown) {
      this.handleConstraintError(error, 'Recruitment request already exists');
      throw error;
    }
  }

  async forwardRequest(
    requestId: string,
    actorUsername?: string,
  ): Promise<RecruitmentRequestSummary> {
    this.lifecycle.ensureDatabase();
    await this.lifecycle.requireForwardableRequest(requestId, actorUsername);

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

    return this.mapper.toRequestSummary(rows[0]);
  }

  async attachCandidates(
    requestId: string,
    input: AttachRecruitmentCandidatesDto,
  ): Promise<{
    requisicaoId: string;
    candidatos: RecruitmentCandidateSummary[];
  }> {
    this.lifecycle.ensureDatabase();
    await this.lifecycle.requireRequestInProgress(
      requestId,
      'Candidates can only be attached to requests in progress',
    );

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
        candidatos: this.mapper.parseJsonArray<RecruitmentCandidateSummary>(
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
    this.lifecycle.ensureDatabase();
    await this.lifecycle.requireCandidateAnalysisOpen(candidateId);

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

    return this.mapper.toCandidateSummary(rows[0]);
  }

  async concludeRequest(requestId: string): Promise<RecruitmentRequestSummary> {
    this.lifecycle.ensureDatabase();
    await this.lifecycle.requireConclusionReady(requestId);

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

    return this.mapper.toRequestSummary(rows[0]);
  }

  private handleConstraintError(error: unknown, message: string): void {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      throw new ConflictException(message);
    }
  }
}
