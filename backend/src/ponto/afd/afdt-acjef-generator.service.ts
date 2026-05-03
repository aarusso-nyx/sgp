import { Readable } from 'node:stream';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  formatDateOnlyUtc,
  formatInstantIso,
} from '../payroll-bridge/tenant-timezone.util';
import { CreateAfdExportDto } from '../ponto.dto';
import {
  AcjefSummaryInput,
  AfdtRecordInput,
  serializeAcjef,
  serializeAfdt,
  serializeFiscalFlatFile,
} from './afdt-acjef-layout';
import { fileSha256 } from './afd-layout';
import { GeneratedAfdContent } from './afd.types';

interface RepDeviceRow extends QueryResultRow {
  rep_device_id: string;
  employer_tax_id: string;
}

interface AfdtRecordRow extends QueryResultRow {
  employee_id: string;
  employee_registration: string;
  employee_cpf: string | null;
  employee_name: string;
  recorded_at: Date | string;
  source: string;
  nsr: string;
  record_hash: Buffer;
}

interface AcjefSummaryRow extends QueryResultRow {
  employee_id: string;
  employee_registration: string;
  employee_cpf: string | null;
  employee_name: string;
  period_start: Date | string;
  period_end: Date | string;
  worked_minutes: string | number;
  expected_minutes: string | number;
  overtime_50_minutes: string | number;
  overtime_100_minutes: string | number;
  night_minutes: string | number;
  late_minutes: string | number;
  absence_unpaid_minutes: string | number;
  absence_paid_minutes: string | number;
  hour_bank_settlement_minutes: string | number;
}

@Injectable()
export class AfdtAcjefGeneratorService {
  constructor(private readonly databaseService: DatabaseService) {}

  async generateAfdtContent(
    input: CreateAfdExportDto,
  ): Promise<GeneratedAfdContent> {
    this.ensureDatabase();
    return this.databaseService.transaction((client) =>
      this.generateAfdtContentWithClient(client, input),
    );
  }

  async generateAcjefContent(
    input: CreateAfdExportDto,
  ): Promise<GeneratedAfdContent> {
    this.ensureDatabase();
    return this.databaseService.transaction((client) =>
      this.generateAcjefContentWithClient(client, input),
    );
  }

  async downloadAfdt(input: CreateAfdExportDto): Promise<{
    fileName: string;
    stream: Readable;
  }> {
    const content = await this.generateAfdtContent(input);
    return {
      fileName: this.fileName('afdt', input),
      stream: Readable.from(this.streamLines(content.lines)),
    };
  }

  async downloadAcjef(input: CreateAfdExportDto): Promise<{
    fileName: string;
    stream: Readable;
  }> {
    const content = await this.generateAcjefContent(input);
    return {
      fileName: this.fileName('acjef', input),
      stream: Readable.from(this.streamLines(content.lines)),
    };
  }

  private async generateAfdtContentWithClient(
    client: PoolClient,
    input: CreateAfdExportDto,
  ): Promise<GeneratedAfdContent> {
    const device = await this.getDevice(client, input.repDeviceId);
    const records = await this.loadAfdtRecords(client, input);
    const lines = serializeAfdt(
      {
        employerTaxId: device.employer_tax_id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        generatedAt: new Date(),
      },
      records.map((record): AfdtRecordInput => {
        return {
          nsr: Number(record.nsr),
          employeeId: record.employee_id,
          employeeRegistration: record.employee_registration,
          employeeCpf: record.employee_cpf,
          employeeName: record.employee_name,
          recordedAt: formatInstantIso(record.recorded_at),
          source: record.source,
          repDeviceId: input.repDeviceId,
          recordHash: record.record_hash.toString('hex'),
        };
      }),
    );
    const content = serializeFiscalFlatFile(lines);
    return {
      lines,
      content,
      fileSha256: fileSha256(content),
      lineCount: lines.length,
    };
  }

