import { Readable } from 'node:stream';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import { CreateAfdExportDto } from '../ponto.dto';
import {
  encodeType1,
  encodeType4,
  encodeType9,
  fileSha256,
  serializeAfd,
  trailerHashForLines,
} from './afd-layout';
import { AfdExportSummary, GeneratedAfdContent } from './afd.types';

interface AfdExportRow extends QueryResultRow {
  afd_export_id: string;
  rep_device_id: string;
  period_start: Date | string;
  period_end: Date | string;
  generated_at: Date | string;
  file_sha256: Buffer | null;
  line_count: string | number;
  requested_by_user_id: string | null;
  status: string;
  object_store_key: string;
  error_summary: Record<string, unknown>;
}

interface RepDeviceRow extends QueryResultRow {
  rep_device_id: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C';
  employer_tax_id: string;
  manufacturer: string | null;
}

interface TimeRecordRow extends QueryResultRow {
  employee_id: string;
  registration: string;
  employee_name: string;
  recorded_at: Date | string;
  source: string;
  nsr: string;
  record_hash: Buffer;
}

@Injectable()
export class AfdGeneratorService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createExport(input: CreateAfdExportDto): Promise<AfdExportSummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const exportId = await this.insertExport(client, input);
      try {
        const content = await this.generateContentWithClient(client, input);
        await client.query(
          `
          UPDATE ponto.afd_export
          SET status = 'READY'::ponto.afd_export_status,
              file_sha256 = decode($2, 'hex'),
              line_count = $3,
              error_summary = '{}'::jsonb
          WHERE afd_export_id = $1::uuid
          `,
          [exportId, content.fileSha256, content.lineCount],
        );
      } catch (error) {
        await client.query(
          `
          UPDATE ponto.afd_export
          SET status = 'FAILED'::ponto.afd_export_status,
              error_summary = $2::jsonb
          WHERE afd_export_id = $1::uuid
          `,
          [
            exportId,
            JSON.stringify({
              message: error instanceof Error ? error.message : String(error),
            }),
          ],
        );
      }
      AuditMutationContextStore.markMutationAudited();
      return this.getExportWithClient(client, exportId);
    });
  }

  async listExports(): Promise<AfdExportSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AfdExportRow>(
      `
      SELECT afd_export_id::text, rep_device_id::text, period_start, period_end,
             generated_at, file_sha256, line_count, requested_by_user_id,
             status::text, object_store_key, error_summary
      FROM ponto.afd_export
      ORDER BY generated_at DESC
      LIMIT 100
      `,
    );
    return rows.map((row) => this.toExportSummary(row));
  }

  async downloadExport(exportId: string): Promise<{
    fileName: string;
    stream: Readable;
  }> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AfdExportRow>(
      `
      SELECT afd_export_id::text, rep_device_id::text, period_start, period_end,
             generated_at, file_sha256, line_count, requested_by_user_id,
             status::text, object_store_key, error_summary
      FROM ponto.afd_export
      WHERE afd_export_id = $1::uuid
      `,
      [exportId],
    );
    const entry = rows[0];
    if (!entry) {
      throw new Error('AFD export not found');
    }
    const content = await this.generateContent({
      repDeviceId: entry.rep_device_id,
      periodStart: formatInstantIso(entry.period_start),
      periodEnd: formatInstantIso(entry.period_end),
    });
    return {
      fileName: `${entry.object_store_key.split('/').at(-1) ?? exportId}.afd`,
      stream: Readable.from(this.streamLines(content.lines)),
    };
  }

  async generateContent(
    input: CreateAfdExportDto,
  ): Promise<GeneratedAfdContent> {
    this.ensureDatabase();
    return this.databaseService.transaction((client) =>
      this.generateContentWithClient(client, input),
    );
  }

  private async generateContentWithClient(
    client: PoolClient,
    input: CreateAfdExportDto,
  ): Promise<GeneratedAfdContent> {
    const importedLines = await this.loadImportedRoundTripLines(client, input);
    if (importedLines.length > 0) {
      const content = serializeAfd(importedLines);
      return {
        lines: importedLines,
        content,
        fileSha256: fileSha256(content),
        lineCount: importedLines.length,
      };
    }

    const device = await this.getDevice(client, input.repDeviceId);
    const records = await this.loadTimeRecords(client, input);
    const bodyLines = [
      encodeType1({
        nsr: 0,
        employerTaxId: device.employer_tax_id,
        employerName: device.manufacturer ?? 'SGP',
        generatedAt: formatInstantIso(new Date()),
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      }),
      ...records.map((record) =>
        encodeType4({
          nsr: Number(record.nsr),
          employeeIdentifier: record.registration || record.employee_id,
          employeeName: record.employee_name,
          recordedAt: formatInstantIso(record.recorded_at),
          source: record.source,
          repDeviceId: input.repDeviceId,
          recordHash: record.record_hash.toString('hex'),
        }),
      ),
    ];
    const maxNsr = records.reduce(
      (current, record) => Math.max(current, Number(record.nsr)),
      0,
    );
    const lines = [
      ...bodyLines,
      encodeType9({
        nsr: maxNsr + 1,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        lineCount: bodyLines.length + 1,
        trailerHash: trailerHashForLines(bodyLines),
      }),
    ];
    const content = serializeAfd(lines);
    return {
      lines,
      content,
      fileSha256: fileSha256(content),
      lineCount: lines.length,
    };
  }

  private async insertExport(
    client: PoolClient,
    input: CreateAfdExportDto,
  ): Promise<string> {
    const actor = RequestContextStore.get()?.actor;
    const rows = await client.query<{ afd_export_id: string }>(
      `
      INSERT INTO ponto.afd_export (
        rep_device_id, period_start, period_end, requested_by_user_id,
        status, object_store_key
      )
      VALUES (
        $1::uuid, $2::timestamptz, $3::timestamptz, NULLIF($4, ''),
        'GENERATING'::ponto.afd_export_status,
        'ponto/afd/exports/' || gen_random_uuid()::text || '.afd'
      )
      RETURNING afd_export_id::text
      `,
      [input.repDeviceId, input.periodStart, input.periodEnd, actor?.sub ?? ''],
    );
    return rows.rows[0].afd_export_id;
  }

  private async getExportWithClient(
    client: PoolClient,
    exportId: string,
  ): Promise<AfdExportSummary> {
    const rows = await client.query<AfdExportRow>(
      `
      SELECT afd_export_id::text, rep_device_id::text, period_start, period_end,
             generated_at, file_sha256, line_count, requested_by_user_id,
             status::text, object_store_key, error_summary
      FROM ponto.afd_export
      WHERE afd_export_id = $1::uuid
      `,
      [exportId],
    );
    return this.toExportSummary(rows.rows[0]);
  }

  private async getDevice(
    client: PoolClient,
    repDeviceId: string,
  ): Promise<RepDeviceRow> {
    const rows = await client.query<RepDeviceRow>(
      `
      SELECT rep_device_id::text, kind::text, employer_tax_id, manufacturer
      FROM ponto.rep_device
      WHERE rep_device_id = $1::uuid
      `,
      [repDeviceId],
    );
    if (!rows.rows[0]) throw new Error('REP device not found for AFD export');
    return rows.rows[0];
  }

  private async loadImportedRoundTripLines(
    client: PoolClient,
    input: CreateAfdExportDto,
  ): Promise<string[]> {
    const rows = await client.query<QueryResultRow & { raw_line: string }>(
      `
      WITH candidate AS (
        SELECT i.afd_import_id
        FROM ponto.afd_import i
        WHERE i.rep_device_id = $1::uuid
          AND i.status = 'PROCESSED'::ponto.afd_import_status
          AND EXISTS (
            SELECT 1
            FROM ponto.afd_import_line l
            WHERE l.afd_import_id = i.afd_import_id
              AND l.record_type = '4'
              AND l.recorded_at >= $2::timestamptz
              AND l.recorded_at <= $3::timestamptz
          )
        ORDER BY i.imported_at DESC
        LIMIT 1
      )
      SELECT l.raw_line
      FROM ponto.afd_import_line l
      JOIN candidate c ON c.afd_import_id = l.afd_import_id
      ORDER BY l.line_no
      `,
      [input.repDeviceId, input.periodStart, input.periodEnd],
    );
    return rows.rows.map((row) => row.raw_line);
  }

  private async loadTimeRecords(
    client: PoolClient,
    input: CreateAfdExportDto,
  ): Promise<TimeRecordRow[]> {
    const rows = await client.query<TimeRecordRow>(
      `
      SELECT tr.employee_id::text, e.registration, e.name AS employee_name,
             tr.recorded_at, tr.source::text, tr.nsr::text, tr.record_hash
      FROM ponto.time_record tr
      JOIN hr.employee e ON e.id = tr.employee_id
      WHERE tr.recorded_at >= $2::timestamptz
        AND tr.recorded_at <= $3::timestamptz
        AND tr.raw_payload->>'repDeviceId' = $1
      ORDER BY tr.nsr ASC, tr.recorded_at ASC
      `,
      [input.repDeviceId, input.periodStart, input.periodEnd],
    );
    return rows.rows;
  }

  private *streamLines(lines: readonly string[]) {
    for (const line of lines) {
      yield `${line}\n`;
    }
  }

  private toExportSummary(row: AfdExportRow): AfdExportSummary {
    return {
      afdExportId: row.afd_export_id,
      repDeviceId: row.rep_device_id,
      periodStart: formatInstantIso(row.period_start),
      periodEnd: formatInstantIso(row.period_end),
      generatedAt: formatInstantIso(row.generated_at),
      fileSha256: row.file_sha256?.toString('hex') ?? null,
      lineCount: Number(row.line_count),
      requestedByUserId: row.requested_by_user_id,
      status: row.status,
      objectStoreKey: row.object_store_key,
      errorSummary: row.error_summary ?? {},
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
