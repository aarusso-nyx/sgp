import { createHash } from 'node:crypto';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import { TimeRecordHashService } from '../time-record/time-record-hash.service';
import { CreateAfdImportDto } from '../ponto.dto';
import { AfdRecord, parseAfd } from './afd-layout';
import { AfdImportSummary } from './afd.types';

interface AfdImportRow extends QueryResultRow {
  afd_import_id: string;
  rep_device_id: string;
  file_name: string;
  file_sha256: Buffer;
  imported_at: Date | string;
  line_count: string | number;
  status: string;
  error_summary: Record<string, unknown>;
  object_store_key: string;
  accepted_lines: string | number;
}

interface RepDeviceRow extends QueryResultRow {
  rep_device_id: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C';
}

interface EmployeeRow extends QueryResultRow {
  id: string;
}

@Injectable()
export class AfdImporterService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly timeRecordHashService: TimeRecordHashService,
  ) {}

  async importAfd(input: CreateAfdImportDto): Promise<AfdImportSummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const importId = await this.insertPendingImport(client, input);
      try {
        const parsed = parseAfd(input.content);
        const device = await this.getDevice(client, input.repDeviceId);
        let acceptedLines = 0;
        for (let index = 0; index < parsed.records.length; index += 1) {
          const record = parsed.records[index];
          const timeRecordId =
            record.type === '4'
              ? await this.applyTimeRecord(client, device, record, importId)
              : null;
          if (record.type === '4') acceptedLines += 1;
          await this.insertImportLine(
            client,
            importId,
            input.repDeviceId,
            index + 1,
            record,
            timeRecordId,
          );
        }
        await client.query(
          `
          UPDATE ponto.afd_import
          SET status = 'PROCESSED'::ponto.afd_import_status,
              file_sha256 = decode($2, 'hex'),
              line_count = $3,
              error_summary = $4::jsonb
          WHERE afd_import_id = $1::uuid
          `,
          [
            importId,
            parsed.fileSha256,
            parsed.lines.length,
            JSON.stringify({ acceptedLines, rejectedLines: 0 }),
          ],
        );
      } catch (error) {
        const lineCount = this.countInputLines(input.content);
        await client.query(
          `
          UPDATE ponto.afd_import
          SET status = 'REJECTED'::ponto.afd_import_status,
              line_count = $2,
              error_summary = $3::jsonb
          WHERE afd_import_id = $1::uuid
          `,
          [
            importId,
            lineCount,
            JSON.stringify({
              rejected: true,
              message: error instanceof Error ? error.message : String(error),
            }),
          ],
        );
      }
      AuditMutationContextStore.markMutationAudited();
      return this.getImportWithClient(client, importId);
    });
  }

  async listImports(): Promise<AfdImportSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AfdImportRow>(
      `
      SELECT i.afd_import_id::text, i.rep_device_id::text, i.file_name,
             i.file_sha256, i.imported_at, i.line_count, i.status::text,
             i.error_summary, i.object_store_key,
             count(l.line_no) FILTER (WHERE l.record_type = '4') AS accepted_lines
      FROM ponto.afd_import i
      LEFT JOIN ponto.afd_import_line l ON l.afd_import_id = i.afd_import_id
      GROUP BY i.afd_import_id
      ORDER BY i.imported_at DESC
      LIMIT 100
      `,
    );
    return rows.map((row) => this.toImportSummary(row));
  }

  private async insertPendingImport(
    client: PoolClient,
    input: CreateAfdImportDto,
  ): Promise<string> {
    const originalSha = createHash('sha256')
      .update(input.content, 'latin1')
      .digest('hex');
    const rows = await client.query<{ afd_import_id: string }>(
      `
      INSERT INTO ponto.afd_import (
        rep_device_id, file_name, file_sha256, line_count, status, object_store_key
      )
      VALUES (
        $1::uuid, $2, decode($3, 'hex'), $4,
        'PENDING'::ponto.afd_import_status,
        'ponto/afd/imports/' || gen_random_uuid()::text || '.afd'
      )
      RETURNING afd_import_id::text
      `,
      [
        input.repDeviceId,
        input.fileName,
        originalSha,
        this.countInputLines(input.content),
      ],
    );
    return rows.rows[0].afd_import_id;
  }

  private async getDevice(
    client: PoolClient,
    repDeviceId: string,
  ): Promise<RepDeviceRow> {
    const rows = await client.query<RepDeviceRow>(
      `
      SELECT rep_device_id::text, kind::text
      FROM ponto.rep_device
      WHERE rep_device_id = $1::uuid
      `,
      [repDeviceId],
    );
    if (!rows.rows[0]) throw new Error('REP device not found for AFD import');
    return rows.rows[0];
  }

  private async applyTimeRecord(
    client: PoolClient,
    device: RepDeviceRow,
    record: AfdRecord,
    importId: string,
  ): Promise<string> {
    const employeeIdentifier = String(
      record.fields['employeeIdentifier'] ?? '',
    );
    const employeeId = await this.resolveEmployeeId(client, employeeIdentifier);
    const recordedAt = String(record.fields['recordedAt'] ?? '');
    const sourceText = String(record.fields['source'] ?? device.kind);
    const source = ['REP_P', 'REP_A', 'REP_C'].includes(sourceText)
      ? (sourceText as 'REP_P' | 'REP_A' | 'REP_C')
      : device.kind;
    const summary = await this.timeRecordHashService.createWithClient(client, {
      employeeId,
      recordedAt,
      source,
      nsr: record.nsr,
      rawPayload: {
        afdImportId: importId,
        afdRawLine: record.rawLine,
        repDeviceId: device.rep_device_id,
        layout: 'AFD',
      },
    });
    return summary.timeRecordId;
  }

  private async resolveEmployeeId(
    client: PoolClient,
    identifier: string,
  ): Promise<string> {
    const digits = identifier.replace(/\D/g, '');
    const rows = await client.query<EmployeeRow>(
      `
      SELECT id::text
      FROM hr.employee
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND (
          id::text = NULLIF($1, '')
          OR registration = NULLIF($1, '')
          OR cpf = NULLIF($2, '')
        )
      ORDER BY id
      LIMIT 1
      `,
      [identifier, digits.length === 11 ? digits : ''],
    );
    const employee = rows.rows[0];
    if (!employee) {
      throw new Error(`Employee not found for AFD identifier ${identifier}`);
    }
    return employee.id;
  }

  private async insertImportLine(
    client: PoolClient,
    importId: string,
    repDeviceId: string,
    lineNo: number,
    record: AfdRecord,
    timeRecordId: string | null,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO ponto.afd_import_line (
        afd_import_id, rep_device_id, line_no, nsr, record_type,
        raw_line, parsed, recorded_at, time_record_id
      )
      VALUES (
        $1::uuid, $2::uuid, $3, $4::bigint, $5,
        $6, $7::jsonb, NULLIF($8, '')::timestamptz, $9::uuid
      )
      `,
      [
        importId,
        repDeviceId,
        lineNo,
        record.nsr,
        record.type,
        record.rawLine,
        JSON.stringify(record.fields),
        record.type === '4' ? String(record.fields['recordedAt'] ?? '') : '',
        timeRecordId,
      ],
    );
  }

  private async getImportWithClient(
    client: PoolClient,
    importId: string,
  ): Promise<AfdImportSummary> {
    const rows = await client.query<AfdImportRow>(
      `
      SELECT i.afd_import_id::text, i.rep_device_id::text, i.file_name,
             i.file_sha256, i.imported_at, i.line_count, i.status::text,
             i.error_summary, i.object_store_key,
             count(l.line_no) FILTER (WHERE l.record_type = '4') AS accepted_lines
      FROM ponto.afd_import i
      LEFT JOIN ponto.afd_import_line l ON l.afd_import_id = i.afd_import_id
      WHERE i.afd_import_id = $1::uuid
      GROUP BY i.afd_import_id
      `,
      [importId],
    );
    return this.toImportSummary(rows.rows[0]);
  }

  private countInputLines(content: string): number {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line, index, all) => !(index === all.length - 1 && line === ''))
      .length;
  }

  private toImportSummary(row: AfdImportRow): AfdImportSummary {
    const acceptedLines = Number(row.accepted_lines);
    return {
      afdImportId: row.afd_import_id,
      repDeviceId: row.rep_device_id,
      fileName: row.file_name,
      fileSha256: row.file_sha256.toString('hex'),
      importedAt: formatInstantIso(row.imported_at),
      lineCount: Number(row.line_count),
      status: row.status,
      errorSummary: row.error_summary ?? {},
      objectStoreKey: row.object_store_key,
      acceptedLines,
      rejectedLines: row.status === 'REJECTED' ? Number(row.line_count) : 0,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
