import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import type { CaptureBiometricDto } from './biometria.dto';
import { BiometricConsentService } from './consent.service';
import {
  encryptTemplate,
  extractBiometricTemplate,
} from './biometric-template';

interface CaptureRow extends QueryResultRow {
  id: string;
  quality_score: string;
  captured_at: Date | string;
  retention_until: Date | string;
}

@Injectable()
export class BiometricCaptureService {
  constructor(
    private readonly database: DatabaseService,
    private readonly consentService: BiometricConsentService,
  ) {}

  async capture(input: CaptureBiometricDto): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      await this.consentService.assertActiveConsent(client, input.candidatoId);
      const extracted = extractBiometricTemplate(
        input.kind,
        input.sampleBase64,
      );
      const cipher = encryptTemplate(
        extracted.template,
        input.templateKmsKeyId.trim(),
      );
      const rows = await client.query<CaptureRow>(
        `
        INSERT INTO recrutamento.candidate_biometric (
          tenant_id,
          candidato_id,
          kind,
          template_cipher,
          template_kms_key_id,
          quality_score,
          capture_device_ref,
          retention_until
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2::recrutamento.biometric_kind,
          $3::bytea,
          $4,
          $5::numeric(18,6),
          $6,
          $7::timestamptz
        )
        RETURNING id::text, quality_score::text, captured_at, retention_until
        `,
        [
          input.candidatoId,
          input.kind,
          cipher,
          input.templateKmsKeyId.trim(),
          extracted.qualityScore,
          input.captureDeviceRef.trim(),
          input.retentionUntil,
        ],
      );
      const row = rows.rows[0]!;
      return {
        id: row.id,
        kind: input.kind,
        qualityScore: row.quality_score,
        capturedAt: row.captured_at,
        retentionUntil: row.retention_until,
      };
    });
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
