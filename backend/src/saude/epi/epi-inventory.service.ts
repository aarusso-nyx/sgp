import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { CreateEpiInventoryDto } from './epi.dto';

interface EpiInventoryRow extends QueryResultRow {
  id: string;
  ca_number: string;
  name: string;
  description: string;
  validity_months: number;
  created_at: Date | string;
}

@Injectable()
export class EpiInventoryService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EpiInventoryRow>(
      `
      SELECT id::text, ca_number, name, description, validity_months, created_at
      FROM saude.epi_inventory
      ORDER BY name, ca_number
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(input: CreateEpiInventoryDto) {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EpiInventoryRow>(
      `
      INSERT INTO saude.epi_inventory (
        ca_number,
        name,
        description,
        validity_months
      )
      VALUES ($1, $2, COALESCE($3, ''), $4)
      ON CONFLICT (tenant_id, ca_number)
      DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          validity_months = EXCLUDED.validity_months,
          updated_at = now()
      RETURNING id::text, ca_number, name, description, validity_months, created_at
      `,
      [
        input.caNumber.trim(),
        input.name.trim(),
        input.description?.trim() ?? '',
        input.validityMonths,
      ],
    );
    return this.toSummary(rows[0]!);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: EpiInventoryRow) {
    return {
      id: row.id,
      caNumber: row.ca_number,
      name: row.name,
      description: row.description,
      validityMonths: Number(row.validity_months),
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}
