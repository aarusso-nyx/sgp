import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { PagedResponse } from '../common/pagination/paged-response';
import { DatabaseService } from '../database/database.service';
import {
  AssignProfilePermissionsDto,
  CreateProfileDto,
  ProfileListQueryDto,
  UpdateProfileDto,
} from './profiles.dto';

interface ProfileRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(query: ProfileListQueryDto): Promise<PagedResponse<unknown>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const countRows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.access_profile ap
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', ap.code, ap.name, coalesce(ap.description, ''))) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<ProfileRow>(
      `
      SELECT
        ap.id::text,
        ap.code,
        ap.name,
        ap.description,
        ap.status::text,
        ap.created_at,
        ap.updated_at
      FROM public.access_profile ap
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', ap.code, ap.name, coalesce(ap.description, ''))) LIKE $1
      ORDER BY ap.name ASC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
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

  async getById(id: string): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ProfileRow>(
      `
      SELECT
        ap.id::text,
        ap.code,
        ap.name,
        ap.description,
        ap.status::text,
        ap.created_at,
        ap.updated_at
      FROM public.access_profile ap
      WHERE ap.id = $1::uuid
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Profile not found');
    }
    const permissions = await this.databaseService.query<{ key: string }>(
      `
      SELECT p.key
      FROM public.profile_permission pp
      JOIN public.permission p ON p.id = pp.permission_id
      WHERE pp.profile_id = $1::uuid
        AND pp.allowed = true
      ORDER BY p.key ASC
      `,
      [id],
    );
    return {
      ...this.toDto(row),
      papeis: permissions.map((entry) => entry.key),
    };
  }

  async create(input: CreateProfileDto): Promise<unknown> {
    this.ensureDatabase();
    try {
      const rows = await this.databaseService.query<ProfileRow>(
        `
        INSERT INTO public.access_profile (code, name, description, status)
        VALUES ($1, $2, $3, 'ACTIVE'::"RecordStatus")
        RETURNING
          id::text,
          code,
          name,
          description,
          status::text,
          created_at,
          updated_at
        `,
        [input.code.trim(), input.name.trim(), input.description?.trim() ?? ''],
      );
      return this.toDto(rows[0]);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        throw new ConflictException('Profile code already exists');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateProfileDto): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ProfileRow>(
      `
      UPDATE public.access_profile
      SET
        name = COALESCE(NULLIF($2, ''), name),
        description = COALESCE($3, description),
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text,
        code,
        name,
        description,
        status::text,
        created_at,
        updated_at
      `,
      [id, input.name ?? '', input.description ?? null],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Profile not found');
    }
    return this.toDto(row);
  }

  async deactivate(id: string): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ProfileRow>(
      `
      UPDATE public.access_profile
      SET
        status = 'INACTIVE'::"RecordStatus",
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text,
        code,
        name,
        description,
        status::text,
        created_at,
        updated_at
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Profile not found');
    }
    return this.toDto(row);
  }

  async setPermissions(
    id: string,
    input: AssignProfilePermissionsDto,
  ): Promise<unknown> {
    this.ensureDatabase();
    const exists = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.access_profile
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (Number(exists[0]?.total ?? 0) === 0) {
      throw new NotFoundException('Profile not found');
    }

    await this.databaseService.query(
      `
      DELETE FROM public.profile_permission
      WHERE profile_id = $1::uuid
      `,
      [id],
    );

    if (input.papeis.length > 0) {
      await this.databaseService.query(
        `
        INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
        SELECT
          $1::uuid,
          p.id,
          true
        FROM public.permission p
        WHERE p.key = ANY($2::text[])
        `,
        [id, input.papeis],
      );
    }

    return this.getById(id);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for profiles operations',
      );
    }
  }

  private toDto(row: ProfileRow) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
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
