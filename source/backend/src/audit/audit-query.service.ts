import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { PagedResponse } from '../common/pagination/paged-response';
import { DatabaseService } from '../database/database.service';
import { AuditEventQueryDto, AuditReportRequestDto } from './audit.dto';
import { redactAuditMetadata } from './audit-redaction.util';

interface AuditEventRow extends QueryResultRow {
  id: string;
  occurred_at: Date | string;
  actor_login: string | null;
  actor_sub: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  table_name: string | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
}

interface AuditCountRow extends QueryResultRow {
  total: string;
}

interface AuditFacetRow extends QueryResultRow {
  value: string;
  label: string;
  count: string;
}

interface AuditReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
  completed_at: Date | string | null;
  error_message: string | null;
}

export interface AuditEventDto {
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

export interface AuditFacetDto {
  value: string;
  label: string;
  count: number;
}

export interface AuditReportRequestSummary {
  id: string;
  status: string;
  requestedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

@Injectable()
export class AuditQueryService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(query: AuditEventQueryDto): Promise<PagedResponse<AuditEventDto>> {
    this.ensureDatabase();

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const { where, values } = this.whereClause(query);

    const countRows = await this.databaseService.query<AuditCountRow>(
      `SELECT count(*)::text AS total FROM public.audit_event ae ${where}`,
      values,
    );

    const rows = await this.databaseService.query<AuditEventRow>(
      `
      SELECT
        ae.id,
        ae.occurred_at,
        ae.actor_login,
        ae.actor_sub,
        ae.action::text AS action,
        ae.resource_type,
        ae.resource_id,
        ae.table_name,
        ae.request_id,
        ae.ip_address::text AS ip_address,
        ae.user_agent,
        ae.metadata
      FROM public.audit_event ae
      ${where}
      ORDER BY ae.occurred_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
      [...values, pageSize, offset],
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

  async getById(id: string): Promise<AuditEventDto | null> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AuditEventRow>(
      `
      SELECT
        ae.id,
        ae.occurred_at,
        ae.actor_login,
        ae.actor_sub,
        ae.action::text AS action,
        ae.resource_type,
        ae.resource_id,
        ae.table_name,
        ae.request_id,
        ae.ip_address::text AS ip_address,
        ae.user_agent,
        ae.metadata
      FROM public.audit_event ae
      WHERE ae.id = $1::uuid
      `,
      [id],
    );
    const row = rows[0];
    return row ? this.toDto(row) : null;
  }

  async actionFacets(query: AuditEventQueryDto): Promise<AuditFacetDto[]> {
    return this.facet('ae.action::text', 'ae.action::text', query);
  }

  async tableFacets(query: AuditEventQueryDto): Promise<AuditFacetDto[]> {
    return this.facet(
      'ae.table_name',
      'coalesce(ae.table_name, ae.resource_type)',
      query,
    );
  }

  async userFacets(query: AuditEventQueryDto): Promise<AuditFacetDto[]> {
    return this.facet(
      'ae.actor_login',
      'coalesce(ae.actor_login, ae.actor_sub)',
      query,
    );
  }

  async createReportRequest(
    input: AuditReportRequestDto,
  ): Promise<AuditReportRequestSummary> {
    this.ensureDatabase();
    const parameters = redactAuditMetadata({
      ...input.parameters,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      actor: input.actor,
      action: input.action,
      tableName: input.tableName,
      resourceType: input.resourceType,
      search: input.search,
    }) as Record<string, unknown>;

    const rows = await this.databaseService.query<AuditReportRequestRow>(
      `
      WITH definition AS (
        INSERT INTO public.report_definition (tenant_id, code, module_key, name, description, status)
        VALUES (
          public.sgp_current_tenant_uuid(),
          'AUDIT_TRAIL_EXPORT',
          'auditoria',
          'Exportacao de trilha de auditoria',
          'Solicitacao de relatorio/exportacao de eventos de auditoria',
          'ACTIVE'::"RecordStatus"
        )
        ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
        RETURNING id
      )
      INSERT INTO public.report_request (definition_id, status, parameters)
      SELECT id, 'REQUESTED'::"ReportRequestStatus", $1::jsonb
      FROM definition
      RETURNING id, status::text, requested_at, completed_at, error_message
      `,
      [JSON.stringify(parameters)],
    );

    const row = rows[0];
    return {
      id: row.id,
      status: row.status,
      requestedAt: this.toIso(row.requested_at),
      completedAt: row.completed_at ? this.toIso(row.completed_at) : null,
      errorMessage: row.error_message,
    };
  }

  async getReportRequestStatus(
    id: string,
  ): Promise<AuditReportRequestSummary | null> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AuditReportRequestRow>(
      `
      SELECT id::text, status::text, requested_at, completed_at, error_message
      FROM public.report_request
      WHERE id = $1::uuid
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      status: row.status,
      requestedAt: this.toIso(row.requested_at),
      completedAt: row.completed_at ? this.toIso(row.completed_at) : null,
      errorMessage: row.error_message,
    };
  }

