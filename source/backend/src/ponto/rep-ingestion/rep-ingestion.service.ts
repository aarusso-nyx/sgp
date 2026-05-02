import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import { CreateRepIngestionBatchDto } from '../ponto.dto';
import { ApplyToTimeRecordService } from './apply-to-time-record.service';
import { DedupService } from './dedup.service';
import { AftParserService } from './parsers/aft-parser.service';
import { RepPStreamService } from './parsers/rep-p-stream.service';
import { ParsedRepLine, RepIngestionBatchSummary } from './rep-ingestion.types';

interface RepDeviceRow extends QueryResultRow {
  rep_device_id: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C';
  program_hash: string | null;
  status: string;
}

interface BatchRow extends QueryResultRow {
  batch_id: string;
  rep_device_id: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C';
  file_name: string | null;
  file_sha256: string;
  received_at: Date | string;
  processed_at: Date | string | null;
  status: string;
  error_summary: Record<string, unknown>;
  accepted_lines: string | number;
  duplicate_lines: string | number;
  created_time_records: string | number;
}

@Injectable()
export class RepIngestionService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly aftParser: AftParserService,
    private readonly repPStream: RepPStreamService,
    private readonly dedupService: DedupService,
    private readonly applyService: ApplyToTimeRecordService,
  ) {}

  async ingest(
    repDeviceId: string,
    input: CreateRepIngestionBatchDto,
  ): Promise<RepIngestionBatchSummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const device = await this.findDevice(client, repDeviceId);
      const rawContent = this.rawContent(input);
      const fileSha256 = createHash('sha256').update(rawContent).digest('hex');
      const batchId = await this.createBatch(
        client,
        repDeviceId,
        device.kind,
        input.fileName ?? this.defaultFileName(device.kind),
        fileSha256,
        rawContent,
      );

      try {
        const lines = this.parseLines(device, input, rawContent);
        const dedup = await this.dedupService.validate(
          client,
          repDeviceId,
          lines,
        );
        let createdTimeRecords = 0;

        for (const line of lines) {
          if (dedup.duplicateNsrs.has(line.nsr)) continue;
          const timeRecordId = await this.applyService.apply(
            client,
            device.kind,
            line,
            repDeviceId,
          );
          await this.insertLine(
            client,
            batchId,
            repDeviceId,
            line,
            timeRecordId,
          );
          createdTimeRecords += 1;
        }

        const summary = {
          duplicate: dedup.duplicate,
          duplicateLines: dedup.duplicateNsrs.size,
          acceptedLines: lines.length - dedup.duplicateNsrs.size,
          createdTimeRecords,
        };
        await this.markBatch(client, batchId, 'PROCESSED', summary);
        AuditMutationContextStore.markMutationAudited();
        return this.getBatch(client, batchId);
      } catch (error) {
        const summary = this.errorSummary(error);
        await this.markBatch(client, batchId, 'REJECTED', summary);
        AuditMutationContextStore.markMutationAudited();
        throw new BadRequestException({
          message: 'REP ingestion batch rejected',
          batchId,
          errorSummary: summary,
        });
      }
    });
  }

  async list(repDeviceId?: string): Promise<RepIngestionBatchSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<BatchRow>(
      `
      SELECT b.batch_id::text, b.rep_device_id::text, b.kind::text, b.file_name,
             b.file_sha256, b.received_at, b.processed_at, b.status::text,
             b.error_summary,
             count(l.line_no) AS accepted_lines,
             COALESCE((b.error_summary->>'duplicateLines')::int, 0) AS duplicate_lines,
             count(l.time_record_id) AS created_time_records
      FROM ponto.rep_ingestion_batch b
      LEFT JOIN ponto.rep_ingestion_line l ON l.batch_id = b.batch_id
      WHERE ($1::uuid IS NULL OR b.rep_device_id = $1::uuid)
      GROUP BY b.batch_id
      ORDER BY b.received_at DESC
      `,
      [repDeviceId ?? null],
    );
    return rows.map((row) => this.toSummary(row));
  }

  async getOriginal(
    batchId: string,
  ): Promise<{ fileName: string; content: string }> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<
      QueryResultRow & { file_name: string | null; raw_file: string }
    >(
      `
      SELECT COALESCE(file_name, batch_id::text || '.txt') AS file_name, raw_file
      FROM ponto.rep_ingestion_batch
      WHERE batch_id = $1::uuid
      `,
      [batchId],
    );
    if (!rows[0]) throw new NotFoundException('REP ingestion batch not found');
    return {
      fileName: rows[0].file_name ?? `${batchId}.txt`,
      content: rows[0].raw_file,
    };
  }

  private async findDevice(
    client: PoolClient,
    repDeviceId: string,
  ): Promise<RepDeviceRow> {
    const result = await client.query<RepDeviceRow>(
      `
      SELECT rep_device_id::text, kind::text, program_hash, status::text
      FROM ponto.rep_device
      WHERE rep_device_id = $1::uuid
      FOR UPDATE
      `,
      [repDeviceId],
    );
    const device = result.rows[0];
    if (!device) throw new NotFoundException('REP device not found');
    if (device.status !== 'ACTIVE') {
      throw new BadRequestException('REP device is not active');
    }
    return device;
  }

  private parseLines(
    device: RepDeviceRow,
    input: CreateRepIngestionBatchDto,
    rawContent: string,
  ): ParsedRepLine[] {
    if (device.kind === 'REP_P') {
      return this.repPStream.parse(
        input.records,
        input.signature,
        device.program_hash,
      );
    }
    return this.aftParser.parse(rawContent);
  }

  private rawContent(input: CreateRepIngestionBatchDto): string {
    if (input.records?.length) {
      return JSON.stringify(input.records);
    }
    if (input.content?.trim()) return input.content;
    throw new BadRequestException('REP ingestion content is required');
  }

  private async createBatch(
    client: PoolClient,
    repDeviceId: string,
    kind: string,
    fileName: string,
    fileSha256: string,
    rawContent: string,
  ): Promise<string> {
    const rows = await client.query<{ batch_id: string }>(
      `
      INSERT INTO ponto.rep_ingestion_batch (
        rep_device_id, kind, file_name, file_sha256, raw_file, status
      )
      VALUES ($1::uuid, $2::ponto.rep_device_kind, $3, $4, $5, 'VALIDATING')
      RETURNING batch_id::text
      `,
      [repDeviceId, kind, fileName, fileSha256, rawContent],
    );
    return rows.rows[0].batch_id;
  }

  private async insertLine(
    client: PoolClient,
    batchId: string,
    repDeviceId: string,
    line: ParsedRepLine,
    timeRecordId: string,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO ponto.rep_ingestion_line (
        batch_id, rep_device_id, line_no, nsr, raw_line, parsed, time_record_id, dedup_key
      )
      VALUES ($1::uuid, $2::uuid, $3, $4::bigint, $5, $6::jsonb, $7::uuid, $8)
      `,
      [
        batchId,
        repDeviceId,
        line.lineNo,
        line.nsr,
        line.rawLine,
        JSON.stringify(line),
        timeRecordId,
        `${repDeviceId}:${line.nsr}`,
      ],
    );
  }

  private async markBatch(
    client: PoolClient,
    batchId: string,
    status: 'PROCESSED' | 'REJECTED',
    errorSummary: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      UPDATE ponto.rep_ingestion_batch
      SET status = $2::ponto.rep_ingestion_status,
          processed_at = now(),
          error_summary = $3::jsonb
      WHERE batch_id = $1::uuid
      `,
      [batchId, status, JSON.stringify(errorSummary)],
    );
  }

  private async getBatch(
    client: PoolClient,
    batchId: string,
  ): Promise<RepIngestionBatchSummary> {
    const rows = await client.query<BatchRow>(
      `
      SELECT b.batch_id::text, b.rep_device_id::text, b.kind::text, b.file_name,
             b.file_sha256, b.received_at, b.processed_at, b.status::text,
             b.error_summary,
             count(l.line_no) AS accepted_lines,
             COALESCE((b.error_summary->>'duplicateLines')::int, 0) AS duplicate_lines,
             count(l.time_record_id) AS created_time_records
      FROM ponto.rep_ingestion_batch b
      LEFT JOIN ponto.rep_ingestion_line l ON l.batch_id = b.batch_id
      WHERE b.batch_id = $1::uuid
      GROUP BY b.batch_id
      `,
      [batchId],
    );
    return this.toSummary(rows.rows[0]);
  }

  private defaultFileName(kind: string): string {
    return kind === 'REP_P' ? 'rep-p-stream.json' : 'afdt.txt';
  }

  private errorSummary(error: unknown): Record<string, unknown> {
    return {
      rejected: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: BatchRow): RepIngestionBatchSummary {
    return {
      batchId: row.batch_id,
      repDeviceId: row.rep_device_id,
      kind: row.kind,
      fileName: row.file_name,
      fileSha256: row.file_sha256,
      receivedAt: formatInstantIso(row.received_at),
      processedAt: row.processed_at ? formatInstantIso(row.processed_at) : null,
      status: row.status,
      errorSummary: row.error_summary ?? {},
      acceptedLines: Number(row.accepted_lines),
      duplicateLines: Number(row.duplicate_lines),
      createdTimeRecords: Number(row.created_time_records),
    };
  }
}
