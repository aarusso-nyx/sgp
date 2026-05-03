import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import type { CreateBiometricConsentDto } from './biometria.dto';

interface ConsentRow extends QueryResultRow {
  id: string;
}

@Injectable()
export class BiometricConsentService {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateBiometricConsentDto): Promise<{ id: string }> {
    this.ensureDatabase();
    return this.database.transaction(async (client) =>
      this.createWithClient(client, input),
    );
  }

  async createWithClient(
    client: PoolClient,
    input: CreateBiometricConsentDto,
  ): Promise<{ id: string }> {
    const rows = await client.query<ConsentRow>(
      `
      INSERT INTO recrutamento.biometric_consent (
        tenant_id, candidato_id, consent_version, signed_doc_ref
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2,
        $3
      )
      RETURNING id::text
      `,
      [
        input.candidatoId,
        input.consentVersion.trim(),
        input.signedDocRef.trim(),
      ],
    );
    return { id: rows.rows[0]!.id };
  }

  async assertActiveConsent(
    client: PoolClient,
    candidatoId: string,
  ): Promise<void> {
    const rows = await client.query(
      `
      SELECT 1
      FROM recrutamento.biometric_consent
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND candidato_id = $1::uuid
        AND withdrawn_at IS NULL
      ORDER BY consent_at DESC
      LIMIT 1
      `,
      [candidatoId],
    );
    if (!rows.rows[0]) {
      await this.auditRejectedCapture(client, candidatoId);
      throw new ForbiddenException('Active biometric consent is required');
    }
  }

  async withdraw(candidatoId: string): Promise<{ revoked: number }> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      await client.query(
        `
        UPDATE recrutamento.biometric_consent
        SET withdrawn_at = COALESCE(withdrawn_at, now())
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND candidato_id = $1::uuid
          AND withdrawn_at IS NULL
        `,
        [candidatoId],
      );
      const revoked = await client.query<{ count: string }>(
        `
        UPDATE recrutamento.candidate_biometric
        SET status = 'REVOKED'::recrutamento.biometric_status,
            template_cipher = digest(template_kms_key_id || id::text, 'sha256'),
            template_kms_key_id = 'destroyed:' || id::text
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND candidato_id = $1::uuid
          AND status = 'ACTIVE'::recrutamento.biometric_status
        RETURNING 1
        `,
        [candidatoId],
      );
      return { revoked: revoked.rowCount ?? 0 };
    });
  }

  private async auditRejectedCapture(
    client: PoolClient,
    candidatoId: string,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'REJECT',
        'recrutamento.biometric.capture_without_consent',
        $1,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'recrutamento.candidate_biometric',
        NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('candidatoId', $1)
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
