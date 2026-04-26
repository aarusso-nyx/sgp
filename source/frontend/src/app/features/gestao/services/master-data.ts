import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { OpenApiClient } from '../../../core/api/generated/openapi-client';
import { PagedResult } from '../../../core/models/paged-result';

export interface MasterDataField {
  key: string;
  label: string;
  type: 'text' | 'boolean' | 'number';
  required: boolean;
  maxLength?: number;
}

export interface MasterDataColumn {
  key: string;
  label: string;
}

export interface MasterDataResource {
  key: string;
  label: string;
  module: string;
  route: string;
  status: 'observed' | 'inferred' | 'unverified';
  observedActions: string[];
  fields: MasterDataField[];
  columns: MasterDataColumn[];
}

export interface MasterDataRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  status: 'observed' | 'inferred' | 'unverified';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MasterDataMutation {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MasterDataQuery extends Record<string, string | number | boolean | undefined> {
  page?: number;
  pageSize?: number;
  search?: string;
}

const ADMIN_MENUS_RESOURCE: MasterDataResource = {
  key: 'adminMenus',
  label: 'Menus Administrativos',
  module: 'gestao',
  route: '/v1/admin/menus',
  status: 'observed',
  observedActions: ['list', 'create', 'update', 'deactivate'],
  fields: [
    { key: 'code', label: 'Codigo', type: 'text', required: true, maxLength: 80 },
    { key: 'name', label: 'Nome', type: 'text', required: true, maxLength: 180 },
    { key: 'description', label: 'Rota', type: 'text', required: true, maxLength: 200 },
    { key: 'active', label: 'Ativo', type: 'boolean', required: true },
  ],
  columns: [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Rota' },
    { key: 'active', label: 'Ativo' },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class MasterData {
  constructor(private readonly api: OpenApiClient) {}

  listResources(query: MasterDataQuery = {}): Observable<PagedResult<MasterDataResource>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    return of({
      items: [ADMIN_MENUS_RESOURCE],
      page,
      pageSize,
      total: 1,
      totalPages: 1,
    });
  }

  listRecords(
    resource: string,
    query: MasterDataQuery = {},
  ): Observable<PagedResult<MasterDataRecord>> {
    if (resource !== ADMIN_MENUS_RESOURCE.key) {
      return of(this.emptyPage(query));
    }

    return this.api.getApiV1AdminMenus().pipe(
      map((result) => {
        const rawItems = this.extractItems(result);
        const mapped = rawItems
          .map((item) => this.toRecord(item))
          .filter((item) => {
            if (!query.search) {
              return true;
            }
            const search = query.search.toLowerCase();
            return `${item.code} ${item.name} ${item.description}`.toLowerCase().includes(search);
          });

        return {
          items: mapped,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? (mapped.length || 25),
          total: mapped.length,
          totalPages: 1,
        };
      }),
    );
  }

  createRecord(resource: string, body: MasterDataMutation): Observable<MasterDataRecord> {
    if (resource !== ADMIN_MENUS_RESOURCE.key) {
      return of(this.toRecord({ ...body, id: '' }));
    }

    return this.api
      .postApiV1AdminMenus({
        codigo: body.code,
        nome: body.name,
        rota: body.description ?? '/',
        ativo: body.active ?? true,
      })
      .pipe(map((result) => this.toRecord(result)));
  }

  updateRecord(
    resource: string,
    id: string,
    body: MasterDataMutation,
  ): Observable<MasterDataRecord> {
    if (resource !== ADMIN_MENUS_RESOURCE.key) {
      return of(this.toRecord({ ...body, id }));
    }

    return this.api
      .putApiV1AdminMenusById(
        { id },
        {
          codigo: body.code,
          nome: body.name,
          rota: body.description ?? '/',
          ativo: body.active ?? true,
        },
      )
      .pipe(map((result) => this.toRecord(result)));
  }

  deactivateRecord(resource: string, id: string): Observable<MasterDataRecord> {
    if (resource !== ADMIN_MENUS_RESOURCE.key) {
      return of(this.toRecord({ id, ativo: false }));
    }

    return this.api
      .deleteApiV1AdminMenusById({ id })
      .pipe(map((result) => this.toRecord({ ...(result as object), id, ativo: false })));
  }

  private emptyPage(query: MasterDataQuery): PagedResult<MasterDataRecord> {
    return {
      items: [],
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      total: 0,
      totalPages: 0,
    };
  }

  private extractItems(result: unknown): Record<string, unknown>[] {
    if (Array.isArray(result)) {
      return result as Record<string, unknown>[];
    }
    const value = result as { items?: unknown };
    if (Array.isArray(value?.items)) {
      return value.items as Record<string, unknown>[];
    }
    return [];
  }

  private toRecord(raw: unknown): MasterDataRecord {
    const value = (raw ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    return {
      id: String(value['id'] ?? ''),
      code: String(value['codigo'] ?? value['code'] ?? ''),
      name: String(value['nome'] ?? value['name'] ?? ''),
      description: String(value['rota'] ?? value['description'] ?? ''),
      active: Boolean(value['ativo'] ?? value['active'] ?? true),
      status: 'observed',
      metadata: {},
      createdAt: String(value['createdAt'] ?? now),
      updatedAt: String(value['updatedAt'] ?? now),
    };
  }
}
