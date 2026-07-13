import { Injectable } from '@nestjs/common';
import type { AuditEventEnvelope, AuditSink } from '@stynx-nyx/contracts';

import type { RequestWithContext } from '../common/request-id/request-with-context';
import { AuditMutationContextStore } from '../common/audit/audit-mutation-context.store';
import { recordAuditEvent } from '../common/observability/prometheus.metrics';
import { DatabaseService } from '../database/database.service';
import { AuditActionValue } from './audit.dto';
import { redactAuditMetadata } from './audit-redaction.util';

export interface AuditAppendOptions {
  resourceId?: string | undefined;
  tableName?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  statusCode?: number | undefined;
  reason?: string | undefined;
}

@Injectable()
export class AuditWriterService implements AuditSink {
  constructor(private readonly databaseService: DatabaseService) {}

  async write(event: AuditEventEnvelope): Promise<void> {
    if (!this.databaseService.configured) return;
    const metadata = redactAuditMetadata(event.metadata ?? {}) as Record<
      string,
      unknown
    >;
    await this.databaseService.query(
      `
      SELECT public.sgp_append_audit_event(
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11
      )
      `,
      [
        event.action.toUpperCase(),
        event.entity,
        event.entityId ?? null,
        event.actorId ?? null,
        event.actorId ?? null,
        null,
        event.requestId ?? event.correlationId ?? null,
        JSON.stringify(metadata),
        null,
        event.ipAddress ?? null,
        null,
      ],
    );
  }

  async auditMutation(
    request: RequestWithContext,
    action: Extract<
      AuditActionValue,
      | 'CREATE'
      | 'UPDATE'
      | 'DELETE'
      | 'PROCESS'
      | 'GENERATE'
      | 'IMPORT'
      | 'APPROVE'
    >,
    resourceType: string,
    options: AuditAppendOptions = {},
  ): Promise<void> {
    await this.appendEvent(request, action, resourceType, options);
    AuditMutationContextStore.markMutationAudited();
  }

  async appendEvent(
    request: RequestWithContext,
    action: AuditActionValue,
    resourceType: string,
    options: AuditAppendOptions = {},
  ): Promise<void> {
    if (!this.databaseService.configured) return;

    const metadata = redactAuditMetadata({
      ...(options.metadata ?? {}),
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode: options.statusCode,
      tenantId: request.actor?.tenantId ?? request.tenantId ?? null,
      actorGroups: request.actor?.groups ?? [],
      ipAddress: this.clientIp(request) || null,
      userAgent: this.userAgent(request),
    }) as Record<string, unknown>;

    await this.databaseService.query(
      `
      SELECT public.sgp_append_audit_event(
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::jsonb,
        $9,
        $10,
        $11
      )
      `,
      [
        action,
        resourceType,
        options.resourceId ?? null,
        request.actor?.sub ?? null,
        request.actor?.username ?? null,
        options.tableName ?? null,
        request.requestId ?? null,
        JSON.stringify(metadata),
        options.reason ?? null,
        this.clientIp(request),
        this.userAgent(request),
      ],
    );
    await this.recordInternationalTransferEvent(request, resourceType, options);
    const labels = AuditMutationContextStore.labels();
    recordAuditEvent(
      this.auditLabel(labels?.controller, options.metadata?.['controller']),
      this.auditRoute(labels?.route, request),
    );
  }

  private auditLabel(
    contextValue: string | undefined,
    metadataValue: unknown,
  ): string {
    if (contextValue) return contextValue;
    if (typeof metadataValue === 'string' && metadataValue.trim()) {
      return metadataValue.trim();
    }
    return 'unknown';
  }

  private auditRoute(
    contextRoute: string | undefined,
    request: RequestWithContext,
  ): string {
    if (contextRoute) return contextRoute;
    const route = request.route as { path?: unknown } | undefined;
    const routePath = typeof route?.path === 'string' ? route.path : undefined;
    if (routePath) return `${request.baseUrl ?? ''}${routePath}`;
    return request.path ?? request.originalUrl?.split('?')[0] ?? 'unknown';
  }

  private userAgent(request: RequestWithContext): string | null {
    const headers = request.headers as Record<
      string,
      string | string[] | undefined
    >;
    const value = headers['user-agent'];
    const normalized = Array.isArray(value) ? value[0] : value;
    return normalized ? normalized.slice(0, 500) : null;
  }

  private clientIp(request: RequestWithContext): string {
    const headers = request.headers as Record<
      string,
      string | string[] | undefined
    >;
    const forwarded = headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const candidate = forwardedValue?.split(',')[0]?.trim() || request.ip || '';
    return candidate === '::1' ? '127.0.0.1' : candidate;
  }

  private async recordInternationalTransferEvent(
    request: RequestWithContext,
    resourceType: string,
    options: AuditAppendOptions,
  ): Promise<void> {
    const metadata = options.metadata ?? {};
    const flowKey = this.metadataText(metadata, 'flowKey');
    const processorName = this.metadataText(metadata, 'processorName');
    const destinationCountry = this.metadataText(
      metadata,
      'destinationCountry',
    );
    if (!flowKey || !processorName || !destinationCountry) return;
    if (destinationCountry.toUpperCase() === 'BR') return;

    const dataCategories = this.metadataTextArray(metadata, 'dataCategories');
    try {
      await this.databaseService.query(
        `
        WITH active_transfer AS (
          SELECT id
          FROM lgpd.international_transfer
          WHERE flow_key = $1
            AND lower(processor_name) = lower($2)
            AND destination_country = $3
            AND status = 'ACTIVE'
            AND (starts_at IS NULL OR starts_at <= CURRENT_DATE)
            AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
          ORDER BY updated_at DESC
          LIMIT 1
        )
        INSERT INTO lgpd.international_transfer_event (
          tenant_id,
          international_transfer_id,
          flow_key,
          processor_name,
          destination_country,
          destination_region,
          request_path,
          resource_type,
          resource_id,
          data_categories,
          metadata
        )
        SELECT
          public.sgp_current_tenant_uuid(),
          active_transfer.id,
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::text[],
          $9::jsonb
        FROM active_transfer
        `,
        [
          flowKey,
          processorName,
          destinationCountry.toUpperCase(),
          this.metadataText(metadata, 'destinationRegion'),
          request.originalUrl ?? request.url ?? null,
          resourceType,
          options.resourceId ?? null,
          dataCategories,
          JSON.stringify({
            reason: options.reason ?? null,
            statusCode: options.statusCode ?? null,
          }),
        ],
      );
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      if (code !== '42P01' && code !== '42703') throw error;
    }
  }

  private metadataText(
    metadata: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = metadata[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private metadataTextArray(
    metadata: Record<string, unknown>,
    key: string,
  ): string[] {
    const value = metadata[key];
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }
}
