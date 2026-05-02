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
import type { CreateBiometricConsentDto } from './biometria.dto';

interface ConsentRow extends QueryResultRow {
  id: string;
  employee_id: string;
  consent_version: string;
  consent_at: Date | string;
  withdrawn_at: Date | string | null;
}

@Injectable()
export class PontoBiometricConsentService {
  constructor(private readonly database: DatabaseService) {}

  async create(
    input: CreateBiometricConsentDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.query<ConsentRow>(
      `
      INSERT INTO ponto.biometric_consent (
        employee_id, consent_version, consent_at
      )
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
        UPDATE ponto.biometric_consent
        SET withdrawn_at = COALESCE(withdrawn_at, now())
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND employee_id = $1::uuid
          AND withdrawn_at IS NULL
        RETURNING id::text, employee_id::text, consent_version, consent_at, withdrawn_at
        `,
        [employeeId],
      );
      await client.query(
        `
        UPDATE ponto.employee_biometric_template
        SET status = 'REVOKED'::ponto.biometric_template_status,
            template_kms_key_id = 'destroyed:' || id::text,
            template_cipher = decode('', 'hex')
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND employee_id = $1::uuid
          AND status = 'ACTIVE'::ponto.biometric_template_status
        `,
        [employeeId],
      );
      const row = rows.rows[0];
      if (!row)
        throw new NotFoundException('Active biometric consent not found');
      AuditMutationContextStore.markMutationAudited();
      return this.toSummary(row);
    });
  }

  async assertActiveConsent(
    client: PoolClient,
    employeeId: string,
  ): Promise<void> {
    const rows = await client.query<{ id: string }>(
      `
      SELECT id::text
      FROM ponto.biometric_consent
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
        AND withdrawn_at IS NULL
      ORDER BY consent_at DESC
      LIMIT 1
      `,
      [employeeId],
    );
    if (!rows.rows[0]) {
      throw new ForbiddenException('Active biometric consent is required');
    }
  }

  async hasActiveConsent(
    client: PoolClient,
    employeeId: string,
  ): Promise<boolean> {
    const rows = await client.query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM ponto.biometric_consent
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND employee_id = $1::uuid
          AND withdrawn_at IS NULL
      )
      `,
      [employeeId],
    );
    return rows.rows[0]?.exists === true;
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
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
}
