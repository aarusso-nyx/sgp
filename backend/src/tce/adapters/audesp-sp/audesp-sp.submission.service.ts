import { createHash } from 'node:crypto';

import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import {
  AudespLayoutField,
  AudespSubmissionDto,
  AudespSubmissionRow,
  toAudespSubmissionDto,
} from './audesp-sp.types';
import { AudespSpAdapter } from './audesp-sp.adapter';
import { PayrollToAudespMapper } from './mapping/payroll-to-audesp.mapper';
import { AudespValidatorService } from './validator/audesp-validator.service';
import { TceQueueEnqueueService } from '../../queue/enqueue.service';

interface LayoutRow extends QueryResultRow {
  id: string;
  version: string;
}

interface LayoutFieldRow extends QueryResultRow {
  field_path: string;
  data_type: AudespLayoutField['dataType'];
  required: boolean;
  max_length: number | null;
  decimal_precision: number | null;
  decimal_scale: number | null;
}

@Injectable()
export class AudespSpSubmissionService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mapper: PayrollToAudespMapper,
    private readonly validator: AudespValidatorService,
    private readonly adapter: AudespSpAdapter,
    private readonly queue: TceQueueEnqueueService,
  ) {}

  async list(year?: number, month?: number): Promise<AudespSubmissionDto[]> {
    this.ensureDatabase();
    const filters = ['adapter_id = $1'];
    const values: unknown[] = ['audesp-sp'];
    if (year !== undefined) {
      values.push(year);
      filters.push(`competence_year = $${values.length}::int`);
    }
    if (month !== undefined) {
      values.push(month);
      filters.push(`competence_month = $${values.length}::int`);
    }
    const rows = await this.databaseService.query<AudespSubmissionRow>(
      `${submissionSelectSql()} WHERE ${filters.join(
        ' AND ',
      )} ORDER BY competence_year DESC, competence_month DESC, created_at DESC`,
      values,
    );
    return rows.map(toAudespSubmissionDto);
  }

  async createDraft(payrollRunId: string): Promise<AudespSubmissionDto> {
    this.ensureDatabase();
    const layout = await this.layout();
    const payload = await this.mapper.map(payrollRunId);
    const rows = await this.databaseService.query<AudespSubmissionRow>(
      `
      INSERT INTO tce.submission (
        tenant_id,
        adapter_id,
        layout_version_id,
        payroll_run_id,
        competence_year,
        competence_month,
        status
      )
      VALUES (
        $1::uuid,
        'audesp-sp',
        $2::uuid,
        $3::uuid,
        $4::int,
        $5::int,
        'DRAFT'::tce.submission_status
      )
      RETURNING ${submissionColumns()}
      `,
      [
        payload.tenantId,
        layout.id,
        payload.payrollRunId,
        payload.competenceYear,
        payload.competenceMonth,
      ],
    );
    return toAudespSubmissionDto(rows[0]!);
  }

  async validate(id: string): Promise<AudespSubmissionDto> {
    const submission = await this.load(id);
    const layout = await this.layout();
    const payload = await this.mapper.map(submission.payrollRunId);
    const fields = await this.layoutFields(layout.id);
    const validationErrors = this.validator.validate(
      payload,
      layout.version,
      fields,
    );
    const adapterValidation = this.adapter.validate(payload, layout.version);
    if (adapterValidation.status === 'FAIL') {
      for (const error of adapterValidation.errors) {
        validationErrors.push({
          fieldPath: 'AudespFolha',
          code: 'TYPE',
          message: error,
        });
      }
    }
    const status = validationErrors.length ? 'DRAFT' : 'VALIDATED';
    const rows = await this.databaseService.query<AudespSubmissionRow>(
      `
      UPDATE tce.submission
      SET status = $2::tce.submission_status,
          validation_errors = $3::jsonb
      WHERE id = $1::uuid
      RETURNING ${submissionColumns()}
      `,
      [id, status, JSON.stringify(validationErrors)],
    );
    return toAudespSubmissionDto(rows[0]!);
  }

  async submit(id: string, enqueue = true): Promise<AudespSubmissionDto> {
    const submission = await this.validate(id);
    if (submission.validationErrors.length) {
      throw new UnprocessableEntityException(
        'AUDESP/SP submission has validation errors',
      );
    }

    const layout = await this.layout();
    const payload = await this.mapper.map(submission.payrollRunId);
    const envelope = this.adapter.serialize(payload, layout.version);
    const receipt = await this.adapter.submit(envelope);
    const responsePayload = receipt.rawResponse as Record<string, unknown>;
    const responseHash = createHash('sha256')
      .update(JSON.stringify(responsePayload))
      .digest('hex');
    const rows = await this.databaseService.query<AudespSubmissionRow>(
      `
      UPDATE tce.submission
      SET status = $2::tce.submission_status,
          envelope_xml_uri = $3,
          envelope_hash = $4,
          request_size_bytes = $5::int,
          response_payload = $6::jsonb,
          response_hash = $7,
          submitted_at = $8::timestamptz,
          response_at = $8::timestamptz
      WHERE id = $1::uuid
      RETURNING ${submissionColumns()}
      `,
      [
        id,
        receipt.status === 'ACCEPTED' ? 'STUB_OK' : 'STUB_FAIL',
        `tce://audesp-sp/submissions/${id}/envelope.xml`,
        envelope.payloadHash,
        Buffer.byteLength(envelope.body, 'utf8'),
        JSON.stringify(responsePayload),
        responseHash,
        receipt.submittedAt,
      ],
    );
    const dto = toAudespSubmissionDto(rows[0]!);
    if (enqueue) {
      await this.queue.enqueueSubmission(dto.id, 'stub://audesp-sp');
    }
    return dto;
  }

  async envelopeXml(id: string): Promise<string> {
    const submission = await this.load(id);
    const layout = await this.layout();
    const payload = await this.mapper.map(submission.payrollRunId);
    return this.adapter.serialize(payload, layout.version).body;
  }

  private async load(id: string): Promise<AudespSubmissionDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AudespSubmissionRow>(
      `${submissionSelectSql()} WHERE id = $1::uuid`,
      [id],
    );
    if (!rows[0])
      throw new NotFoundException(`AUDESP/SP submission not found: ${id}`);
    return toAudespSubmissionDto(rows[0]);
  }

  private async layout(): Promise<LayoutRow> {
    const rows = await this.databaseService.query<LayoutRow>(
      `
      SELECT layout.id::text, layout.version::text
      FROM tce.layout_version layout
      JOIN tce.state state ON state.id = layout.state_id
      WHERE state.code = 'SP'
        AND layout.system_name = 'AUDESP'
        AND layout.version = '0.0.1'
      LIMIT 1
      `,
    );
    if (!rows[0])
      throw new NotFoundException('AUDESP/SP layout version 0.0.1 not found');
    return rows[0];
  }

  private async layoutFields(
    layoutVersionId: string,
  ): Promise<AudespLayoutField[]> {
    const rows = await this.databaseService.query<LayoutFieldRow>(
      `
      SELECT field_path, data_type::text, required, max_length, decimal_precision, decimal_scale
      FROM tce.layout_field
      WHERE layout_version_id = $1::uuid
      ORDER BY ordering, field_path
      `,
      [layoutVersionId],
    );
    return rows.map((row) => ({
      fieldPath: row.field_path,
      dataType: row.data_type,
      required: row.required,
      maxLength: row.max_length,
      decimalPrecision: row.decimal_precision,
      decimalScale: row.decimal_scale,
    }));
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}

function submissionSelectSql(): string {
  return `SELECT ${submissionColumns()} FROM tce.submission`;
}

function submissionColumns(): string {
  return `
    id::text,
    tenant_id::text,
    adapter_id,
    layout_version_id::text,
    payroll_run_id::text,
    competence_year,
    competence_month,
    envelope_xml_uri,
    envelope_hash,
    request_size_bytes,
    status::text,
    validation_errors,
    response_payload,
    response_hash,
    submitted_at,
    response_at
  `;
}
