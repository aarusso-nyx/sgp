import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { TransparencyQueryDto } from './transparency-query.dto';

export const TRANSPARENCY_MAX_PAGE = 50;
export const TRANSPARENCY_MAX_PAGE_SIZE = 200;

export interface TransparencySnapshot {
  tenantId: string;
  competence: string;
  employeePublicId: string;
  fullName: string;
  registrationNumber: string;
  positionName: string;
  organizationalUnit: string;
  grossTotal: string;
  deductionsTotal: string;
  netTotal: string;
  snapshotTakenAt: string;
}

interface SnapshotRow extends QueryResultRow {
  tenant_id: string;
  competence: string;
  employee_public_id: string;
  full_name: string;
  registration_number: string;
  position_name: string;
  organizational_unit: string;
  gross_total: string;
  deductions_total: string;
  net_total: string;
  snapshot_taken_at: string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

interface HashRow extends QueryResultRow {
  snapshot_hash: string | null;
}

@Injectable()
export class TransparencyQueryService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    tenantId: string,
    query: TransparencyQueryDto,
  ): Promise<PagedResponse<TransparencySnapshot>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    if (page > TRANSPARENCY_MAX_PAGE || pageSize > TRANSPARENCY_MAX_PAGE_SIZE) {
      throw new BadRequestException('Transparency pagination limit exceeded');
    }

    const filters = this.buildFilters(tenantId, query);
    const countRows = await this.databaseService.query<CountRow>(
      `SELECT count(*)::text AS total
       FROM public_data.transparency_payroll_snapshot snapshot
       WHERE ${filters.where}`,
      filters.values,
    );
    const rows = await this.databaseService.query<SnapshotRow>(
      `SELECT
         tenant_id::text,
         competence::text,
         employee_public_id,
         full_name,
         registration_number,
         position_name,
         organizational_unit,
         gross_total::text,
         deductions_total::text,
         net_total::text,
         snapshot_taken_at::text
       FROM public_data.transparency_payroll_snapshot snapshot
       WHERE ${filters.where}
       ORDER BY competence DESC, full_name ASC, registration_number ASC
       LIMIT $${filters.values.length + 1} OFFSET $${filters.values.length + 2}`,
      [...filters.values, pageSize, (page - 1) * pageSize],
    );

    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toSnapshot(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async currentHash(tenantId: string, competence?: string): Promise<string> {
    const rows = await this.databaseService.query<HashRow>(
      `SELECT snapshot_hash
       FROM public_data.transparency_publish_event
       WHERE tenant_id = $1::uuid
         AND ($2::date IS NULL OR competence = $2::date)
       ORDER BY competence DESC, published_at DESC
       LIMIT 1`,
      [tenantId, competence ?? null],
    );
    return rows[0]?.snapshot_hash ?? 'empty';
  }

  private buildFilters(tenantId: string, query: TransparencyQueryDto) {
    const clauses = ['snapshot.tenant_id = $1::uuid'];
    const values: unknown[] = [tenantId];
    if (query.competence) {
      values.push(query.competence);
      clauses.push(`snapshot.competence = $${values.length}::date`);
    }
    if (query.organizationalUnit) {
      values.push(`%${query.organizationalUnit}%`);
      clauses.push(`snapshot.organizational_unit ILIKE $${values.length}`);
    }
    if (query.position) {
      values.push(`%${query.position}%`);
      clauses.push(`snapshot.position_name ILIKE $${values.length}`);
    }
    if (query.search) {
      values.push(`%${query.search}%`);
      clauses.push(`snapshot.full_name ILIKE $${values.length}`);
    }
    return { where: clauses.join(' AND '), values };
  }

  private toSnapshot(row: SnapshotRow): TransparencySnapshot {
    return {
      tenantId: row.tenant_id,
      competence: row.competence,
      employeePublicId: row.employee_public_id,
      fullName: row.full_name,
      registrationNumber: row.registration_number,
      positionName: row.position_name,
      organizationalUnit: row.organizational_unit,
      grossTotal: row.gross_total,
      deductionsTotal: row.deductions_total,
      netTotal: row.net_total,
      snapshotTakenAt: row.snapshot_taken_at,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for transparency endpoints',
      );
    }
  }
}
