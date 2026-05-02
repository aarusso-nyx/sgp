import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { TimeRecordHashService } from '../time-record/time-record-hash.service';
import { FaceConsentService } from './consent.service';
import type { FaceClockInDto, MatchFaceDto } from './face.dto';
import {
  cosineSimilarity,
  decryptFaceEmbedding,
  extractLocalFaceEmbedding,
} from './face-template';
import { FaceLivenessService } from './liveness.service';
import { FaceThresholdAdminService } from './threshold-admin.service';

interface StoredTemplateRow extends QueryResultRow {
  embedding_cipher: Buffer;
  embedding_kms_key_id: string;
}

interface FaceMatchRow extends QueryResultRow {
  id: string;
  decision: 'ACCEPT' | 'REJECT' | 'MANUAL_REVIEW';
  time_record_id: string | null;
}

interface NsrRow extends QueryResultRow {
  next_nsr: string;
}

export interface FaceMatchResult {
  id: string;
  timeRecordId: string | null;
  score: string;
  threshold: string;
  livenessPassed: boolean;
  decision: 'ACCEPT' | 'REJECT' | 'MANUAL_REVIEW';
}

@Injectable()
export class FaceMatcherService {
  constructor(
    private readonly database: DatabaseService,
    private readonly consentService: FaceConsentService,
    private readonly livenessService: FaceLivenessService,
    private readonly thresholdService: FaceThresholdAdminService,
    private readonly timeRecordHashService: TimeRecordHashService,
  ) {}

  async match(input: MatchFaceDto): Promise<FaceMatchResult> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const result = await this.matchWithClient(client, {
        ...input,
        recordedAt: null,
      });
      AuditMutationContextStore.markMutationAudited();
      return result;
    });
  }

  async clock(input: FaceClockInDto): Promise<FaceMatchResult> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const result = await this.matchWithClient(client, {
        employeeId: input.employeeId,
        frames: input.frames,
        deviceId: input.deviceId,
        recordedAt: input.occurredAt,
      });
      AuditMutationContextStore.markMutationAudited();
      return result;
    });
  }

  private async matchWithClient(
    client: PoolClient,
    input: MatchFaceDto & { recordedAt: string | null },
  ): Promise<FaceMatchResult> {
    const config = await this.thresholdService.getCurrent(client);
    const threshold = Number(config.threshold);
    const liveness = this.livenessService.verify(input.frames);
    const consent = await this.consentService.hasActiveConsent(
      client,
      input.employeeId,
    );
    if (!consent) {
      await this.consentService.assertActiveConsent(client, input.employeeId);
    }

    let score = 0;
    if (liveness.passed || !config.livenessRequired) {
      const stored = await this.findActiveTemplate(client, input.employeeId);
      if (stored) {
        const probe = extractLocalFaceEmbedding(input.frames[0].imageBase64);
        score = cosineSimilarity(
          probe.embedding,
          decryptFaceEmbedding(
            stored.embedding_cipher,
            stored.embedding_kms_key_id,
          ),
        );
      }
    }

    const decision = this.decide(
      score,
      threshold,
      liveness.passed,
      config.livenessRequired,
    );
    const timeRecordId =
      decision === 'ACCEPT'
        ? await this.resolveTimeRecord(client, input, score, threshold)
        : (input.timeRecordId ?? null);
    const row = await this.insertMatch(client, input, {
      timeRecordId,
      score,
      threshold,
      livenessPassed: liveness.passed,
      decision,
    });
    return {
      id: row.id,
      timeRecordId: row.time_record_id,
      score: score.toFixed(6),
      threshold: threshold.toFixed(6),
      livenessPassed: liveness.passed,
      decision: row.decision,
    };
  }

  private async findActiveTemplate(
    client: PoolClient,
    employeeId: string,
  ): Promise<StoredTemplateRow | null> {
    const rows = await client.query<StoredTemplateRow>(
      `
      SELECT embedding_cipher, embedding_kms_key_id
      FROM ponto.employee_face_template
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
        AND status = 'ACTIVE'::ponto.face_template_status
      ORDER BY captured_at DESC
      LIMIT 1
      `,
      [employeeId],
    );
    return rows.rows[0] ?? null;
  }

  private decide(
    score: number,
    threshold: number,
    livenessPassed: boolean,
    livenessRequired: boolean,
  ): FaceMatchResult['decision'] {
    if (livenessRequired && !livenessPassed) return 'REJECT';
    if (score >= threshold) return 'ACCEPT';
    if (score >= threshold * 0.9) return 'MANUAL_REVIEW';
    return 'REJECT';
  }

  private async resolveTimeRecord(
    client: PoolClient,
    input: MatchFaceDto & { recordedAt: string | null },
    score: number,
    threshold: number,
  ): Promise<string | null> {
    if (input.timeRecordId) return input.timeRecordId;
    if (!input.recordedAt) return null;
    const nsr = await this.nextNsr(client, input.employeeId);
    const record = await this.timeRecordHashService.createWithClient(
      client,
      {
        employeeId: input.employeeId,
        recordedAt: input.recordedAt,
        source: 'REP_A',
        nsr,
        rawPayload: {
          facialClockIn: {
            deviceId: input.deviceId ?? null,
            score: score.toFixed(6),
            threshold: threshold.toFixed(6),
            livenessPassed: true,
            model: 'local-insightface-facenet',
          },
        },
      },
      false,
    );
    return record.timeRecordId;
  }

  private async nextNsr(
    client: PoolClient,
    employeeId: string,
  ): Promise<number> {
    const result = await client.query<NsrRow>(
      `
      SELECT COALESCE(MAX(nsr), 0) + 1 AS next_nsr
      FROM ponto.time_record
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
      `,
      [employeeId],
    );
    return Number(result.rows[0]?.next_nsr ?? '1');
  }

  private async insertMatch(
    client: PoolClient,
    input: MatchFaceDto,
    decision: {
      timeRecordId: string | null;
      score: number;
      threshold: number;
      livenessPassed: boolean;
      decision: FaceMatchResult['decision'];
    },
  ): Promise<FaceMatchRow> {
    const rows = await client.query<FaceMatchRow>(
      `
      INSERT INTO ponto.face_match (
        time_record_id,
        employee_id,
        score,
        threshold,
        liveness_passed,
        decision,
        device_id
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::numeric(18,6),
        $4::numeric(18,6),
        $5::boolean,
        $6::ponto.face_match_decision,
        NULLIF($7, '')
      )
      RETURNING id::text, decision::text AS decision, time_record_id::text
      `,
      [
        decision.timeRecordId,
        input.employeeId,
        decision.score.toFixed(6),
        decision.threshold.toFixed(6),
        decision.livenessPassed,
        decision.decision,
        input.deviceId ?? '',
      ],
    );
    return rows.rows[0];
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
