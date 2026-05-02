import { createHash } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { CreateTimeRecordDto } from '../ponto.dto';

interface LastTimeRecordRow extends QueryResultRow {
  nsr: string;
  record_hash: Buffer;
}

interface TimeRecordRow extends QueryResultRow {
  time_record_id: string;
  employee_id: string;
  recorded_at: Date | string;
  source: string;
  nsr: string;
  prev_hash: Buffer | null;
  record_hash: Buffer;
  raw_payload: Record<string, unknown>;
}

export interface TimeRecordSummary {
  timeRecordId: string;
  employeeId: string;
  recordedAt: string;
  source: string;
  nsr: number;
  prevHash: string | null;
  recordHash: string;
  rawPayload: Record<string, unknown>;
}

@Injectable()
export class TimeRecordHashService {
  constructor(private readonly databaseService: DatabaseService) {}

  canonicalize(value: unknown): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new BadRequestException(
          'Canonical JSON cannot contain non-finite numbers',
        );
      }
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalize(item)).join(',')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).filter(
        ([, entry]) => entry !== undefined,
      );
      entries.sort(([left], [right]) => left.localeCompare(right));
      return `{${entries
        .map(
          ([key, entry]) =>
            `${JSON.stringify(key)}:${this.canonicalize(entry)}`,
        )
        .join(',')}}`;
    }
    throw new BadRequestException(
      `Unsupported canonical JSON value: ${typeof value}`,
    );
  }

  calculateHash(
    prevHash: Buffer | null,
    canonicalRecord: Record<string, unknown>,
  ): Buffer {
    const hash = createHash('sha256');
    if (prevHash) hash.update(prevHash);
    hash.update(this.canonicalize(canonicalRecord));
    return hash.digest();
  }

  verifyChain(
    records: Array<{
      prevHash: Buffer | null;
      recordHash: Buffer;
      record: Record<string, unknown>;
    }>,
  ): boolean {
    let previous: Buffer | null = null;
    for (const entry of records) {
      if (!this.equalBuffers(entry.prevHash, previous)) return false;
      const expected = this.calculateHash(previous, entry.record);
      if (!this.equalBuffers(entry.recordHash, expected)) return false;
      previous = entry.recordHash;
    }
    return true;
  }

  async createManual(input: CreateTimeRecordDto): Promise<TimeRecordSummary> {
    return this.databaseService.transaction(async (client) => {
      return this.createWithClient(client, input, true);
    });
  }

  async createWithClient(
    client: PoolClient,
    input: CreateTimeRecordDto,
    requireProvidedPrevHash = false,
  ): Promise<TimeRecordSummary> {
    const last = await this.findLastRecord(client, input.employeeId);
    const expectedPrevHash = last?.record_hash ?? null;
    const providedPrevHash = input.prevHash
      ? Buffer.from(input.prevHash, 'hex')
      : null;
    if (
      requireProvidedPrevHash &&
      !this.equalBuffers(providedPrevHash, expectedPrevHash)
    ) {
      throw new BadRequestException(
        'prev_hash does not match the last employee time record',
      );
    }
    if (last && BigInt(input.nsr) <= BigInt(last.nsr)) {
      throw new BadRequestException(
        'nsr must be greater than the last employee time record',
      );
    }

    const rawPayload = input.rawPayload ?? {};
    const canonicalRecord = this.recordForHash({
      employeeId: input.employeeId,
      recordedAt: input.recordedAt,
      source: input.source,
      nsr: input.nsr,
      rawPayload,
    });
    const recordHash = this.calculateHash(expectedPrevHash, canonicalRecord);
    const rows = await client.query<TimeRecordRow>(
      `
      INSERT INTO ponto.time_record (
        employee_id, recorded_at, source, nsr, prev_hash, record_hash, raw_payload
      )
      VALUES ($1::uuid, $2::timestamptz, $3::ponto.time_record_source, $4::bigint, $5::bytea, $6::bytea, $7::jsonb)
      RETURNING time_record_id::text, employee_id::text, recorded_at, source::text, nsr::text,
                prev_hash, record_hash, raw_payload
      `,
      [
        input.employeeId,
        input.recordedAt,
        input.source,
        input.nsr,
        expectedPrevHash,
        recordHash,
        JSON.stringify(rawPayload),
      ],
    );
    return this.toSummary(rows.rows[0]);
  }

  async list(employeeId: string, limit = 50): Promise<TimeRecordSummary[]> {
    const rows = await this.databaseService.query<TimeRecordRow>(
      `
      SELECT time_record_id::text, employee_id::text, recorded_at, source::text, nsr::text,
             prev_hash, record_hash, raw_payload
      FROM ponto.time_record
      WHERE employee_id = $1::uuid
      ORDER BY nsr DESC
      LIMIT $2
      `,
      [employeeId, limit],
    );
    return rows.map((row) => this.toSummary(row));
  }

  recordForHash(input: {
    employeeId: string;
    recordedAt: string;
    source: string;
    nsr: number;
    rawPayload: Record<string, unknown>;
  }): Record<string, unknown> {
    return {
      employeeId: input.employeeId,
      nsr: input.nsr,
      rawPayload: input.rawPayload,
      recordedAt: new Date(input.recordedAt).toISOString(),
      source: input.source,
    };
  }

  private async findLastRecord(
    client: PoolClient,
    employeeId: string,
  ): Promise<LastTimeRecordRow | null> {
    const result = await client.query<LastTimeRecordRow>(
      `
      SELECT nsr::text, record_hash
      FROM ponto.time_record
      WHERE employee_id = $1::uuid
      ORDER BY nsr DESC
      LIMIT 1
      FOR UPDATE
      `,
      [employeeId],
    );
    return result.rows[0] ?? null;
  }

  private equalBuffers(left: Buffer | null, right: Buffer | null): boolean {
    if (left === null || right === null) return left === right;
    return left.length === right.length && left.equals(right);
  }

  private toSummary(row: TimeRecordRow): TimeRecordSummary {
    return {
      timeRecordId: row.time_record_id,
      employeeId: row.employee_id,
      recordedAt: new Date(row.recorded_at).toISOString(),
      source: row.source,
      nsr: Number(row.nsr),
      prevHash: row.prev_hash?.toString('hex') ?? null,
      recordHash: row.record_hash.toString('hex'),
      rawPayload: row.raw_payload,
    };
  }
}
