import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { PagedResponse } from '../common/pagination/paged-response';
import { DatabaseService } from '../database/database.service';
import { ReportRequestsQueryDto } from './reports.dto';

interface CountRow extends QueryResultRow {
  total: string;
}

interface ReportRequestRow extends QueryResultRow {
  id: string;
  definition_code: string;
  definition_name: string;
  status: string;
  requested_at: Date | string;
  completed_at: Date | string | null;
  files_count: string;
  error_message: string | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listRequests(
    query: ReportRequestsQueryDto,
  ): Promise<PagedResponse<unknown>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const values: unknown[] = [
      searchTerm,
      query.status ?? null,
      query.definitionCode ?? null,
    ];

    const whereClause = `
      WHERE (($1 = '%%')
          OR lower(concat_ws(' ',
              rd.code,
              rd.name,
              rr.status::text,
              coalesce(rr.error_message, '')
            )) LIKE $1)
        AND ($2::text IS NULL OR rr.status::text = $2::text)
        AND ($3::text IS NULL OR rd.code = $3::text)
    `;

    const countRows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.report_request rr
      JOIN public.report_definition rd ON rd.id = rr.definition_id
      ${whereClause}
      `,
      values,
    );

    const rows = await this.databaseService.query<ReportRequestRow>(
      `
      SELECT
        rr.id::text,
        rd.code AS definition_code,
        rd.name AS definition_name,
        rr.status::text,
        rr.requested_at,
        rr.completed_at,
        count(grf.id)::text AS files_count,
        rr.error_message
      FROM public.report_request rr
      JOIN public.report_definition rd ON rd.id = rr.definition_id
      LEFT JOIN public.generated_report_file grf ON grf.report_request_id = rr.id
      ${whereClause}
      GROUP BY rr.id, rd.code, rd.name, rr.status, rr.requested_at, rr.completed_at, rr.error_message
      ORDER BY rr.requested_at DESC
      LIMIT $4 OFFSET $5
      `,
      [...values, pageSize, offset],
    );

    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toDto(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async getRequestById(id: string): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ReportRequestRow>(
      `
      SELECT
        rr.id::text,
        rd.code AS definition_code,
        rd.name AS definition_name,
        rr.status::text,
        rr.requested_at,
        rr.completed_at,
        count(grf.id)::text AS files_count,
        rr.error_message
      FROM public.report_request rr
      JOIN public.report_definition rd ON rd.id = rr.definition_id
      LEFT JOIN public.generated_report_file grf ON grf.report_request_id = rr.id
      WHERE rr.id = $1::uuid
      GROUP BY rr.id, rd.code, rd.name, rr.status, rr.requested_at, rr.completed_at, rr.error_message
      `,
      [id],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Report request not found');
    }
    return this.toDto(row);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for reports operations',
      );
    }
  }

  private toDto(row: ReportRequestRow) {
    return {
      id: row.id,
      definitionCode: row.definition_code,
      definitionName: row.definition_name,
      status: row.status,
      requestedAt: this.toIso(row.requested_at),
      completedAt: row.completed_at ? this.toIso(row.completed_at) : null,
      filesCount: Number(row.files_count),
      errorMessage: row.error_message,
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
