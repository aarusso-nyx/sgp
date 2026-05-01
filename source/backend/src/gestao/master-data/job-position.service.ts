import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { JobPositionMutationDto } from './job-position.dto';

interface JobPositionRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  legal_regime: string;
  creation_law: string;
  vacancies_count: number;
  salary_range_id: string | null;
  salary_range_code: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class JobPositionService {
  constructor(private readonly database: DatabaseService) {}

  async list(query: DomainListQueryDto): Promise<PagedResponse<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim() ?? '';
    const offset = (page - 1) * pageSize;
    const params: unknown[] = [];
    const where = search
      ? `WHERE code ILIKE $1 OR name ILIKE $1 OR creation_law ILIKE $1`
      : '';
    if (search) params.push(`%${search}%`);
    const countRows = await this.database.query<CountRow>(
      `SELECT count(*)::text AS total FROM hr.job_position ${where}`,
      params,
    );
    const rows = await this.database.query<JobPositionRow>(
      `
      SELECT jp.id::text, jp.code, jp.name, jp.description, jp.category::text,
        jp.legal_regime, jp.creation_law, jp.vacancies_count,
        jp.salary_range_id::text, sr.code AS salary_range_code,
        jp.created_at, jp.updated_at
      FROM hr.job_position jp
      LEFT JOIN hr.salary_range sr ON sr.id = jp.salary_range_id
      ${where}
      ORDER BY jp.code
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

  async create(input: JobPositionMutationDto): Promise<unknown> {
    return this.database.transaction(async (client) => {
      await this.assertUniqueCode(client, input.code);
      const rows = await client.query<JobPositionRow>(
        `
        INSERT INTO hr.job_position (
          tenant_id, code, name, description, category, legal_regime,
          creation_law, vacancies_count, salary_range_id, status
        ) VALUES (
          NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
          $1, $2, COALESCE($3, ''), $4::hr.job_position_category, $5,
          $6, $7, $8::uuid, 'ACTIVE'
        )
        RETURNING id::text, code, name, description, category::text,
          legal_regime, creation_law, vacancies_count, salary_range_id::text,
          NULL::text AS salary_range_code, created_at, updated_at
        `,
        [
          input.code,
          input.name,
          input.description ?? '',
          input.category,
          input.legalRegime,
          input.creationLaw,
          input.vacanciesCount,
          input.salaryRangeId ?? null,
        ],
      );
      const row = rows.rows[0];
      await this.appendAudit(client, 'CREATE', row.id, null, this.toDto(row));
      return this.toDto(row);
    });
  }

  async update(id: string, input: JobPositionMutationDto): Promise<unknown> {
    return this.database.transaction(async (client) => {
      const before = await this.getRaw(client, id);
      if (before.code !== input.code) {
        await this.assertUniqueCode(client, input.code, id);
      }
      const updated = await client.query<JobPositionRow>(
        `
        UPDATE hr.job_position
        SET code = $2, name = $3, description = COALESCE($4, ''),
          category = $5::hr.job_position_category, legal_regime = $6,
          creation_law = $7, vacancies_count = $8, salary_range_id = $9::uuid,
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text, code, name, description, category::text,
          legal_regime, creation_law, vacancies_count, salary_range_id::text,
          NULL::text AS salary_range_code, created_at, updated_at
        `,
        [
          id,
          input.code,
          input.name,
          input.description ?? '',
          input.category,
          input.legalRegime,
          input.creationLaw,
          input.vacanciesCount,
          input.salaryRangeId ?? null,
        ],
      );
      const after = updated.rows[0];
      await this.appendAudit(
        client,
        'UPDATE',
        id,
        this.toDto(before),
        this.toDto(after),
      );
      return this.toDto(after);
    });
  }

  async salaryTable(id: string, competence: string): Promise<unknown> {
    const rows = await this.database.query<QueryResultRow>(
      `
      SELECT l.class_number, l.level_number_fol02 AS level_number,
        l.base_salary::text
      FROM hr.job_position jp
      JOIN hr.salary_range sr ON sr.id = jp.salary_range_id
      JOIN hr.salary_range_level l ON l.salary_range_id = sr.id
      WHERE jp.id = $1::uuid
        AND sr.starts_on <= ($2 || '-01')::date
        AND (sr.ends_on IS NULL OR sr.ends_on >= ($2 || '-01')::date)
      ORDER BY l.class_number, l.level_number_fol02
      `,
      [id, competence],
    );
    const matrix = new Map<number, Record<string, string>>();
    for (const row of rows) {
      const classNumber = Number(row.class_number);
      const entry = matrix.get(classNumber) ?? {};
      entry[String(row.level_number)] = String(row.base_salary);
      matrix.set(classNumber, entry);
    }
    return {
      jobPositionId: id,
      competence,
      classes: Object.fromEntries(matrix),
    };
  }

  private async getRaw(
    client: PoolClient,
    id: string,
  ): Promise<JobPositionRow> {
    const result = await client.query<JobPositionRow>(
      `
      SELECT id::text, code, name, description, category::text, legal_regime,
        creation_law, vacancies_count, salary_range_id::text,
        NULL::text AS salary_range_code, created_at, updated_at
      FROM hr.job_position WHERE id = $1::uuid
      `,
      [id],
    );
    if (!result.rows[0]) throw new NotFoundException('Job position not found.');
    return result.rows[0];
  }

  private async assertUniqueCode(
    client: PoolClient,
    code: string,
    exceptId?: string,
  ): Promise<void> {
    const result = await client.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.job_position
      WHERE code = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)
      `,
      [code, exceptId ?? null],
    );
    if (Number(result.rows[0]?.total ?? 0) > 0) {
      throw new ConflictException(
        'Job position code must be unique per tenant.',
      );
    }
  }

  private async appendAudit(
    client: PoolClient,
    action: 'CREATE' | 'UPDATE',
    id: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        $1, 'gestao.cargo', $2, NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'hr.job_position', NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('event', $3, 'before', $4::jsonb, 'after', $5::jsonb),
        NULL::text, NULL::text, NULL::text
      )
      `,
      [
        action,
        id,
        action === 'CREATE' ? 'gestao.cargo.created' : 'gestao.cargo.updated',
        JSON.stringify(before),
        JSON.stringify(after),
      ],
    );
  }

  private toDto(row: JobPositionRow): Record<string, unknown> {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category,
      legalRegime: row.legal_regime,
      creationLaw: row.creation_law,
      vacanciesCount: row.vacancies_count,
      salaryRangeId: row.salary_range_id,
      salaryRangeCode: row.salary_range_code,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
