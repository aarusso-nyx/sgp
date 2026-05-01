import { Injectable } from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { PERMISSIONS, Permission } from './permission-catalog.generated';

interface CachedGroupPermissions {
  expiresAt: number;
  permissions: Permission[];
}

@Injectable()
export class PermissionsService {
  private readonly cache = new Map<string, CachedGroupPermissions>();
  private readonly cacheTtlMs = 30_000;

  constructor(private readonly databaseService: DatabaseService) {}

  listPermissions(): Permission[] {
    return [...PERMISSIONS];
  }

  async listGroupMappings(): Promise<
    Array<{ group: string; permissions: Permission[] }>
  > {
    const rows = await this.databaseService.query<{
      group_code: string;
      permissions: string[];
    }>(`
      SELECT
        ap.code AS group_code,
        array_agg(p.key ORDER BY p.key) FILTER (WHERE p.key IS NOT NULL) AS permissions
      FROM public.access_profile ap
      LEFT JOIN public.profile_permission pp
        ON pp.profile_id = ap.id
       AND pp.allowed = true
      LEFT JOIN public.permission p
        ON p.id = pp.permission_id
      WHERE ap.status = 'ACTIVE'::"RecordStatus"
      GROUP BY ap.code
      ORDER BY ap.code
    `);

    return rows.map((row) => ({
      group: row.group_code,
      permissions: this.onlyCatalogPermissions(row.permissions ?? []),
    }));
  }

  async permissionsForGroups(
    groups: string[],
    tenantId?: string,
  ): Promise<Permission[]> {
    const normalizedGroups = this.normalizeGroups(groups);
    if (!normalizedGroups.length) return [];

    const cacheKey = `${tenantId ?? 'global'}\n${normalizedGroups.join('\n')}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const query = () =>
      this.databaseService.query<{ key: string }>(
        `
      SELECT DISTINCT p.key
      FROM public.access_profile ap
      JOIN public.profile_permission pp
        ON pp.profile_id = ap.id
       AND pp.allowed = true
      JOIN public.permission p
        ON p.id = pp.permission_id
      WHERE ap.status = 'ACTIVE'::"RecordStatus"
        AND ap.code = ANY($1::text[])
      ORDER BY p.key
      `,
        [normalizedGroups],
      );
    const rows = tenantId
      ? await RequestContextStore.run(
          { tenantId, permissions: ['gestao.read'] },
          query,
        )
      : await query();

    const permissions = this.onlyCatalogPermissions(rows.map((row) => row.key));
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.cacheTtlMs,
      permissions,
    });
    return permissions;
  }

  private onlyCatalogPermissions(values: string[]): Permission[] {
    const valid = new Set<string>(PERMISSIONS);
    return [
      ...new Set(values.filter((value) => valid.has(value))),
    ].sort() as Permission[];
  }

  private normalizeGroups(groups: string[]): string[] {
    return [
      ...new Set(
        groups
          .map((group) =>
            group
              .trim()
              .toUpperCase()
              .replace(/^SGP_/, '')
              .replace(/[\s-]+/g, '_'),
          )
          .filter(Boolean),
      ),
    ].sort();
  }
}
