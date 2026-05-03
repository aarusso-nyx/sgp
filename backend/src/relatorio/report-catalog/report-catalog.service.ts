import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { GenerateReportRequestDto } from './report-catalog.dto';

export interface ReportCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  module: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRequestSummary {
  id: string;
  status: string;
  requestedAt: string;
}

interface ReportDefinitionRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string;
  module_key: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class ReportCatalogService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<ReportCatalogItem>> {
    this.ensureDatabase();

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.report_definition rd
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              rd.code,
              rd.name,
              rd.module_key,
              coalesce(rd.description, '')
            )) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<ReportDefinitionRow>(
      `
      SELECT
        rd.id,
        rd.code,
        rd.name,
        rd.description,
        rd.module_key,
        rd.status::text AS status,
        rd.created_at,
        rd.updated_at
      FROM public.report_definition rd
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              rd.code,
              rd.name,
              rd.module_key,
              coalesce(rd.description, '')
            )) LIKE $1
      ORDER BY rd.module_key ASC, rd.name ASC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        module: row.module_key,
        status: row.status,
        createdAt: this.toIso(row.created_at),
        updatedAt: this.toIso(row.updated_at),
      })),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async generateRequest(
    input: GenerateReportRequestDto,
  ): Promise<ReportRequestSummary> {
    this.ensureDatabase();

    const rows = await this.databaseService.query<ReportRequestRow>(
      `
      INSERT INTO public.report_request (
        definition_id,
        branch_id,
        payroll_run_id,
        processing_type_id,
        competence_year,
        competence_month,
        status,
        parameters
      )
      VALUES (
        $1::uuid,
        NULLIF($2, '')::uuid,
        NULLIF($3, '')::uuid,
        NULLIF($4, '')::uuid,
        $5,
        $6,
        'REQUESTED'::"ReportRequestStatus",
        '{}'::jsonb
      )
      RETURNING id, status::text AS status, requested_at
      `,
      [
        input.definitionId,
        input.branchId ?? '',
        input.payrollRunId ?? '',
        input.processingTypeId ?? '',
        input.competenceYear ?? null,
        input.competenceMonth ?? null,
      ],
    );

    const row = rows[0]!;
    return {
      id: row.id,
      status: row.status,
      requestedAt: this.toIso(row.requested_at),
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for report catalog operations',
      );
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