  private async facet(
    valueExpression: string,
    labelExpression: string,
    query: AuditEventQueryDto,
  ): Promise<AuditFacetDto[]> {
    this.ensureDatabase();
    const { where, values } = this.whereClause(query);
    const rows = await this.databaseService.query<AuditFacetRow>(
      `
      SELECT
        ${valueExpression} AS value,
        ${labelExpression} AS label,
        count(*)::text AS count
      FROM public.audit_event ae
      ${where}
      GROUP BY value, label
      HAVING ${valueExpression} IS NOT NULL
      ORDER BY count(*) DESC, label ASC
      LIMIT 100
      `,
      values,
    );

    return rows
      .filter((row) => row.value)
      .map((row) => ({
        value: row.value,
        label: row.label,
        count: Number(row.count),
      }));
  }

  private whereClause(query: AuditEventQueryDto): {
    where: string;
    values: unknown[];
  } {
    const values: unknown[] = [];
    const clauses: string[] = [];

    if (query.search) {
      values.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`lower(concat_ws(' ',
        coalesce(ae.actor_login, ''),
        coalesce(ae.actor_sub, ''),
        ae.action::text,
        ae.resource_type,
        coalesce(ae.resource_id, ''),
        coalesce(ae.table_name, ''),
        coalesce(ae.request_id, ''),
        coalesce(ae.user_agent, ''),
        coalesce(ae.metadata::text, '')
      )) LIKE $${values.length}`);
    }
    if (query.dateFrom) {
      values.push(query.dateFrom);
      clauses.push(`ae.occurred_at >= $${values.length}::timestamptz`);
    }
    if (query.dateTo) {
      values.push(query.dateTo);
      clauses.push(
        `ae.occurred_at < ($${values.length}::date + interval '1 day')`,
      );
    }
    if (query.actor) {
      values.push(`%${query.actor.toLowerCase()}%`);
      clauses.push(
        `lower(concat_ws(' ', coalesce(ae.actor_login, ''), coalesce(ae.actor_sub, ''))) LIKE $${values.length}`,
      );
    }
    if (query.action) {
      values.push(query.action);
      clauses.push(`ae.action = $${values.length}::"AuditAction"`);
    }
    if (query.tableName) {
      values.push(query.tableName);
      clauses.push(`ae.table_name = $${values.length}`);
    }
    if (query.resourceType) {
      values.push(query.resourceType);
      clauses.push(`ae.resource_type = $${values.length}`);
    }
    if (query.resourceId) {
      values.push(query.resourceId);
      clauses.push(`ae.resource_id = $${values.length}`);
    }
    if (query.requestId) {
      values.push(query.requestId);
      clauses.push(`ae.request_id = $${values.length}`);
    }
    if (query.statusCode) {
      values.push(query.statusCode);
      clauses.push(`(ae.metadata ->> 'statusCode')::int = $${values.length}`);
    }

    return {
      where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      values,
    };
  }

  private toDto(row: AuditEventRow): AuditEventDto {
    const metadata = row.metadata ?? {};
    const statusValue = metadata['statusCode'];
    return {
      id: row.id,
      occurredAt: this.toIso(row.occurred_at),
      actorLogin: row.actor_login,
      actorSub: row.actor_sub,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      tableName: row.table_name,
      requestId: row.request_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      statusCode: typeof statusValue === 'number' ? statusValue : null,
      metadata,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for audit search',
      );
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
