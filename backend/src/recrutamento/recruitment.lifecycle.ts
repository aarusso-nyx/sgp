import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  CountRow,
  RecruitmentCandidateStateRow,
  RecruitmentRequestStateRow,
} from './recruitment.types';

export class RecruitmentLifecycle {
  constructor(private readonly databaseService: DatabaseService) {}

  ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for recruitment operations',
      );
    }
  }

  async requireForwardableRequest(
    requestId: string,
    actorUsername?: string,
  ): Promise<void> {
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
  }

  async requireRequestInProgress(
    requestId: string,
    invalidStateMessage: string,
  ): Promise<void> {
    const current = await this.getRequestState(requestId);
    if (!current) {
      throw new NotFoundException('Recruitment request not found');
    }
    if (current.status !== 'IN_PROGRESS') {
      throw new BadRequestException(invalidStateMessage);
    }
  }

  async requireCandidateAnalysisOpen(candidateId: string): Promise<void> {
    const current = await this.getCandidateState(candidateId);
    if (!current) {
      throw new NotFoundException('Recruitment candidate not found');
    }
    if (current.request_status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Candidate analysis can only be updated while the request is in progress',
      );
    }
  }

  async requireConclusionReady(requestId: string): Promise<void> {
    await this.requireRequestInProgress(
      requestId,
      'Recruitment request can only be concluded from in-progress state',
    );

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
}
