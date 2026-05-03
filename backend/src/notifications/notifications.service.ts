import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';
import {
  createPagedResponse,
  PagedResponse,
  resolvePagination,
} from '../common/pagination/paged-response';
import { DatabaseService } from '../database/database.service';

interface NotificationRow extends QueryResultRow {
  id: string;
  title: string;
  body: string;
  module_key: string | null;
  read_at: Date | string | null;
  created_at: Date | string;
  metadata: Record<string, unknown> | null;
}

interface CountRow extends QueryResultRow {
  total: string;
}

interface UpdateRow extends QueryResultRow {
  id: string;
  read_at: Date | string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(query: DomainListQueryDto): Promise<PagedResponse<unknown>> {
    this.ensureDatabase();
    const pagination = resolvePagination(query);
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.notification n
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', n.title, n.body, coalesce(n.module_key, ''))) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<NotificationRow>(
      `
      SELECT id, title, body, module_key, read_at, created_at, metadata
      FROM public.notification n
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', n.title, n.body, coalesce(n.module_key, ''))) LIKE $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pagination.pageSize, pagination.offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return createPagedResponse(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        moduleKey: row.module_key,
        readAt: row.read_at ? this.toIso(row.read_at) : null,
        createdAt: this.toIso(row.created_at),
        metadata: row.metadata ?? {},
      })),
      total,
      pagination,
    );
  }

  async unreadCount(): Promise<{ unread: number }> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.notification
      WHERE read_at IS NULL
      `,
    );
    return { unread: Number(rows[0]?.total ?? 0) };
  }

  async markRead(
    id: string,
    read = true,
  ): Promise<{ id: string; readAt: string | null }> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<UpdateRow>(
      `
      UPDATE public.notification
      SET
        read_at = CASE WHEN $2 THEN now() ELSE NULL END
      WHERE id = $1::uuid
      RETURNING id, read_at
      `,
      [id, read],
    );
    const row = rows[0];
    return {
      id: row?.id ?? id,
      readAt: row?.read_at ? this.toIso(row.read_at) : null,
    };
  }

  async markAllRead(): Promise<{ updated: number }> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CountRow>(
      `
      WITH updated AS (
        UPDATE public.notification
        SET read_at = now()
        WHERE read_at IS NULL
        RETURNING id
      )
      SELECT count(*)::text AS total
      FROM updated
      `,
    );
    return { updated: Number(rows[0]?.total ?? 0) };
  }

  getUserPreferences(): Record<string, unknown> {
    return {
      canais: {
        email: true,
        push: true,
        sms: false,
      },
      categorias: {
        sistema: true,
        folha: true,
        rh: true,
        auditoria: true,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  updateUserPreferences(preferences: unknown): Record<string, unknown> {
    return {
      ...this.getUserPreferences(),
      ...((preferences as Record<string, unknown>) ?? {}),
      updatedAt: new Date().toISOString(),
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for notifications operations',
      );
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
