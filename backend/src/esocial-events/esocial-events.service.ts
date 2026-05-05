import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import type {
  RecordErrorInput,
  RecordPendingInput,
  RecordResponseInput,
  RecordSentInput,
} from './esocial-events.dto';
import type {
  EsocialEventsListFilters,
  EsocialEventsRecord,
  EsocialEventsRow,
} from './esocial-events.types';

const ESOCIAL_EVENTS_PERMISSIONS = [
  'esocial.event.read',
  'esocial.event.write',
] as const;

const ESOCIAL_EVENTS_RETURNING = `
  message_id,
  tenant_id,
  kind,
  event_class,
  source_ref,
  payload,
  payload_hash,
  response,
  response_hash,
  status,
  attempt,
  max_attempts,
  error,
  tstamp_created,
  tstamp_sent,
  tstamp_recv,
  tstamp_terminal,
  actor_sub,
  actor_login,
  request_id
`;

@Injectable()
export class EsocialEventsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async recordPending(input: RecordPendingInput): Promise<EsocialEventsRecord> {
    const payloadHash = input.payloadHash ?? sha256Json(input.payload);
    return this.runForTenant(input.tenantId, async () => {
      const [existing] = await this.databaseService.query<EsocialEventsRow>(
        `
        SELECT ${ESOCIAL_EVENTS_RETURNING}
        FROM public.esocial_events
        WHERE tenant_id = $1::uuid
          AND kind = $2
          AND event_class = $3
          AND payload_hash = $4
          AND status NOT IN ('REJECTED'::public.esocial_events_status, 'DLQ'::public.esocial_events_status)
        ORDER BY tstamp_created DESC
        LIMIT 1
        `,
        [input.tenantId, input.kind, input.eventClass, payloadHash],
      );
      if (existing) return mapRow(existing);

      const [created] = await this.databaseService.query<EsocialEventsRow>(
        `
        INSERT INTO public.esocial_events (
          message_id,
          tenant_id,
          kind,
          event_class,
          source_ref,
          payload,
          payload_hash,
          max_attempts,
          actor_sub,
          actor_login,
          request_id
        )
        VALUES (
          COALESCE($1::uuid, gen_random_uuid()),
          $2::uuid,
          $3,
          $4,
          $5::jsonb,
          $6::jsonb,
          $7,
          COALESCE($8::integer, 3),
          $9,
          $10,
          $11
        )
        RETURNING ${ESOCIAL_EVENTS_RETURNING}
        `,
        [
          input.messageId ?? null,
          input.tenantId,
          input.kind,
          input.eventClass,
          JSON.stringify(input.sourceRef ?? {}),
          JSON.stringify(input.payload),
          payloadHash,
          input.maxAttempts ?? null,
          input.actorSub ?? null,
          input.actorLogin ?? null,
          input.requestId ?? null,
        ],
      );

      return mapRow(requiredRow(created, input.messageId ?? payloadHash));
    });
  }

  async recordSent(input: RecordSentInput): Promise<EsocialEventsRecord> {
    return this.runForTenant(input.tenantId, async () => {
      const [updated] = await this.databaseService.query<EsocialEventsRow>(
        `
        UPDATE public.esocial_events
        SET
          status = 'SENT'::public.esocial_events_status,
          attempt = GREATEST(attempt + 1, COALESCE($3::integer, attempt + 1)),
          tstamp_sent = COALESCE(tstamp_sent, now())
        WHERE tenant_id = $1::uuid
          AND message_id = $2::uuid
        RETURNING ${ESOCIAL_EVENTS_RETURNING}
        `,
        [input.tenantId, input.messageId, input.attempt ?? null],
      );

      return mapRow(requiredRow(updated, input.messageId));
    });
  }

  async recordResponse(
    input: RecordResponseInput,
  ): Promise<EsocialEventsRecord> {
    const status = input.status ?? 'ACCEPTED';
    const responseHash = input.responseHash ?? sha256Json(input.response);
    return this.runForTenant(input.tenantId, async () => {
      const [updated] = await this.databaseService.query<EsocialEventsRow>(
        `
        UPDATE public.esocial_events
        SET
          status = $3::public.esocial_events_status,
          response = $4::jsonb,
          response_hash = $5,
          tstamp_recv = COALESCE(tstamp_recv, now()),
          tstamp_terminal = CASE
            WHEN $3::public.esocial_events_status IN ('ACCEPTED', 'REJECTED') THEN COALESCE(tstamp_terminal, now())
            ELSE tstamp_terminal
          END
        WHERE tenant_id = $1::uuid
          AND message_id = $2::uuid
        RETURNING ${ESOCIAL_EVENTS_RETURNING}
        `,
        [
          input.tenantId,
          input.messageId,
          status,
          JSON.stringify(input.response),
          responseHash,
        ],
      );

      return mapRow(requiredRow(updated, input.messageId));
    });
  }

  async recordError(input: RecordErrorInput): Promise<EsocialEventsRecord> {
    const responseHash = input.response
      ? (input.responseHash ?? sha256Json(input.response))
      : (input.responseHash ?? null);
    return this.runForTenant(input.tenantId, async () => {
      const [updated] = await this.databaseService.query<EsocialEventsRow>(
        `
        UPDATE public.esocial_events
        SET
          status = $3::public.esocial_events_status,
          error = $4::jsonb,
          response = COALESCE($5::jsonb, response),
          response_hash = COALESCE($6, response_hash),
          tstamp_recv = CASE
            WHEN $5::jsonb IS NULL THEN tstamp_recv
            ELSE COALESCE(tstamp_recv, now())
          END,
          tstamp_terminal = CASE
            WHEN $3::public.esocial_events_status IN ('REJECTED', 'DLQ') THEN COALESCE(tstamp_terminal, now())
            ELSE tstamp_terminal
          END
        WHERE tenant_id = $1::uuid
          AND message_id = $2::uuid
        RETURNING ${ESOCIAL_EVENTS_RETURNING}
        `,
        [
          input.tenantId,
          input.messageId,
          input.status,
          JSON.stringify(input.error),
          input.response === undefined ? null : JSON.stringify(input.response),
          responseHash,
        ],
      );

      return mapRow(requiredRow(updated, input.messageId));
    });
  }

  async findById(
    tenantId: string,
    messageId: string,
  ): Promise<EsocialEventsRecord | null> {
    return this.runForTenant(tenantId, async () => {
      const [row] = await this.databaseService.query<EsocialEventsRow>(
        `
        SELECT ${ESOCIAL_EVENTS_RETURNING}
        FROM public.esocial_events
        WHERE tenant_id = $1::uuid
          AND message_id = $2::uuid
        `,
        [tenantId, messageId],
      );

      return row ? mapRow(row) : null;
    });
  }

  async findByTenant(
    tenantId: string,
    filters: EsocialEventsListFilters = {},
  ): Promise<EsocialEventsRecord[]> {
    return this.runForTenant(tenantId, async () => {
      const rows = await this.databaseService.query<EsocialEventsRow>(
        `
        SELECT ${ESOCIAL_EVENTS_RETURNING}
        FROM public.esocial_events
        WHERE tenant_id = $1::uuid
          AND ($2::public.esocial_events_status IS NULL OR status = $2::public.esocial_events_status)
          AND ($3::text IS NULL OR kind = $3)
        ORDER BY tstamp_created DESC
        LIMIT $4::integer
        `,
        [
          tenantId,
          filters.status ?? null,
          filters.kind ?? null,
          filters.limit ?? 100,
        ],
      );

      return rows.map(mapRow);
    });
  }

  private runForTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const current = RequestContextStore.get();
    return RequestContextStore.run(
      {
        ...current,
        tenantId,
        permissions: [
          ...new Set([
            ...(current?.permissions ?? []),
            ...(current?.actor?.permissions ?? []),
            ...ESOCIAL_EVENTS_PERMISSIONS,
          ]),
        ],
      },
      fn,
    );
  }
}

function requiredRow(
  row: EsocialEventsRow | undefined,
  id: string,
): EsocialEventsRow {
  if (!row) {
    throw new Error(`eSocial spool row not found: ${id}`);
  }
  return row;
}

function mapRow(row: EsocialEventsRow): EsocialEventsRecord {
  return {
    messageId: row.message_id,
    tenantId: row.tenant_id,
    kind: row.kind,
    eventClass: row.event_class,
    sourceRef: row.source_ref,
    payload: row.payload,
    payloadHash: row.payload_hash,
    response: row.response,
    responseHash: row.response_hash,
    status: row.status,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    error: row.error,
    createdAt: toIso(row.tstamp_created),
    sentAt: toNullableIso(row.tstamp_sent),
    receivedAt: toNullableIso(row.tstamp_recv),
    terminalAt: toNullableIso(row.tstamp_terminal),
    actorSub: row.actor_sub,
    actorLogin: row.actor_login,
    requestId: row.request_id,
  };
}

function sha256Json(value: unknown): string {
  return createHash('sha256')
    .update(stableStringify(value), 'utf8')
    .digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(',')}}`;
}

function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toNullableIso(value: Date | string | null): string | null {
  return value ? toIso(value) : null;
}
