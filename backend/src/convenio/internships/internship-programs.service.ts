import { ConflictException, Injectable } from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { CreateInternshipProgramDto } from './internships.dto';
import {
  CountRow,
  InternshipProgramSummary,
  ProgramRow,
} from './internships.types';
import {
  assertDateRange,
  ensureDatabase,
  toProgramSummary,
} from './internships.utils';

@Injectable()
export class InternshipProgramsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listPrograms(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<InternshipProgramSummary>> {
    ensureDatabase(this.databaseService);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.internship_program p
      LEFT JOIN hr.education_institution i ON i.id = p.institution_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', p.code, p.name, p.description, coalesce(i.name, ''), p.status::text)) LIKE $1
      `,
      [searchTerm],
    );
    const rows = await this.databaseService.query<ProgramRow>(
      `
      SELECT
        p.id::text,
        p.code,
        p.name,
        p.description,
        i.name AS institution_name,
        p.starts_on,
        p.ends_on,
        p.status::text AS status
      FROM hr.internship_program p
      LEFT JOIN hr.education_institution i ON i.id = p.institution_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', p.code, p.name, p.description, coalesce(i.name, ''), p.status::text)) LIKE $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );
    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map(toProgramSummary),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async createProgram(
    input: CreateInternshipProgramDto,
  ): Promise<InternshipProgramSummary> {
    ensureDatabase(this.databaseService);
    assertDateRange(input.startsOn, input.endsOn, 'Program');
    try {
      const rows = await this.databaseService.query<ProgramRow>(
        `
        INSERT INTO hr.internship_program (
          code,
          name,
          description,
          institution_id,
          starts_on,
          ends_on
        )
        VALUES ($1, $2, $3, NULLIF($4, '')::uuid, NULLIF($5, '')::date, NULLIF($6, '')::date)
        RETURNING
          id::text,
          code,
          name,
          description,
          NULL::text AS institution_name,
          starts_on,
          ends_on,
          status::text AS status
        `,
        [
          input.code.trim(),
          input.name.trim(),
          input.description?.trim() ?? '',
          input.institutionId ?? '',
          input.startsOn ?? '',
          input.endsOn ?? '',
        ],
      );
      return toProgramSummary(rows[0]!);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Internship program code already exists');
      }
      throw error;
    }
  }
}
