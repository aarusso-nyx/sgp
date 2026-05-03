import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import type { MatchBiometricTemplateDto } from './biometria.dto';
import {
  decryptPontoTemplate,
  extractPontoBiometricTemplate,
  scorePontoBiometricTemplates,
} from './biometric-template';
import { PontoBiometricConsentService } from './consent.service';

interface StoredTemplateRow extends QueryResultRow {
  template_cipher: Buffer;
  template_kms_key_id: string;
}

export interface PontoBiometricMatchResult {
  id?: string;
  matched: boolean;
  score: string;
  threshold: string;
}

export interface IngestionBiometricInput {
  employeeId: string;
  timeRecordId: string;
  kind: 'FINGERPRINT' | 'PALM_VEIN';
  sampleBase64: string;
  deviceId: string;
  threshold?: number;
}

@Injectable()
export class PontoBiometricMatcherService {
  constructor(
    private readonly database: DatabaseService,
    private readonly consentService: PontoBiometricConsentService,
  ) {}

  async match(
    input: MatchBiometricTemplateDto,
  ): Promise<PontoBiometricMatchResult> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const result = await this.matchWithClient(client, {
        employeeId: input.employeeId,
        timeRecordId: input.timeRecordId ?? null,
        kind: input.kind,
        sampleBase64: input.sampleBase64,
        deviceId: input.deviceId ?? null,
        threshold: input.threshold,
        persistWithoutConsent: true,
      });
      AuditMutationContextStore.markMutationAudited();
      return (
        result ?? { matched: false, score: '0.000000', threshold: '0.850000' }
      );
    });
  }

  async matchDuringIngestion(
    client: PoolClient,
    input: IngestionBiometricInput,
  ): Promise<PontoBiometricMatchResult | null> {
    return this.matchWithClient(client, {
      ...input,
      persistWithoutConsent: false,
    });
  }

  private async matchWithClient(
    client: PoolClient,
    input: {
      employeeId: string;
      timeRecordId: string | null;
      kind: 'FINGERPRINT' | 'PALM_VEIN';
      sampleBase64: string;
      deviceId: string | null;
      threshold?: number;
      persistWithoutConsent: boolean;
    },
  ): Promise<PontoBiometricMatchResult | null> {
    const threshold = input.threshold ?? 0.85;
    const probe = extractPontoBiometricTemplate(input.kind, input.sampleBase64);
    const hasConsent = await this.consentService.hasActiveConsent(
      client,
      input.employeeId,
    );
    if (!hasConsent && !input.persistWithoutConsent) return null;

    const storedRows = hasConsent
      ? await client.query<StoredTemplateRow>(
          `
          SELECT template_cipher, template_kms_key_id
          FROM ponto.employee_biometric_template
          WHERE tenant_id = public.sgp_current_tenant_uuid()
            AND employee_id = $1::uuid
            AND kind = $2::ponto.biometric_kind
            AND status = 'ACTIVE'::ponto.biometric_template_status
          ORDER BY captured_at DESC
          LIMIT 1
          `,
          [input.employeeId, input.kind],
        )
      : { rows: [] };
    const stored = storedRows.rows[0];
    const score =
      stored && stored.template_cipher.length > 0
        ? scorePontoBiometricTemplates(
            probe.template,
            decryptPontoTemplate(
              stored.template_cipher,
              stored.template_kms_key_id,
            ),
          )
        : 0;
    const matched = score >= threshold;

    if (!input.timeRecordId) {
      await this.auditStandaloneReject(
        client,
        input.employeeId,
        input.kind,
        matched,
      );
      return {
        matched,
        score: score.toFixed(6),
        threshold: threshold.toFixed(6),
      };
    }

    const rows = await client.query<{ id: string }>(
      `
      INSERT INTO ponto.biometric_match (
        time_record_id, employee_id, kind, score, threshold, device_id, matched
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::ponto.biometric_kind,
        $4::numeric(18,6),
        $5::numeric(18,6),
        NULLIF($6, '')::uuid,
        $7
      )
      RETURNING id::text
      `,
      [
        input.timeRecordId,
        input.employeeId,
        input.kind,
        score.toFixed(6),
        threshold.toFixed(6),
        input.deviceId ?? '',
        matched,
      ],
    );
    return {
      id: rows.rows[0]!.id,
      matched,
      score: score.toFixed(6),
      threshold: threshold.toFixed(6),
    };
  }

  private async auditStandaloneReject(
    client: PoolClient,
    employeeId: string,
    kind: string,
    matched: boolean,
  ): Promise<void> {
    if (matched) return;
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'REJECT',
        'ponto.biometric.match',
        $1,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'ponto.biometric_match',
        NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('employeeId', $1, 'kind', $2, 'matched', false)
      )
      `,
      [employeeId, kind],
    );
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
