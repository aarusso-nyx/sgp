import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  CreateTrainingCertificateDto,
  UpdateTrainingCertificateDto,
} from './certifications.dto';

interface TrainingCertificateRow extends QueryResultRow {
  id: string;
  employee_id: string;
  course_name: string;
  issuer: string;
  issued_at: Date | string;
  expires_at: Date | string | null;
  hours_workload: number | null;
  attachment_id: string | null;
  notes: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface TrainingCertificateSummary {
  id: string;
  employeeId: string;
  courseName: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string | null;
  hoursWorkload: number | null;
  attachmentId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const CERTIFICATE_COLUMNS = `
  id::text,
  employee_id::text,
  course_name,
  issuer,
  issued_at,
  expires_at,
  hours_workload,
  attachment_id::text,
  notes,
  created_at,
  updated_at
`;

@Injectable()
export class TrainingCertificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listForEmployee(
    employeeId: string,
  ): Promise<TrainingCertificateSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TrainingCertificateRow>(
      `
      SELECT ${CERTIFICATE_COLUMNS}
      FROM hr.training_certificate
      WHERE employee_id = $1::uuid
      ORDER BY issued_at DESC, created_at DESC
      `,
      [employeeId],
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(
    input: CreateTrainingCertificateDto,
  ): Promise<TrainingCertificateSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TrainingCertificateRow>(
      `
      INSERT INTO hr.training_certificate (
        employee_id, course_name, issuer, issued_at, expires_at,
        hours_workload, attachment_id, notes
      )
      VALUES (
        $1::uuid, $2, $3, $4::date, NULLIF($5, '')::date,
        $6, NULLIF($7, '')::uuid, COALESCE($8, '')
      )
      RETURNING ${CERTIFICATE_COLUMNS}
      `,
      [
        input.employeeId,
        input.courseName.trim(),
        input.issuer.trim(),
        input.issuedAt,
        input.expiresAt ?? '',
        input.hoursWorkload ?? null,
        input.attachmentId ?? '',
        input.notes ?? '',
      ],
    );
    return this.toSummary(rows[0]!);
  }

  async update(
    id: string,
    input: UpdateTrainingCertificateDto,
  ): Promise<TrainingCertificateSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TrainingCertificateRow>(
      `
      UPDATE hr.training_certificate
      SET
        course_name = COALESCE($2, course_name),
        issuer = COALESCE($3, issuer),
        issued_at = COALESCE($4::date, issued_at),
        expires_at = CASE
          WHEN $5::text = '__clear__' THEN NULL
          WHEN $5::text IS NULL THEN expires_at
          ELSE $5::date
        END,
        hours_workload = CASE
          WHEN $6::text = '__clear__' THEN NULL
          WHEN $6::text IS NULL THEN hours_workload
          ELSE $6::int
        END,
        attachment_id = CASE
          WHEN $7::text = '__clear__' THEN NULL
          WHEN $7::text IS NULL THEN attachment_id
          ELSE $7::uuid
        END,
        notes = COALESCE($8, notes),
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING ${CERTIFICATE_COLUMNS}
      `,
      [
        id,
        input.courseName?.trim() ?? null,
        input.issuer?.trim() ?? null,
        input.issuedAt ?? null,
        this.tristate(input.expiresAt),
        this.tristate(
          input.hoursWorkload === null ? null : input.hoursWorkload?.toString(),
        ),
        this.tristate(input.attachmentId),
        input.notes ?? null,
      ],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Training certificate not found');
    }
    return this.toSummary(rows[0]!);
  }

  async remove(id: string): Promise<void> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TrainingCertificateRow>(
      `
      DELETE FROM hr.training_certificate
      WHERE id = $1::uuid
      RETURNING ${CERTIFICATE_COLUMNS}
      `,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Training certificate not found');
    }
  }

  private tristate(value: string | null | undefined): string | null {
    if (value === null) return '__clear__';
    if (value === undefined) return null;
    return value;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: TrainingCertificateRow): TrainingCertificateSummary {
    return {
      id: row.id,
      employeeId: row.employee_id,
      courseName: row.course_name,
      issuer: row.issuer,
      issuedAt: this.dateValue(row.issued_at),
      expiresAt: this.nullableDateValue(row.expires_at),
      hoursWorkload: row.hours_workload,
      attachmentId: row.attachment_id,
      notes: row.notes,
      createdAt: this.timestampValue(row.created_at),
      updatedAt: this.timestampValue(row.updated_at),
    };
  }

  private nullableDateValue(value: Date | string | null): string | null {
    return value === null ? null : this.dateValue(value);
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }

  private timestampValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
