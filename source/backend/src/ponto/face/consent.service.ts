import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import type { CreateFaceConsentDto } from './face.dto';

interface ConsentRow extends QueryResultRow {
  id: string;
  employee_id: string;
  consent_version: string;
  consent_at: Date | string;
  withdrawn_at: Date | string | null;
}

interface FaceStatusRow extends QueryResultRow {
  employee_id: string;
  status: string | null;
  captured_at: Date | string | null;
  model_id: string | null;
  model_version: string | null;
}

@Injectable()
export class FaceConsentService {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateFaceConsentDto): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.query<ConsentRow>(
      `
      INSERT INTO ponto.face_consent (employee_id, consent_version, consent_at)
      VALUES ($1::uuid, $2, COALESCE($3::timestamptz, now()))
      RETURNING id::text, employee_id::text, consent_version, consent_at, withdrawn_at
      `,
      [input.employeeId, input.consentVersion.trim(), input.consentAt ?? null],
    );
    AuditMutationContextStore.markMutationAudited();
    return this.toSummary(rows[0]);
  }

  async withdraw(employeeId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const rows = await client.query<ConsentRow>(
        `
        UPDATE ponto.face_consent
        SET withdrawn_at = COALESCE(withdrawn_at, now())
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND employee_id = $1::uuid
          AND withdrawn_at IS NULL
        RETURNING id::text, employee_id::text, consent_version, consent_at, withdrawn_at
        `,
        [employeeId],
      );
      const revoked = await this.cryptoShredTemplates(client, employeeId);
      const row = rows.rows[0];
      if (!row && revoked === 0) {
        throw new NotFoundException(
          'Active face consent or template not found',
        );
      }
      AuditMutationContextStore.markMutationAudited();
      return {
        ...(row ? this.toSummary(row) : { employeeId }),
        revokedTemplates: revoked,
      };
    });
  }

  async status(employeeId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.query<FaceStatusRow>(
      `
      SELECT $1::uuid::text AS employee_id,
             template.status::text,
             template.captured_at,
             template.model_id,
             template.model_version
      FROM (SELECT 1) seed
      LEFT JOIN LATERAL (
        SELECT status, captured_at, model_id, model_version
        FROM ponto.employee_face_template
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND employee_id = $1::uuid
        ORDER BY captured_at DESC
        LIMIT 1
      ) template ON true
      `,
      [employeeId],
    );
    const row = rows[0];
    return {
      employeeId: row.employee_id,
      status: row.status,
      capturedAt: row.captured_at ? formatInstantIso(row.captured_at) : null,
      modelId: row.model_id,
      modelVersion: row.model_version,
    };
  }

  async assertActiveConsent(
    client: PoolClient,
    employeeId: string,
  ): Promise<void> {
    if (await this.hasActiveConsent(client, employeeId)) return;
    await this.auditConsentBlocked(client, employeeId);
    throw new ForbiddenException(
      'Active facial recognition consent is required',
    );
  }

  async hasActiveConsent(
    client: PoolClient,
    employeeId: string,
  ): Promise<boolean> {
    const rows = await client.query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM ponto.face_consent
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND employee_id = $1::uuid
          AND withdrawn_at IS NULL
      )
      `,
      [employeeId],
    );
    return rows.rows[0]?.exists === true;
  }

  private async cryptoShredTemplates(
    client: PoolClient,
    employeeId: string,
  ): Promise<number> {
    const rows = await client.query(
      `
      UPDATE ponto.employee_face_template
      SET status = 'REVOKED'::ponto.face_template_status,
          embedding_cipher = digest(embedding_kms_key_id || id::text, 'sha256'),
          embedding_kms_key_id = 'destroyed:' || id::text
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
        AND status = 'ACTIVE'::ponto.face_template_status
      `,
      [employeeId],
    );
    return rows.rowCount ?? 0;
  }

  private async auditConsentBlocked(
    client: PoolClient,
    employeeId: string,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'REJECT',
        'ponto.face.match_without_consent',
        $1,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'ponto.face_match',
        NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('employeeId', $1)
      )
      `,
      [employeeId],
    );
  }

  private toSummary(row: ConsentRow): Record<string, unknown> {
    return {
      id: row.id,
      employeeId: row.employee_id,
      consentVersion: row.consent_version,
      consentAt: formatInstantIso(row.consent_at),
      withdrawnAt: row.withdrawn_at ? formatInstantIso(row.withdrawn_at) : null,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
