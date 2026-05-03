import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { OrganicDefinitionMutationDto } from './organic-definition.dto';

interface OrganicDefinitionRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string;
  work_location_id: string;
  work_location_code: string;
  work_location_name: string;
  job_position_id: string;
  job_position_code: string;
  job_position_name: string;
  vacancies_total: number;
  vacancies_filled: number;
  vacancies_open: number;
  effective_from: Date | string;
  effective_to: Date | string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class OrganicDefinitionService {
  constructor(private readonly database: DatabaseService) {}

  async list(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<Record<string, unknown>>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim().toLowerCase() ?? '';
    const offset = (page - 1) * pageSize;
    const params: unknown[] = [];
    const where = search
      ? `WHERE lower(concat_ws(' ', od.code, od.name, od.description, wl.code, wl.name, jp.code, jp.name)) LIKE $1`
      : '';
    if (search) params.push(`%${search}%`);

    const countRows = await this.database.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.organic_definition od
      JOIN hr.work_location wl ON wl.id = od.work_location_id
      JOIN hr.job_position jp ON jp.id = od.job_position_id
      ${where}
      `,
      params,
    );
    const rows = await this.database.query<OrganicDefinitionRow>(
      `
      ${this.selectSql()}
      ${where}
      ORDER BY wl.code ASC, jp.code ASC, od.effective_from DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, pageSize, offset],
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

  async create(
    input: OrganicDefinitionMutationDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const normalized = this.normalize(input);
    const rows = await this.database.query<OrganicDefinitionRow>(
      `
      INSERT INTO hr.organic_definition (
        tenant_id, code, name, description, work_location_id, job_position_id,
        vacancies_total, vacancies_filled, vacancies_open, effective_from,
        effective_to, status
      )
      VALUES (
        NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
        $1, $2, $3, $4::uuid, $5::uuid, $6, $7, $8, COALESCE($9::date, CURRENT_DATE),
        $10::date, 'ACTIVE'::"RecordStatus"
      )
      RETURNING id::text
      `,
      [
        normalized.code,
        normalized.name,
        normalized.description,
        normalized.workLocationId,
        normalized.jobPositionId,
        normalized.vacanciesTotal,
        normalized.vacanciesFilled,
        normalized.vacanciesOpen,
        normalized.effectiveFrom ?? null,
        normalized.effectiveTo ?? null,
      ],
    );
    return this.findById(rows[0]!.id);
  }

  async update(
    id: string,
    input: OrganicDefinitionMutationDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const normalized = this.normalize(input);
    const rows = await this.database.query<OrganicDefinitionRow>(
      `
      UPDATE hr.organic_definition
      SET code = $2,
          name = $3,
          description = $4,
          work_location_id = $5::uuid,
          job_position_id = $6::uuid,
          vacancies_total = $7,
          vacancies_filled = $8,
          vacancies_open = $9,
          effective_from = COALESCE($10::date, effective_from),
          effective_to = $11::date,
          updated_at = now()
      WHERE id = $1::uuid
      RETURNING id::text
      `,
      [
        id,
        normalized.code,
        normalized.name,
        normalized.description,
        normalized.workLocationId,
        normalized.jobPositionId,
        normalized.vacanciesTotal,
        normalized.vacanciesFilled,
        normalized.vacanciesOpen,
        normalized.effectiveFrom ?? null,
        normalized.effectiveTo ?? null,
      ],
    );
    if (!rows[0]) throw new NotFoundException('Organic definition not found');
    return this.findById(rows[0].id);
  }

  async deactivate(id: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.query<OrganicDefinitionRow>(
      `
      UPDATE hr.organic_definition
      SET status = 'INACTIVE'::"RecordStatus", updated_at = now()
      WHERE id = $1::uuid
      RETURNING id::text
      `,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Organic definition not found');
    return this.findById(rows[0].id);
  }

  private async findById(id: string): Promise<Record<string, unknown>> {
    const rows = await this.database.query<OrganicDefinitionRow>(
      `
      ${this.selectSql()}
      WHERE od.id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Organic definition not found');
    return this.toDto(rows[0]);
  }

  private normalize(input: OrganicDefinitionMutationDto) {
    const vacanciesTotal = input.vacanciesTotal;
    const vacanciesFilled = input.vacanciesFilled ?? 0;
    if (vacanciesFilled > vacanciesTotal) {
      throw new BadRequestException(
        'Filled vacancies cannot exceed total vacancies',
      );
    }
    if (
      input.effectiveFrom &&
      input.effectiveTo &&
      input.effectiveTo < input.effectiveFrom
    ) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }
    return {
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      workLocationId: input.workLocationId,
      jobPositionId: input.jobPositionId,
      vacanciesTotal,
      vacanciesFilled,
      vacanciesOpen: vacanciesTotal - vacanciesFilled,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
    };
  }

  private selectSql(): string {
    return `
      SELECT
        od.id::text,
        od.code,
        od.name,
        od.description,
        od.work_location_id::text,
        wl.code AS work_location_code,
        wl.name AS work_location_name,
        od.job_position_id::text,
        jp.code AS job_position_code,
        jp.name AS job_position_name,
        od.vacancies_total,
        od.vacancies_filled,
        od.vacancies_open,
        od.effective_from,
        od.effective_to,
        od.status::text,
        od.created_at,
        od.updated_at
      FROM hr.organic_definition od
      JOIN hr.work_location wl ON wl.id = od.work_location_id
      JOIN hr.job_position jp ON jp.id = od.job_position_id
    `;
  }

  private toDto(row: OrganicDefinitionRow): Record<string, unknown> {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      workLocationId: row.work_location_id,
      workLocationCode: row.work_location_code,
      workLocationName: row.work_location_name,
      jobPositionId: row.job_position_id,
      jobPositionCode: row.job_position_code,
      jobPositionName: row.job_position_name,
      vacanciesTotal: row.vacancies_total,
      vacanciesFilled: row.vacancies_filled,
      vacanciesOpen: row.vacancies_open,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for organic definitions',
      );
    }
  }
}