  private async generateAcjefContentWithClient(
    client: PoolClient,
    input: CreateAfdExportDto,
  ): Promise<GeneratedAfdContent> {
    const device = await this.getDevice(client, input.repDeviceId);
    const summaries = await this.loadAcjefSummaries(client, input);
    const lines = serializeAcjef(
      {
        employerTaxId: device.employer_tax_id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        generatedAt: new Date(),
      },
      summaries.map((summary): AcjefSummaryInput => {
        return {
          employeeId: summary.employee_id,
          employeeRegistration: summary.employee_registration,
          employeeCpf: summary.employee_cpf,
          employeeName: summary.employee_name,
          periodStart: summary.period_start,
          periodEnd: summary.period_end,
          workedMinutes: Number(summary.worked_minutes),
          expectedMinutes: Number(summary.expected_minutes),
          overtime50Minutes: Number(summary.overtime_50_minutes),
          overtime100Minutes: Number(summary.overtime_100_minutes),
          nightMinutes: Number(summary.night_minutes),
          lateMinutes: Number(summary.late_minutes),
          absenceUnpaidMinutes: Number(summary.absence_unpaid_minutes),
          absencePaidMinutes: Number(summary.absence_paid_minutes),
          hourBankSettlementMinutes: Number(
            summary.hour_bank_settlement_minutes,
          ),
        };
      }),
    );
    const content = serializeFiscalFlatFile(lines);
    return {
      lines,
      content,
      fileSha256: fileSha256(content),
      lineCount: lines.length,
    };
  }

  private async getDevice(
    client: PoolClient,
    repDeviceId: string,
  ): Promise<RepDeviceRow> {
    const rows = await client.query<RepDeviceRow>(
      `
      SELECT rep_device_id::text, employer_tax_id
      FROM ponto.rep_device
      WHERE rep_device_id = $1::uuid
      `,
      [repDeviceId],
    );
    if (!rows.rows[0]) {
      throw new Error('REP device not found for AFDT/ACJEF export');
    }
    return rows.rows[0];
  }

  private async loadAfdtRecords(
    client: PoolClient,
    input: CreateAfdExportDto,
  ): Promise<AfdtRecordRow[]> {
    const rows = await client.query<AfdtRecordRow>(
      `
      SELECT tr.employee_id::text,
             e.registration AS employee_registration,
             e.cpf AS employee_cpf,
             e.name AS employee_name,
             tr.recorded_at,
             tr.source::text,
             tr.nsr::text,
             tr.record_hash
      FROM ponto.time_record tr
      JOIN hr.employee e ON e.id = tr.employee_id
      WHERE tr.recorded_at >= $2::timestamptz
        AND tr.recorded_at <= $3::timestamptz
        AND tr.raw_payload->>'repDeviceId' = $1
      ORDER BY tr.nsr ASC, tr.recorded_at ASC, tr.time_record_id ASC
      `,
      [input.repDeviceId, input.periodStart, input.periodEnd],
    );
    return rows.rows;
  }

  private async loadAcjefSummaries(
    client: PoolClient,
    input: CreateAfdExportDto,
  ): Promise<AcjefSummaryRow[]> {
    const rows = await client.query<AcjefSummaryRow>(
      `
      WITH employees AS (
        SELECT DISTINCT e.tenant_id,
                        e.id,
                        e.registration,
                        e.cpf,
                        e.name
        FROM ponto.time_record tr
        JOIN hr.employee e ON e.id = tr.employee_id
        WHERE tr.recorded_at >= $2::timestamptz
          AND tr.recorded_at <= $3::timestamptz
          AND tr.raw_payload->>'repDeviceId' = $1
      )
      SELECT e.id::text AS employee_id,
             e.registration AS employee_registration,
             e.cpf AS employee_cpf,
             e.name AS employee_name,
             aggregate.period_start,
             aggregate.period_end,
             aggregate.worked_minutes,
             aggregate.expected_minutes,
             aggregate.overtime_50_minutes,
             aggregate.overtime_100_minutes,
             aggregate.night_minutes,
             aggregate.late_minutes,
             aggregate.absence_unpaid_minutes,
             aggregate.absence_paid_minutes,
             aggregate.hour_bank_settlement_minutes
      FROM employees e
      CROSS JOIN LATERAL ponto.fn_aggregate_timesheet(
        e.tenant_id,
        e.id,
        $2::timestamptz::date,
        $3::timestamptz::date
      ) aggregate
      ORDER BY e.registration ASC, e.name ASC, e.id ASC
      `,
      [input.repDeviceId, input.periodStart, input.periodEnd],
    );
    return rows.rows;
  }

  private fileName(kind: 'afdt' | 'acjef', input: CreateAfdExportDto): string {
    return (
      [
        'ponto',
        kind,
        input.repDeviceId,
        formatDateOnlyUtc(input.periodStart),
        formatDateOnlyUtc(input.periodEnd),
      ].join('-') + `.txt`
    );
  }

  private *streamLines(lines: readonly string[]) {
    for (const line of lines) {
      yield `${line}\n`;
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
