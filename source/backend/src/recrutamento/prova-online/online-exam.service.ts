import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { BiometricMatcherService } from '../biometria/biometric-matcher.service';
import type {
  CreateProctoringEventDto,
  OnlineExamStatus,
  ProctoringSeverity,
  StartOnlineExamDto,
  SubmitOnlineExamDto,
} from './online-exam.dto';

interface SessionRow extends QueryResultRow {
  id: string;
  application_id: string;
  prova_id: string;
  started_at: Date | string | null;
  ended_at: Date | string | null;
  status: OnlineExamStatus;
}

interface ApplicationRow extends QueryResultRow {
  tenant_id: string;
  concurso_id: string;
  candidato_id: string;
}

export interface OnlineExamSession {
  id: string;
  applicationId: string;
  provaId: string;
  startedAt: string | null;
  endedAt: string | null;
  status: OnlineExamStatus;
}

@Injectable()
export class OnlineExamService {
  constructor(
    private readonly database: DatabaseService,
    private readonly biometricMatcher: BiometricMatcherService,
  ) {}

  async start(input: StartOnlineExamDto): Promise<OnlineExamSession> {
    this.ensureDatabase();
    if (!input.recordingConsentAccepted) {
      await this.auditRejectedStartStandalone(
        input.applicationId,
        'recording_consent_missing',
      );
      throw new ForbiddenException(
        'Specific audio/video recording consent is required',
      );
    }

    const missingConstraint = this.missingConstraint(input);
    if (missingConstraint) {
      await this.auditRejectedStartStandalone(
        input.applicationId,
        'media_denied',
        {
          missingConstraint,
        },
      );
      throw new ForbiddenException(
        'Camera, microphone, and screen sharing are required',
      );
    }

    return this.database.transaction(async (client) => {
      const application = await this.getApplication(
        client,
        input.applicationId,
      );
      if (application.candidato_id !== input.candidatoId) {
        await this.auditRejectedStart(
          client,
          input.applicationId,
          'candidate_application_mismatch',
        );
        throw new ForbiddenException('Candidate does not own this application');
      }

      await this.assertProvaBelongsToConcurso(
        client,
        input.provaId,
        application.concurso_id,
      );

      const match = await this.biometricMatcher.matchWithClient(client, {
        candidatoId: input.candidatoId,
        kind: input.biometricKind ?? 'FACE',
        sampleBase64: input.biometricSampleBase64,
        threshold: '0.700000',
      });
      if (!match.matched) {
        await this.auditRejectedStart(
          client,
          input.applicationId,
          'biometric_rejected',
          { decision: match.decision, score: match.score },
        );
        throw new ForbiddenException('Candidate biometric verification failed');
      }

      const rows = await client.query<SessionRow>(
        `
        INSERT INTO recrutamento.online_exam_session (
          tenant_id,
          application_id,
          prova_id,
          started_at,
          status,
          browser_fingerprint,
          ip_address,
          user_agent
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2::uuid,
          now(),
          'IN_PROGRESS'::recrutamento.online_exam_session_status,
          $3,
          $4::inet,
          $5
        )
        RETURNING id::text, application_id::text, prova_id::text, started_at, ended_at, status::text
        `,
        [
          input.applicationId,
          input.provaId,
          input.browserFingerprint.trim(),
          input.ipAddress.trim(),
          input.userAgent.trim(),
        ],
      );
      AuditMutationContextStore.markMutationAudited();
      return this.toSession(rows.rows[0]);
    });
  }

  async recordEvent(
    sessionId: string,
    input: CreateProctoringEventDto,
  ): Promise<{ id: string; severity: ProctoringSeverity }> {
    this.ensureDatabase();
    const severity = this.eventSeverity(input);
    const rows = await this.database.query<{ id: string; severity: string }>(
      `
      INSERT INTO recrutamento.proctoring_event (
        tenant_id,
        session_id,
        occurred_at,
        kind,
        severity,
        evidence_ref,
        ai_score,
        reviewer_decision
      )
      SELECT
        session.tenant_id,
        session.id,
        COALESCE($2::timestamptz, now()),
        $3::recrutamento.proctoring_event_kind,
        $4::recrutamento.proctoring_severity,
        NULLIF($5, ''),
        COALESCE($6::numeric(18,6), 0),
        'PENDING'::recrutamento.proctoring_reviewer_decision
      FROM recrutamento.online_exam_session session
      WHERE session.id = $1::uuid
        AND session.status = 'IN_PROGRESS'::recrutamento.online_exam_session_status
      RETURNING id::text, severity::text
      `,
      [
        sessionId,
        input.occurredAt ?? null,
        input.kind,
        severity,
        input.evidenceRef?.trim() ?? '',
        input.aiScore ?? null,
      ],
    );
    if (!rows[0]) throw new NotFoundException('Online exam session not found');
    AuditMutationContextStore.markMutationAudited();
    return { id: rows[0].id, severity: rows[0].severity as ProctoringSeverity };
  }

