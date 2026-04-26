import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { OpenApiClient } from '../../../core/api/generated/openapi-client';
import { PagedResult } from '../../../core/models/paged-result';

export interface AuditEventRecord {
  id: string;
  occurredAt: string;
  actorLogin: string | null;
  actorSub: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  tableName: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  statusCode: number | null;
  metadata: Record<string, unknown>;
}

export interface AuditFacet {
  value: string;
  label: string;
  count: number;
}

export interface AuditEventQuery extends Record<string, string | number | boolean | undefined> {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  actor?: string;
  action?: string;
  tableName?: string;
  resourceType?: string;
  resourceId?: string;
  requestId?: string;
  statusCode?: number;
}

export interface AuditReportRequest extends Record<string, unknown> {
  dateFrom?: string;
  dateTo?: string;
  actor?: string;
  action?: string;
  tableName?: string;
  resourceType?: string;
  search?: string;
  parameters?: Record<string, unknown>;
}

export interface AuditReportRequestSummary {
  id: string;
  status: string;
  requestedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuditEvents {
  constructor(private readonly api: OpenApiClient) {}

  list(query: AuditEventQuery = {}): Observable<PagedResult<AuditEventRecord>> {
    return this.api
      .getApiV1AuditoriaLogs(query)
      .pipe(map((result) => this.toPagedResult(result)));
  }

  actionFacets(query: AuditEventQuery = {}): Observable<AuditFacet[]> {
    return this.buildFacets(query, (item) => item.action);
  }

  tableFacets(query: AuditEventQuery = {}): Observable<AuditFacet[]> {
    return this.buildFacets(
      query,
      (item) => item.tableName ?? item.resourceType,
    );
  }

  userFacets(query: AuditEventQuery = {}): Observable<AuditFacet[]> {
    return this.buildFacets(query, (item) => item.actorLogin ?? item.actorSub);
  }

  requestReport(body: AuditReportRequest): Observable<AuditReportRequestSummary> {
    return this.api
      .postApiV1AuditoriaExportacoes(body)
      .pipe(map((result) => this.toReportSummary(result)));
  }

  private buildFacets(
    query: AuditEventQuery,
    selector: (item: AuditEventRecord) => string | null | undefined,
  ): Observable<AuditFacet[]> {
    return this.list({ ...query, page: 1, pageSize: 200 }).pipe(
      map((result) => {
        const counts = new Map<string, number>();
        for (const item of result.items) {
          const value = selector(item);
          if (!value) {
            continue;
          }
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }

        return [...counts.entries()]
          .map(([value, count]) => ({ value, label: value, count }))
          .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
      }),
    );
  }

  private toPagedResult(result: unknown): PagedResult<AuditEventRecord> {
    const value = (result ?? {}) as Partial<PagedResult<AuditEventRecord>>;
    return {
      items: Array.isArray(value.items) ? value.items : [],
      page: typeof value.page === 'number' ? value.page : 1,
      pageSize: typeof value.pageSize === 'number' ? value.pageSize : 25,
      total: typeof value.total === 'number' ? value.total : 0,
      totalPages: typeof value.totalPages === 'number' ? value.totalPages : 0,
    };
  }

  private toReportSummary(result: unknown): AuditReportRequestSummary {
    const value = (result ?? {}) as Partial<AuditReportRequestSummary>;
    return {
      id: value.id ?? '',
      status: value.status ?? 'REQUESTED',
      requestedAt: value.requestedAt ?? new Date().toISOString(),
    };
  }
}
