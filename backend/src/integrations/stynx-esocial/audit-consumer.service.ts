import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import type { AuditEventEnvelope } from './contracts';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { AUDIT_ACTIONS, type AuditActionValue } from '../../audit/audit.dto';

type AuditConsumerResult = Readonly<{
  inserted: boolean;
  idempotencyKey: string;
}>;

type ExistingAuditRow = QueryResultRow & {
  id: string;
};

@Injectable()
export class StynxEsocialAuditConsumer {
  constructor(private readonly databaseService: DatabaseService) {}

  async handle(envelope: AuditEventEnvelope): Promise<AuditConsumerResult> {
    const action = normalizeAuditAction(envelope.action);
    const correlationId = envelope.correlation_id ?? null;
    const idempotencyKey = `audit:${correlationId ?? 'none'}:${action}`;

    return RequestContextStore.run(
      {
        tenantId: envelope.tenant_id,
        bypassRls: true,
        bypassRlsReason: 'stynx-esocial-audit',
      },
      async () => {
        if (correlationId) {
          const [existing] = await this.databaseService.query<ExistingAuditRow>(
            `
            SELECT id
            FROM public.audit_event
            WHERE correlation_id = $1
              AND action = $2::public."AuditAction"
            LIMIT 1
            `,
            [correlationId, action],
          );
          if (existing) return { inserted: false, idempotencyKey };
        }

        await this.databaseService.query(
          `
          INSERT INTO public.audit_event (
            tenant_id,
            occurred_at,
            actor_sub,
            action,
            resource_type,
            resource_id,
            table_name,
            request_id,
            correlation_id,
            metadata,
            reason
          )
          VALUES (
            $1::uuid,
            $2::timestamptz,
            $3,
            $4::public."AuditAction",
            $5,
            $6,
            $7,
            $8,
            $8,
            $9::jsonb,
            $10
          )
          `,
          [
            envelope.tenant_id,
            envelope.occurred_at,
            envelope.actor_id ?? null,
            action,
            envelope.target.type,
            envelope.target.id ?? null,
            `stynx_esocial.${envelope.target.type}`,
            correlationId,
            JSON.stringify({
              source: 'stynx-esocial',
              before: envelope.before ?? null,
              after: envelope.after ?? null,
              idempotencyKey,
            }),
            'stynx-esocial-audit',
          ],
        );

        return { inserted: true, idempotencyKey };
      },
    );
  }
}

function normalizeAuditAction(action: string): AuditActionValue {
  return (AUDIT_ACTIONS as readonly string[]).includes(action)
    ? (action as AuditActionValue)
    : 'PROCESS';
}
