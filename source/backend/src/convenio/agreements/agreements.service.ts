import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { AgreementMutationDto } from './agreements.dto';

export interface AgreementSummary {
  id: string;
  code: string;
  description: string;
  institution: string | null;
  program: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AgreementRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  institution_name: string | null;
  program_name: string | null;
  starts_on: Date | string | null;
  ends_on: Date | string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class AgreementsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<AgreementSummary>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.agreement a
      LEFT JOIN hr.education_institution ei ON ei.id = a.institution_id
      LEFT JOIN hr.internship_program ip ON ip.id = a.program_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              a.code,
              coalesce(a.description, ''),
              coalesce(ei.name, ''),
              coalesce(ip.name, ''),
              a.status::text
            )) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<AgreementRow>(
      `
      SELECT
        a.id,
        a.code,
        a.description,
        ei.name AS institution_name,
        ip.name AS program_name,
        a.starts_on,
        a.ends_on,
        a.status::text AS status,
        a.created_at,
        a.updated_at
      FROM hr.agreement a
      LEFT JOIN hr.education_institution ei ON ei.id = a.institution_id
      LEFT JOIN hr.internship_program ip ON ip.id = a.program_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              a.code,
              coalesce(a.description, ''),
              coalesce(ei.name, ''),
              coalesce(ip.name, ''),
              a.status::text
            )) LIKE $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toSummary(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async create(input: AgreementMutationDto): Promise<AgreementSummary> {
    this.ensureDatabase();
    try {
      const rows = await this.databaseService.query<AgreementRow>(
        `
        INSERT INTO hr.agreement (
          code,
          description,
          institution_id,
          program_id,
          status
        )
        VALUES (
          $1,
          $2,
          NULLIF($3, '')::uuid,
          NULLIF($4, '')::uuid,
          'DRAFT'::"AgreementStatus"
        )
        RETURNING
          id,
          code,
          description,
          NULL::text AS institution_name,
          NULL::text AS program_name,
          starts_on,
          ends_on,
          status::text AS status,
          created_at,
          updated_at
        `,
        [
          input.code.trim(),
          input.description?.trim() ?? '',
          input.institutionId ?? '',
          input.programId ?? '',
        ],
      );
      return this.toSummary(rows[0]);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        throw new ConflictException('Agreement code already exists');
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: AgreementMutationDto,
  ): Promise<AgreementSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AgreementRow>(
      `
      UPDATE hr.agreement
      SET
        code = $2,
        description = $3,
        institution_id = NULLIF($4, '')::uuid,
        program_id = NULLIF($5, '')::uuid,
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        code,
        description,
        NULL::text AS institution_name,
        NULL::text AS program_name,
        starts_on,
        ends_on,
        status::text AS status,
        created_at,
        updated_at
      `,
      [
        id,
        input.code.trim(),
        input.description?.trim() ?? '',
        input.institutionId ?? '',
        input.programId ?? '',
      ],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Agreement not found');
    return this.toSummary(row);
  }

  async deactivate(id: string): Promise<AgreementSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AgreementRow>(
      `
      UPDATE hr.agreement
      SET status = 'TERMINATED'::"AgreementStatus",
          updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        code,
        description,
        NULL::text AS institution_name,
        NULL::text AS program_name,
        starts_on,
        ends_on,
        status::text AS status,
        created_at,
        updated_at
      `,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Agreement not found');
    return this.toSummary(row);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for agreement operations',
      );
    }
  }

  private toSummary(row: AgreementRow): AgreementSummary {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      institution: row.institution_name,
      program: row.program_name,
      startsOn: row.starts_on ? this.toIso(row.starts_on) : null,
      endsOn: row.ends_on ? this.toIso(row.ends_on) : null,
      status: row.status,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
