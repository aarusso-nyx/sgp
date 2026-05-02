import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import { FaceConsentService } from './consent.service';
import type { EnrollFaceTemplateDto } from './face.dto';
import {
  encryptFaceEmbedding,
  extractLocalFaceEmbedding,
} from './face-template';
import { FaceLivenessService } from './liveness.service';
import { FaceThresholdAdminService } from './threshold-admin.service';

interface FaceTemplateRow extends QueryResultRow {
  id: string;
  employee_id: string;
  model_id: string;
  model_version: string;
  captured_at: Date | string;
  status: string;
  encrypted_differs: boolean;
}

export interface FaceTemplateSummary {
  id: string;
  employeeId: string;
  modelId: string;
  modelVersion: string;
  capturedAt: string;
  status: string;
}

@Injectable()
export class FaceEnrollmentService {
  constructor(
    private readonly database: DatabaseService,
    private readonly consentService: FaceConsentService,
    private readonly livenessService: FaceLivenessService,
    private readonly thresholdService: FaceThresholdAdminService,
  ) {}

  async enroll(input: EnrollFaceTemplateDto): Promise<FaceTemplateSummary> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      await this.consentService.assertActiveConsent(client, input.employeeId);
      const threshold = await this.thresholdService.getCurrent(client);
      const liveness = this.livenessService.verify(input.frames);
      if (threshold.livenessRequired && !liveness.passed) {
        throw new BadRequestException('Facial liveness check failed');
      }
      const extracted = extractLocalFaceEmbedding(input.frames[0].imageBase64);
      const cipher = encryptFaceEmbedding(
        extracted.embedding,
        input.templateKmsKeyId.trim(),
      );
      const rows = await client.query<FaceTemplateRow>(
        `
        INSERT INTO ponto.employee_face_template (
          employee_id,
          embedding_cipher,
          embedding_kms_key_id,
          model_id,
          model_version
        )
        VALUES ($1::uuid, $2::bytea, $3, $4, $5)
        RETURNING id::text, employee_id::text, model_id, model_version,
                  captured_at, status::text,
                  embedding_cipher <> $6::bytea AS encrypted_differs
        `,
        [
          input.employeeId,
          cipher,
          input.templateKmsKeyId.trim(),
          extracted.modelId,
          extracted.modelVersion,
          extracted.embedding,
        ],
      );
      const row = rows.rows[0];
      if (!row.encrypted_differs) {
        throw new BadRequestException(
          'Face embedding must be encrypted at rest',
        );
      }
      AuditMutationContextStore.markMutationAudited();
      return this.toSummary(row);
    });
  }

  async list(employeeId?: string): Promise<FaceTemplateSummary[]> {
    this.ensureDatabase();
    const rows = await this.database.query<FaceTemplateRow>(
      `
      SELECT id::text, employee_id::text, model_id, model_version, captured_at,
             status::text, true AS encrypted_differs
      FROM ponto.employee_face_template
      WHERE ($1::uuid IS NULL OR employee_id = $1::uuid)
      ORDER BY captured_at DESC
      `,
      [employeeId ?? null],
    );
    return rows.map((row) => this.toSummary(row));
  }

  private toSummary(row: FaceTemplateRow): FaceTemplateSummary {
    return {
      id: row.id,
      employeeId: row.employee_id,
      modelId: row.model_id,
      modelVersion: row.model_version,
      capturedAt: formatInstantIso(row.captured_at),
      status: row.status,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
