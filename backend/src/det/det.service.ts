import { Injectable, NotFoundException } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import type { DetMessageStatus } from '../integrations/stynx-det/contracts';
import type {
  DetInboxProjectionDto,
  DetMessageListQueryDto,
  RequestDetAcknowledgementDto,
  UpdateDetMessageDto,
} from './det.dto';

type DetMessageRow = QueryResultRow & {
  id: string;
  tenant_id: string;
  external_message_id: string;
  subject: string;
  sender: string | null;
  received_at: Date | string;
  due_at: Date | string | null;
  read_at: Date | string | null;
  acknowledged_at: Date | string | null;
  status: DetMessageStatus;
  source_payload: unknown;
  latest_update_payload: unknown;
  annotation: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type DetMessageRecord = Readonly<{
  id: string;
  tenantId: string;
  externalMessageId: string;
  subject: string;
  sender: string | null;
  receivedAt: string;
  dueAt: string | null;
  readAt: string | null;
  acknowledgedAt: string | null;
  status: DetMessageStatus;
  sourcePayload: unknown;
  latestUpdatePayload: unknown;
  annotation: string | null;
  createdAt: string;
  updatedAt: string;
}>;

const DET_MESSAGE_SELECT = `
  id,
  tenant_id,
  external_message_id,
  subject,
  sender,
  received_at,
  due_at,
  read_at,
  acknowledged_at,
  status,
  source_payload,
  latest_update_payload,
  annotation,
  created_at,
  updated_at
`;

@Injectable()
export class DetProjectionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: DetMessageListQueryDto = {},
  ): Promise<{ items: DetMessageRecord[] }> {
    const filters: string[] = [];
    const values: unknown[] = [];
    if (query.status) {
      values.push(query.status);
      filters.push(`status = $${values.length}::fiscal.det_message_status`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await this.databaseService.query<DetMessageRow>(
      `
      SELECT ${DET_MESSAGE_SELECT}
      FROM fiscal.det_message_projection
      ${where}
      ORDER BY received_at DESC, created_at DESC
      LIMIT 200
      `,
      values,
    );

    return { items: rows.map(mapDetMessageRow) };
  }

  async applyInboxUpdate(
    payload: DetInboxProjectionDto,
  ): Promise<DetMessageRecord> {
    const rows = await this.databaseService.query<DetMessageRow>(
      `
      INSERT INTO fiscal.det_message_projection (
        external_message_id,
        subject,
        sender,
        received_at,
        due_at,
        read_at,
        acknowledged_at,
        status,
        source_payload,
        latest_update_payload
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::timestamptz,
        $5::timestamptz,
        $6::timestamptz,
        $7::timestamptz,
        $8::fiscal.det_message_status,
        $9::jsonb,
        $9::jsonb
      )
      ON CONFLICT (tenant_id, external_message_id)
      DO UPDATE SET
        subject = EXCLUDED.subject,
        sender = EXCLUDED.sender,
        due_at = EXCLUDED.due_at,
        read_at = COALESCE(EXCLUDED.read_at, det_message_projection.read_at),
        acknowledged_at = COALESCE(
          EXCLUDED.acknowledged_at,
          det_message_projection.acknowledged_at
        ),
        status = EXCLUDED.status,
        latest_update_payload = EXCLUDED.latest_update_payload,
        updated_at = now()
      RETURNING ${DET_MESSAGE_SELECT}
      `,
      [
        payload.externalMessageId,
        payload.subject,
        payload.sender ?? null,
        payload.receivedAt,
        payload.dueAt ?? null,
        payload.readAt ?? null,
        payload.acknowledgedAt ?? null,
        payload.status,
        JSON.stringify(payload.payload ?? {}),
      ],
    );

    return mapDetMessageRow(requiredRow(rows[0], payload.externalMessageId));
  }

  async updateOperatorState(
    id: string,
    payload: UpdateDetMessageDto,
  ): Promise<DetMessageRecord> {
    const assignments: string[] = [];
    const values: unknown[] = [];
    if (payload.status !== undefined) {
      values.push(payload.status);
      assignments.push(`status = $${values.length}::fiscal.det_message_status`);
      if (payload.status === 'READ') {
        assignments.push('read_at = COALESCE(read_at, now())');
      }
    }
    if (payload.annotation !== undefined) {
      values.push(payload.annotation);
      assignments.push(`annotation = $${values.length}`);
    }
    if (!assignments.length) {
      return this.getById(id);
    }

    values.push(id);
    const rows = await this.databaseService.query<DetMessageRow>(
      `
      UPDATE fiscal.det_message_projection
      SET ${assignments.join(', ')}, updated_at = now()
      WHERE id = $${values.length}::uuid
      RETURNING ${DET_MESSAGE_SELECT}
      `,
      values,
    );

    return mapDetMessageRow(requiredRow(rows[0], id));
  }

  async requestAcknowledgement(
    id: string,
    payload: RequestDetAcknowledgementDto = {},
  ): Promise<DetMessageRecord> {
    const context = RequestContextStore.get();
    const requestedBy =
      context?.actor?.username ?? context?.actor?.sub ?? 'sgp-operator';
    const rows = await this.databaseService.query<DetMessageRow>(
      `
      UPDATE fiscal.det_message_projection
      SET
        status = 'ACK_REQUESTED'::fiscal.det_message_status,
        latest_update_payload = jsonb_build_object(
          'source', 'sgp',
          'action', 'acknowledgement.requested',
          'requestedBy', $2,
          'requestedAt', now(),
          'note', $3::text
        ),
        annotation = COALESCE($3, annotation),
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING ${DET_MESSAGE_SELECT}
      `,
      [id, requestedBy, payload.note ?? null],
    );

    return mapDetMessageRow(requiredRow(rows[0], id));
  }

  private async getById(id: string): Promise<DetMessageRecord> {
    const rows = await this.databaseService.query<DetMessageRow>(
      `
      SELECT ${DET_MESSAGE_SELECT}
      FROM fiscal.det_message_projection
      WHERE id = $1::uuid
      `,
      [id],
    );

    return mapDetMessageRow(requiredRow(rows[0], id));
  }
}

function mapDetMessageRow(row: DetMessageRow): DetMessageRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    externalMessageId: row.external_message_id,
    subject: row.subject,
    sender: row.sender,
    receivedAt: toIso(row.received_at),
    dueAt: row.due_at ? toIso(row.due_at) : null,
    readAt: row.read_at ? toIso(row.read_at) : null,
    acknowledgedAt: row.acknowledged_at ? toIso(row.acknowledged_at) : null,
    status: row.status,
    sourcePayload: row.source_payload,
    latestUpdatePayload: row.latest_update_payload,
    annotation: row.annotation,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function requiredRow<T>(row: T | undefined, id: string): T {
  if (!row) throw new NotFoundException(`DET message not found: ${id}`);
  return row;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
