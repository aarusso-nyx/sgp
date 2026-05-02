import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import type { MatchBiometricDto } from './biometria.dto';
import {
  decryptTemplate,
  extractBiometricTemplate,
  scoreBiometricTemplates,
} from './biometric-template';

interface StoredTemplateRow extends QueryResultRow {
  template_cipher: Buffer;
  template_kms_key_id: string;
}

export interface BiometricMatchResult {
  matched: boolean;
  score: string;
  threshold: string;
  decision: 'ACCEPT' | 'REJECT' | 'MANUAL_REVIEW';
}

@Injectable()
export class BiometricMatcherService {
  constructor(private readonly database: DatabaseService) {}

  async match(input: MatchBiometricDto): Promise<BiometricMatchResult> {
    this.ensureDatabase();
    return this.database.transaction(async (client) =>
      this.matchWithClient(client, input),
    );
  }

  async matchWithClient(
    client: PoolClient,
    input: MatchBiometricDto,
  ): Promise<BiometricMatchResult> {
    const threshold = Number(
      input.threshold ?? (input.kind === 'FACE' ? '0.7' : '0.7'),
    );
    const storedRows = await client.query<StoredTemplateRow>(
      `
      SELECT template_cipher, template_kms_key_id
      FROM recrutamento.candidate_biometric
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND candidato_id = $1::uuid
        AND kind = $2::recrutamento.biometric_kind
        AND status = 'ACTIVE'::recrutamento.biometric_status
      ORDER BY captured_at DESC
      LIMIT 1
      `,
      [input.candidatoId, input.kind],
    );
    const probe = extractBiometricTemplate(input.kind, input.sampleBase64);
    const stored = storedRows.rows[0];
    const score = stored
      ? scoreBiometricTemplates(
          probe.template,
          decryptTemplate(stored.template_cipher, stored.template_kms_key_id),
        )
      : 0;
    const decision: BiometricMatchResult['decision'] =
      score >= threshold
        ? 'ACCEPT'
        : score >= threshold * 0.85
          ? 'MANUAL_REVIEW'
          : 'REJECT';
    const matched = decision === 'ACCEPT';

    await client.query(
      `
      INSERT INTO recrutamento.biometric_match_attempt (
        tenant_id, candidato_id, exam_session_id, matched, score, threshold, decision
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        NULLIF($2, '')::uuid,
        $3,
        $4::numeric(18,6),
        $5::numeric(18,6),
        $6::recrutamento.biometric_match_decision
      )
      `,
      [
        input.candidatoId,
        input.examSessionId ?? '',
        matched,
        score.toFixed(6),
        threshold.toFixed(6),
        decision,
      ],
    );

    if (!matched) {
      await this.auditFraudBurst(client, input.candidatoId);
    }

    return {
      matched,
      score: score.toFixed(6),
      threshold: threshold.toFixed(6),
      decision,
    };
  }

  private async auditFraudBurst(
    client: PoolClient,
    candidatoId: string,
  ): Promise<void> {
    const failures = await client.query<{ count: string }>(
      `
      SELECT count(*)::text
      FROM (
        SELECT matched
        FROM recrutamento.biometric_match_attempt
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND candidato_id = $1::uuid
        ORDER BY occurred_at DESC, id DESC
        LIMIT 5
      ) recent
      WHERE matched = false
      `,
      [candidatoId],
    );
    if (Number(failures.rows[0]?.count ?? 0) < 5) return;
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'REJECT',
        'recrutamento.biometric.fraud_suspect',
        $1,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'recrutamento.biometric_match_attempt',
        NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('candidatoId', $1, 'consecutiveFailures', 5)
      )
      `,
      [candidatoId],
    );
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
