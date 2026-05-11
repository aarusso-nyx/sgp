import { BadRequestException, NotFoundException } from '@nestjs/common';

import { RecruitmentCandidateStatusInput } from './recruitment.dto';
import {
  RecruitmentCandidateSqlRow,
  RecruitmentCandidateSummary,
  RecruitmentFunctionRow,
  RecruitmentRequestSqlRow,
  RecruitmentRequestSummary,
} from './recruitment.types';

export class RecruitmentMapper {
  toRequestSummary(
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

  toCandidateSummary(
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

  parseJsonArray<T>(value: T[] | string | null | undefined): T[] {
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
}
