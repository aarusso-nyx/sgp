import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import type {
  AnalyzeAudioDto,
  AnalyzeFrameDto,
  ProctoringEventKind,
  ProctoringSeverity,
} from './online-exam.dto';

interface EventRow extends QueryResultRow {
  id: string;
  kind: string;
  severity: string;
  ai_score: string;
}

export interface AiFlagResult {
  id: string;
  kind: ProctoringEventKind;
  severity: ProctoringSeverity;
  aiScore: string;
}

@Injectable()
export class AiFlagsService {
  constructor(private readonly database: DatabaseService) {}

  async analyzeAudio(input: AnalyzeAudioDto): Promise<AiFlagResult | null> {
    const score =
      input.voiceMismatchScore ?? this.voiceMismatchScore(input.transcript);
    if (score < 0.85) return null;
    return this.insertFlag(input.sessionId, {
      kind: 'VOICE_MISMATCH',
      severity: 'SEVERE',
      evidenceRef: input.evidenceRef ?? 'audio-transcript://local',
      aiScore: score,
    });
  }

  async analyzeFrame(input: AnalyzeFrameDto): Promise<AiFlagResult | null> {
    if (input.metrics['screenShareActive'] === false) {
      return this.insertFlag(input.sessionId, {
        kind: 'SCREEN_SHARE_LOST',
        severity: 'SEVERE',
        evidenceRef: input.evidenceRef ?? 'frame://screen-share',
        aiScore: 1,
      });
    }
    if (Number(input.metrics['gazeOffScreenScore'] ?? 0) >= 0.8) {
      return this.insertFlag(input.sessionId, {
        kind: 'GAZE_OFF_SCREEN',
        severity: 'WARN',
        evidenceRef: input.evidenceRef ?? 'frame://gaze',
        aiScore: Number(input.metrics['gazeOffScreenScore']),
      });
    }
    if (input.metrics['prohibitedAppVisible'] === true) {
      return this.insertFlag(input.sessionId, {
        kind: 'PROHIBITED_APP',
        severity: 'SEVERE',
        evidenceRef: input.evidenceRef ?? 'frame://application',
        aiScore: 1,
      });
    }
    return null;
  }

  private async insertFlag(
    sessionId: string,
    flag: {
      kind: ProctoringEventKind;
      severity: ProctoringSeverity;
      evidenceRef: string;
      aiScore: number;
    },
  ): Promise<AiFlagResult> {
    this.ensureDatabase();
    const rows = await this.database.query<EventRow>(
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
        now(),
        $2::recrutamento.proctoring_event_kind,
        $3::recrutamento.proctoring_severity,
        $4,
        $5::numeric(18,6),
        'PENDING'::recrutamento.proctoring_reviewer_decision
      FROM recrutamento.online_exam_session session
      WHERE session.id = $1::uuid
      RETURNING id::text, kind::text, severity::text, ai_score::text
      `,
      [
        sessionId,
        flag.kind,
        flag.severity,
        flag.evidenceRef,
        flag.aiScore.toFixed(6),
      ],
    );
    AuditMutationContextStore.markMutationAudited();
    return {
      id: rows[0].id,
      kind: rows[0].kind as ProctoringEventKind,
      severity: rows[0].severity as ProctoringSeverity,
      aiScore: rows[0].ai_score,
    };
  }

  private voiceMismatchScore(transcript: string): number {
    const normalized = transcript.toLowerCase();
    if (
      normalized.includes('[other_voice]') ||
      normalized.includes('voice_mismatch') ||
      normalized.includes('voz de terceiro')
    ) {
      return 0.95;
    }
    return 0;
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
