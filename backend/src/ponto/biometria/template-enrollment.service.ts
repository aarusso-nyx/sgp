import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import type { EnrollBiometricTemplateDto } from './biometria.dto';
import {
  encryptPontoTemplate,
  extractPontoBiometricTemplate,
} from './biometric-template';
import { PontoBiometricConsentService } from './consent.service';

interface TemplateRow extends QueryResultRow {
  id: string;
  employee_id: string;
  kind: 'FINGERPRINT' | 'PALM_VEIN';
  quality_score: string;
  captured_at: Date | string;
  status: string;
  encrypted_differs: boolean;
}

export interface EmployeeBiometricTemplateSummary {
  id: string;
  employeeId: string;
  kind: 'FINGERPRINT' | 'PALM_VEIN';
  qualityScore: string;
  capturedAt: string;
  status: string;
}

@Injectable()
export class TemplateEnrollmentService {
  constructor(
    private readonly database: DatabaseService,
    private readonly consentService: PontoBiometricConsentService,
  ) {}

  async enroll(
    input: EnrollBiometricTemplateDto,
  ): Promise<EmployeeBiometricTemplateSummary> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      await this.consentService.assertActiveConsent(client, input.employeeId);
      const extracted = extractPontoBiometricTemplate(
        input.kind,
        input.sampleBase64,
      );
      const minimumQuality = input.minimumQuality ?? 0.65;
      if (Number(extracted.qualityScore) < minimumQuality) {
        throw new BadRequestException(
          'Biometric sample quality is below threshold',
        );
      }
      const cipher = encryptPontoTemplate(
        extracted.template,
        input.templateKmsKeyId.trim(),
      );
      const rows = await client.query<TemplateRow>(
        `
        INSERT INTO ponto.employee_biometric_template (
          employee_id,
          kind,
          template_cipher,
          template_kms_key_id,
          quality_score
        )
        VALUES (
          $1::uuid,
          $2::ponto.biometric_kind,
          $3::bytea,
          $4,
          $5::numeric(18,6)
        )
        RETURNING id::text, employee_id::text, kind::text, quality_score::text,
                  captured_at, status::text, template_cipher <> $6::bytea AS encrypted_differs
        `,
        [
          input.employeeId,
          input.kind,
          cipher,
          input.templateKmsKeyId.trim(),
          extracted.qualityScore,
          extracted.template,
        ],
      );
      AuditMutationContextStore.markMutationAudited();
      const row = rows.rows[0];
      if (!row.encrypted_differs) {
        throw new BadRequestException(
          'Biometric template must be encrypted at rest',
        );
      }
      return this.toSummary(row);
    });
  }

  async list(employeeId?: string): Promise<EmployeeBiometricTemplateSummary[]> {
    this.ensureDatabase();
    const rows = await this.database.query<TemplateRow>(
      `
      SELECT id::text, employee_id::text, kind::text, quality_score::text,
             captured_at, status::text, true AS encrypted_differs
      FROM ponto.employee_biometric_template
      WHERE ($1::uuid IS NULL OR employee_id = $1::uuid)
      ORDER BY captured_at DESC
      `,
      [employeeId ?? null],
    );
    return rows.map((row) => this.toSummary(row));
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }

  private toSummary(row: TemplateRow): EmployeeBiometricTemplateSummary {
    return {
      id: row.id,
      employeeId: row.employee_id,
      kind: row.kind,
      qualityScore: row.quality_score,
      capturedAt: formatInstantIso(row.captured_at),
      status: row.status,
    };
  }
}
