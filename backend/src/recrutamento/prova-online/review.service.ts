import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';

interface ReviewSessionRow extends QueryResultRow {
  voided_id: string;
  rescheduled_id: string;
}

@Injectable()
export class OnlineExamReviewService {
  constructor(private readonly database: DatabaseService) {}

  async timeline(sessionId: string): Promise<QueryResultRow[]> {
    this.ensureDatabase();
    return this.database.query(
      `
      SELECT
        event.id::text,
        event.occurred_at,
        event.kind::text,
        event.severity::text,
        event.evidence_ref,
        event.ai_score::text,
        event.reviewer_decision::text
      FROM recrutamento.proctoring_event event
      WHERE event.session_id = $1::uuid
      ORDER BY event.occurred_at, event.id
      `,
      [sessionId],
    );
  }

  async accept(sessionId: string): Promise<{ accepted: string }> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const updated = await client.query<{ id: string }>(
        `
        UPDATE recrutamento.proctoring_event
        SET reviewer_decision = 'ACCEPT'::recrutamento.proctoring_reviewer_decision
        WHERE session_id = $1::uuid
          AND reviewer_decision = 'PENDING'::recrutamento.proctoring_reviewer_decision
        RETURNING id::text
        `,
        [sessionId],
      );
      await client.query(
        `
        SELECT public.sgp_append_audit_event(
          'APPROVE',
          'recrutamento.online_exam_session',
          $1,
          NULL::uuid,
          NULLIF(current_setting('app.current_user_sub', true), ''),
          NULLIF(current_setting('app.current_login', true), ''),
          'recrutamento.proctoring_event',
          NULLIF(current_setting('app.request_id', true), ''),
          jsonb_build_object('acceptedEvents', $2)
        )
        `,
        [sessionId, updated.rowCount ?? 0],
      );
      AuditMutationContextStore.markMutationAudited();
      return { accepted: sessionId };
    });
  }

  async voidAndReschedule(
    sessionId: string,
    reason: string,
  ): Promise<{ voidedSessionId: string; rescheduledSessionId: string }> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const rows = await client.query<ReviewSessionRow>(
        `
        WITH voided AS (
          UPDATE recrutamento.online_exam_session
          SET status = 'VOIDED'::recrutamento.online_exam_session_status,
              ended_at = COALESCE(ended_at, now()),
              void_reason = $2
          WHERE id = $1::uuid
            AND status IN (
              'IN_PROGRESS'::recrutamento.online_exam_session_status,
              'SUBMITTED'::recrutamento.online_exam_session_status
            )
          RETURNING
            tenant_id,
            id,
            application_id,
            prova_id,
            browser_fingerprint,
            ip_address,
            user_agent
        ), rescheduled AS (
          INSERT INTO recrutamento.online_exam_session (
            tenant_id,
            application_id,
            prova_id,
            status,
            browser_fingerprint,
            ip_address,
            user_agent
          )
          SELECT
            tenant_id,
            application_id,
            prova_id,
            'SCHEDULED'::recrutamento.online_exam_session_status,
            browser_fingerprint,
            ip_address,
            user_agent
          FROM voided
          RETURNING id
        ), rejected_events AS (
          UPDATE recrutamento.proctoring_event
          SET reviewer_decision = 'REJECT'::recrutamento.proctoring_reviewer_decision
          WHERE session_id = $1::uuid
            AND reviewer_decision = 'PENDING'::recrutamento.proctoring_reviewer_decision
          RETURNING id
        )
        SELECT
          (SELECT id::text FROM voided) AS voided_id,
          (SELECT id::text FROM rescheduled) AS rescheduled_id
        `,
        [sessionId, reason.trim()],
      );
      const row = rows.rows[0];
      if (!row?.voided_id || !row.rescheduled_id) {
        throw new NotFoundException('Online exam session not found');
      }
      AuditMutationContextStore.markMutationAudited();
      return {
        voidedSessionId: row.voided_id,
        rescheduledSessionId: row.rescheduled_id,
      };
    });
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