  async submit(
    sessionId: string,
    input: SubmitOnlineExamDto,
  ): Promise<OnlineExamSession> {
    this.ensureDatabase();
    const rows = await this.database.query<SessionRow>(
      `
      UPDATE recrutamento.online_exam_session
      SET ended_at = now(),
          status = 'SUBMITTED'::recrutamento.online_exam_session_status,
          void_reason = COALESCE(NULLIF($2, ''), void_reason)
      WHERE id = $1::uuid
        AND status = 'IN_PROGRESS'::recrutamento.online_exam_session_status
      RETURNING id::text, application_id::text, prova_id::text, started_at, ended_at, status::text
      `,
      [sessionId, input.finalEvidenceRef?.trim() ?? ''],
    );
    if (!rows[0]) throw new NotFoundException('Online exam session not found');
    AuditMutationContextStore.markMutationAudited();
    return this.toSession(rows[0]);
  }

  private async getApplication(
    client: PoolClient,
    applicationId: string,
  ): Promise<ApplicationRow> {
    const rows = await client.query<ApplicationRow>(
      `
      SELECT tenant_id::text, concurso_id::text, candidato_id::text
      FROM recrutamento.inscricao
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND id = $1::uuid
        AND status = ANY(ARRAY[
          'CONFIRMED'::recrutamento.inscricao_status,
          'EXEMPT'::recrutamento.inscricao_status
        ])
      `,
      [applicationId],
    );
    const application = rows.rows[0];
    if (!application) {
      throw new NotFoundException('Confirmed application not found');
    }
    return application;
  }

  private async assertProvaBelongsToConcurso(
    client: PoolClient,
    provaId: string,
    concursoId: string,
  ): Promise<void> {
    const rows = await client.query(
      `
      SELECT 1
      FROM recrutamento.prova
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND id = $1::uuid
        AND concurso_id = $2::uuid
      LIMIT 1
      `,
      [provaId, concursoId],
    );
    if (!rows.rows[0]) {
      throw new UnprocessableEntityException(
        'Online exam prova must belong to the application contest',
      );
    }
  }

  private async auditRejectedStart(
    client: PoolClient,
    applicationId: string,
    reason: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'REJECT',
        'recrutamento.online_exam_session',
        $1,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'recrutamento.online_exam_session',
        NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('reason', $2, 'metadata', $3::jsonb)
      )
      `,
      [applicationId, reason, JSON.stringify(metadata)],
    );
    AuditMutationContextStore.markMutationAudited();
  }

  private async auditRejectedStartStandalone(
    applicationId: string,
    reason: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.database.query(
      `
      SELECT public.sgp_append_audit_event(
        'REJECT',
        'recrutamento.online_exam_session',
        $1,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'recrutamento.online_exam_session',
        NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('reason', $2, 'metadata', $3::jsonb)
      )
      `,
      [applicationId, reason, JSON.stringify(metadata)],
    );
    AuditMutationContextStore.markMutationAudited();
  }

  private missingConstraint(input: StartOnlineExamDto): string | undefined {
    if (!input.mediaConstraints.camera) return 'camera';
    if (!input.mediaConstraints.microphone) return 'microphone';
    if (!input.mediaConstraints.screenShare) return 'screenShare';
    return undefined;
  }

  private eventSeverity(input: CreateProctoringEventDto): ProctoringSeverity {
    if (input.kind === 'SCREEN_SHARE_LOST') return 'SEVERE';
    if (input.severity) return input.severity;
    if (input.kind === 'SNAPSHOT') return 'INFO';
    return 'WARN';
  }

  private toSession(row: SessionRow): OnlineExamSession {
    return {
      id: row.id,
      applicationId: row.application_id,
      provaId: row.prova_id,
      startedAt: this.dateText(row.started_at),
      endedAt: this.dateText(row.ended_at),
      status: row.status,
    };
  }

  private dateText(value: Date | string | null): string | null {
    if (value === null) return null;
    return value instanceof Date ? value.toISOString() : String(value);
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
