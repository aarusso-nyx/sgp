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
  AssignDirectRolesDto,
  AssignProfilesDto,
  CreateUserDto,
  UpdateUserDto,
  UserListQueryDto,
} from './users.dto';

interface UserRow extends QueryResultRow {
  id: string;
  login: string;
  name: string;
  email: string | null;
  cpf: string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
  profile_codes: string[] | null;
}

interface CountRow extends QueryResultRow {
  total: string;
}

interface ProfileRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(query: UserListQueryDto): Promise<PagedResponse<unknown>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const filters = [
      `(($1 = '%%')
        OR lower(concat_ws(' ', ua.login, ua.name, coalesce(ua.email, ''), coalesce(ua.cpf, ''))) LIKE $1)`,
      `($2::text IS NULL OR ua.status::text = $2::text)`,
      `(
        $3::uuid IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.profile_assignment pa2
          WHERE pa2.user_id = ua.id
            AND pa2.profile_id = $3::uuid
            AND (pa2.ends_at IS NULL OR pa2.ends_at > now())
        )
      )`,
    ];

    const baseValues: unknown[] = [
      searchTerm,
      query.status ?? null,
      query.profileId ?? null,
    ];

    const countRows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.user_account ua
      WHERE ${filters.join(' AND ')}
      `,
      baseValues,
    );

    const rows = await this.databaseService.query<UserRow>(
      `
      SELECT
        ua.id::text,
        ua.login,
        ua.name,
        ua.email,
        ua.cpf,
        ua.status::text,
        ua.created_at,
        ua.updated_at,
        array_remove(array_agg(ap.code), NULL) AS profile_codes
      FROM public.user_account ua
      LEFT JOIN public.profile_assignment pa
        ON pa.user_id = ua.id
       AND (pa.ends_at IS NULL OR pa.ends_at > now())
      LEFT JOIN public.access_profile ap
        ON ap.id = pa.profile_id
      WHERE ${filters.join(' AND ')}
      GROUP BY ua.id
      ORDER BY ua.name ASC
      LIMIT $4 OFFSET $5
      `,
      [...baseValues, pageSize, offset],
    );

    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: rows.map((row) => ({
        id: row.id,
        login: row.login,
        name: row.name,
        email: row.email,
        cpf: row.cpf,
        status: row.status,
        profileCodes: row.profile_codes ?? [],
        createdAt: this.toIso(row.created_at),
        updatedAt: this.toIso(row.updated_at),
      })),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async create(input: CreateUserDto): Promise<unknown> {
    this.ensureDatabase();
    try {
      const rows = await this.databaseService.query<UserRow>(
        `
        INSERT INTO public.user_account (
          login,
          name,
          email,
          cpf,
          cognito_sub,
          status
        )
        VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), $6::"UserStatus")
        RETURNING
          id::text,
          login,
          name,
          email,
          cpf,
          status::text,
          created_at,
          updated_at,
          ARRAY[]::text[] AS profile_codes
        `,
        [
          input.login.trim(),
          input.name.trim(),
          input.email?.trim().toLowerCase() ?? '',
          input.cpf?.trim() ?? '',
          input.cognitoSub?.trim() ?? '',
          input.status ?? 'ACTIVE',
        ],
      );

      const row = rows[0];
      return {
        id: row.id,
        login: row.login,
        name: row.name,
        email: row.email,
        cpf: row.cpf,
        status: row.status,
        profileCodes: [],
        createdAt: this.toIso(row.created_at),
        updatedAt: this.toIso(row.updated_at),
      };
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        throw new ConflictException(
          'A user with same login, CPF, or email already exists',
        );
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUserDto): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<UserRow>(
      `
      UPDATE public.user_account
      SET
        name = COALESCE(NULLIF($2, ''), name),
        email = COALESCE(NULLIF($3, ''), email),
        status = COALESCE($4::"UserStatus", status),
        updated_at = now(),
        deactivated_at = CASE
          WHEN COALESCE($4::"UserStatus", status) = 'ACTIVE'::"UserStatus" THEN NULL
          WHEN deactivated_at IS NULL THEN now()
          ELSE deactivated_at
        END
      WHERE id = $1::uuid
      RETURNING
        id::text,
        login,
        name,
        email,
        cpf,
        status::text,
        created_at,
        updated_at,
        ARRAY[]::text[] AS profile_codes
      `,
      [id, input.name ?? '', input.email ?? '', input.status ?? null],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('User not found');
    }

    return {
      id: row.id,
      login: row.login,
      name: row.name,
      email: row.email,
      cpf: row.cpf,
      status: row.status,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  async assignProfiles(
    userId: string,
    input: AssignProfilesDto,
  ): Promise<unknown> {
    this.ensureDatabase();
    await this.assertUserExists(userId);
    await this.databaseService.query(
      `
      UPDATE public.profile_assignment
      SET ends_at = now()
      WHERE user_id = $1::uuid
        AND (ends_at IS NULL OR ends_at > now())
      `,
      [userId],
    );

    if (input.perfis.length > 0) {
      await this.databaseService.query(
        `
        INSERT INTO public.profile_assignment (user_id, profile_id, starts_at)
        SELECT $1::uuid, profile_id, now()
        FROM unnest($2::uuid[]) AS profile_id
        `,
        [userId, input.perfis],
      );
    }

    const rows = await this.databaseService.query<ProfileRow>(
      `
      SELECT ap.id::text, ap.code, ap.name
      FROM public.profile_assignment pa
      JOIN public.access_profile ap ON ap.id = pa.profile_id
      WHERE pa.user_id = $1::uuid
        AND (pa.ends_at IS NULL OR pa.ends_at > now())
      ORDER BY ap.name ASC
      `,
      [userId],
    );

    return {
      userId,
      profiles: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
      })),
    };
  }

  async assignDirectRoles(
    userId: string,
    input: AssignDirectRolesDto,
  ): Promise<unknown> {
    this.ensureDatabase();
    await this.assertUserExists(userId);

    await this.databaseService.query(
      `
      UPDATE public.user_group_snapshot
      SET expires_at = now()
      WHERE user_id = $1::uuid
        AND (expires_at IS NULL OR expires_at > now())
      `,
      [userId],
    );

    if (input.papeis.length > 0) {
      await this.databaseService.query(
        `
        INSERT INTO public.user_group_snapshot (
          user_id,
          provider,
          group_key,
          captured_at,
          raw_claims
        )
        SELECT $1::uuid, 'admin', grp.group_key, now(), '{}'::jsonb
        FROM unnest($2::text[]) AS grp(group_key)
        `,
        [userId, input.papeis],
      );
    }

    return {
      userId,
      papeis: input.papeis,
      updatedAt: new Date().toISOString(),
    };
  }

  private async assertUserExists(id: string): Promise<void> {
    const rows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.user_account
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (Number(rows[0]?.total ?? 0) === 0) {
      throw new NotFoundException('User not found');
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for users operations',
      );
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
