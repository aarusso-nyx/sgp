import { Injectable } from '@nestjs/common';

import type { RequestWithContext } from '../common/request-id/request-with-context';
import { AuditMutationContextStore } from '../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../database/database.service';
import { AuditActionValue } from './audit.dto';
import { redactAuditMetadata } from './audit-redaction.util';

export interface AuditAppendOptions {
  resourceId?: string;
  tableName?: string;
  metadata?: Record<string, unknown>;
  statusCode?: number;
  reason?: string;
}

@Injectable()
export class AuditWriterService {
  constructor(private readonly databaseService: DatabaseService) {}

  async auditMutation(
    request: RequestWithContext,
    action: Extract<
      AuditActionValue,
      'CREATE' | 'UPDATE' | 'DELETE' | 'PROCESS' | 'GENERATE'
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
}
