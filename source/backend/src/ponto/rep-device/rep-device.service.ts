import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { CreateRepDeviceDto } from '../ponto.dto';
import { RepDeviceSummary } from '../rep-ingestion/rep-ingestion.types';

interface RepDeviceRow extends QueryResultRow {
  rep_device_id: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C';
  serial_number: string | null;
  employer_tax_id: string;
  manufacturer: string | null;
  model: string | null;
  program_hash: string | null;
  registered_at: Date | string;
  status: string;
}

@Injectable()
export class RepDeviceService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<RepDeviceSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RepDeviceRow>(
      `
      SELECT rep_device_id::text, kind::text, serial_number, employer_tax_id,
             manufacturer, model, program_hash, registered_at, status::text
      FROM ponto.rep_device
      ORDER BY registered_at DESC
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(input: CreateRepDeviceDto): Promise<RepDeviceSummary> {
    this.ensureDatabase();
    this.validate(input);
    const rows = await this.databaseService.query<RepDeviceRow>(
      `
      INSERT INTO ponto.rep_device (
        kind, serial_number, employer_tax_id, manufacturer, model, program_hash, status
      )
      VALUES (
        $1::ponto.rep_device_kind, NULLIF($2, ''), $3, NULLIF($4, ''),
        NULLIF($5, ''), NULLIF($6, ''), $7::ponto.rep_device_status
      )
      RETURNING rep_device_id::text, kind::text, serial_number, employer_tax_id,
                manufacturer, model, program_hash, registered_at, status::text
      `,
      [
        input.kind,
        input.serialNumber?.trim() ?? '',
        this.taxId(input.employerTaxId),
        input.manufacturer?.trim() ?? '',
        input.model?.trim() ?? '',
        input.programHash?.trim() ?? '',
        input.status ?? 'ACTIVE',
      ],
    );
    AuditMutationContextStore.markMutationAudited();
    return this.toSummary(rows[0]);
  }

  async get(repDeviceId: string): Promise<RepDeviceSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RepDeviceRow>(
      `
      SELECT rep_device_id::text, kind::text, serial_number, employer_tax_id,
             manufacturer, model, program_hash, registered_at, status::text
      FROM ponto.rep_device
      WHERE rep_device_id = $1::uuid
      `,
      [repDeviceId],
    );
    if (!rows[0]) throw new NotFoundException('REP device not found');
    return this.toSummary(rows[0]);
  }

  private validate(input: CreateRepDeviceDto): void {
    if (input.kind === 'REP_P' && !input.programHash?.trim()) {
      throw new BadRequestException('program_hash is required for REP-P');
    }
    if (input.kind === 'REP_C' && !input.serialNumber?.trim()) {
      throw new BadRequestException('serial_number is required for REP-C');
    }
    const taxId = this.taxId(input.employerTaxId);
    if (taxId.length !== 11 && taxId.length !== 14) {
      throw new BadRequestException('employer_tax_id must be CPF or CNPJ');
    }
  }

  private taxId(value: string): string {
    return value.replace(/\D/g, '');
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: RepDeviceRow): RepDeviceSummary {
    return {
      repDeviceId: row.rep_device_id,
      kind: row.kind,
      serialNumber: row.serial_number,
      employerTaxId: row.employer_tax_id,
      manufacturer: row.manufacturer,
      model: row.model,
      programHash: row.program_hash,
      registeredAt: new Date(row.registered_at).toISOString(),
      status: row.status,
    };
  }
}
