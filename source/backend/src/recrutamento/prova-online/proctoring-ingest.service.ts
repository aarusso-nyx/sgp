import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import type { IngestProctoringArtifactDto } from './online-exam.dto';

interface ArtifactRow extends QueryResultRow {
  id: string;
  retention_until: Date | string;
}

@Injectable()
export class ProctoringIngestService {
  constructor(private readonly database: DatabaseService) {}

  async ingest(
    sessionId: string,
    input: IngestProctoringArtifactDto,
  ): Promise<{ id: string; retentionUntil: string }> {
    this.ensureDatabase();
    const rows = await this.database.query<ArtifactRow>(
      `
      INSERT INTO recrutamento.proctoring_artifact (
        tenant_id,
        session_id,
        kind,
        storage_ref,
        captured_at,
        retention_until
      )
      SELECT
        session.tenant_id,
        session.id,
        $2::recrutamento.proctoring_artifact_kind,
        $3,
        $4::timestamptz,
        GREATEST(($5::date + INTERVAL '5 years')::timestamptz, $4::timestamptz)
      FROM recrutamento.online_exam_session session
      WHERE session.id = $1::uuid
        AND session.status IN (
          'IN_PROGRESS'::recrutamento.online_exam_session_status,
          'SUBMITTED'::recrutamento.online_exam_session_status,
          'VOIDED'::recrutamento.online_exam_session_status
        )
      RETURNING id::text, retention_until
      `,
      [
        sessionId,
        input.kind,
        input.storageRef.trim(),
        input.capturedAt,
        input.editalDate,
      ],
    );
    if (!rows[0]) throw new NotFoundException('Online exam session not found');
    AuditMutationContextStore.markMutationAudited();
    return {
      id: rows[0].id,
      retentionUntil: this.dateText(rows[0].retention_until),
    };
  }

  async requestExclusion(
    sessionId: string,
    requestedAt = new Date(),
  ): Promise<
    | { status: 'PENDING'; legalBasis: string; retainedUntil: string }
    | { status: 'DELETED'; deleted: number }
  > {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const blocked = await client.query<ArtifactRow>(
        `
        SELECT retention_until
        FROM recrutamento.proctoring_artifact
        WHERE session_id = $1::uuid
          AND retention_until > $2::timestamptz
        ORDER BY retention_until DESC
        LIMIT 1
        `,
        [sessionId, requestedAt.toISOString()],
      );
      if (blocked.rows[0]) {
        await client.query(
          `
          SELECT public.sgp_append_audit_event(
            'REJECT',
            'recrutamento.proctoring_artifact.exclusion',
            $1,
            NULL::uuid,
            NULLIF(current_setting('app.current_user_sub', true), ''),
            NULLIF(current_setting('app.current_login', true), ''),
            'recrutamento.proctoring_artifact',
            NULLIF(current_setting('app.request_id', true), ''),
            jsonb_build_object('reason', 'retention_period_open', 'retentionUntil', $2)
          )
          `,
          [sessionId, this.dateText(blocked.rows[0].retention_until)],
        );
        AuditMutationContextStore.markMutationAudited();
        return {
          status: 'PENDING',
          legalBasis:
            'regular exercise of rights in public contest administrative process',
          retainedUntil: this.dateText(blocked.rows[0].retention_until),
        };
      }

      const deleted = await client.query(
        `
        DELETE FROM recrutamento.proctoring_artifact
        WHERE session_id = $1::uuid
        RETURNING 1
        `,
        [sessionId],
      );
      AuditMutationContextStore.markMutationAudited();
      return { status: 'DELETED', deleted: deleted.rowCount ?? 0 };
    });
  }

  private dateText(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : String(value);
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
