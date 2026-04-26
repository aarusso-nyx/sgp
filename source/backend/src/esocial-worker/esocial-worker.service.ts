import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import { DocumentsStorageService } from '../documents/documents-storage.service';
import { buildESocialEventXml } from '../integrations-worker/builders/esocial-event.builder';
import { ESocialDispatchAdapter } from './esocial-dispatch.adapter';

interface PendingESocialEventRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  event_type: string;
  reference: string;
  competence: string;
  payload: Record<string, unknown> | null;
  schema_version: string;
  retry_count: number;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface StatusCountRow extends QueryResultRow {
  status: string;
  total: string;
}

export interface ESocialWorkerRunSummary {
  discovered: number;
  processed: number;
  failed: number;
  skipped: number;
}

const ESOCIAL_EVENT_TYPE_PATTERN = /^S-\d{4}$/;
const COMPETENCE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ESOCIAL_WORKER_PERMISSIONS = [
  'folha:read',
  'folha:write',
  'relatorio:generate',
  'documents:register',
] as const;

@Injectable()
export class ESocialWorkerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly documentsStorageService: DocumentsStorageService,
    private readonly dispatchAdapter: ESocialDispatchAdapter,
  ) {}

  health() {
    return {
      ok: true,
      service: 'sgp-esocial-worker',
      status: 'implemented',
      databaseConfigured: this.databaseService.configured,
      schemaVersion: 'S-1.2',
      dispatchAdapter: 'sandbox',
      timestamp: new Date().toISOString(),
    };
  }

  async status() {
    const base = this.health();
    if (!this.databaseService.configured) {
      return {
        ...base,
        checks: {
          database: 'not_configured',
          eventsByStatus: {},
        },
      };
    }

    const rows = await this.runBypassingRls(() =>
      this.databaseService.query<StatusCountRow>(
        `
        SELECT status::text, count(*)::text AS total
        FROM public.esocial_event
        GROUP BY status
        ORDER BY status
        `,
      ),
    );

    return {
      ...base,
      checks: {
        database: 'configured',
        eventsByStatus: Object.fromEntries(
          rows.map((row) => [row.status, Number(row.total)]),
        ),
      },
    };
  }

  async pollOnce(limit = 10): Promise<ESocialWorkerRunSummary> {
    this.ensureDatabase();
    const boundedLimit = this.normalizeLimit(limit);
    const events = await this.loadPendingEvents(boundedLimit);
    const summary: ESocialWorkerRunSummary = {
      discovered: events.length,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const event of events) {
      const claimed = await this.runWithinTenant(event.tenant_id, () =>
        this.claim(event),
      );
      if (!claimed) {
        summary.skipped += 1;
        continue;
      }

      try {
        await this.runWithinTenant(event.tenant_id, () =>
          this.processEvent(event),
        );
        summary.processed += 1;
      } catch (error) {
        await this.runWithinTenant(event.tenant_id, () =>
          this.markFailed(event, error),
        );
        summary.failed += 1;
      }
    }

    return summary;
  }

  private async loadPendingEvents(
    limit: number,
  ): Promise<PendingESocialEventRow[]> {
    return this.runBypassingRls(() =>
      this.databaseService.query<PendingESocialEventRow>(
        `
        SELECT
          id::text,
          tenant_id::text,
          event_type,
          reference,
          competence,
          payload,
          schema_version,
          retry_count
        FROM public.esocial_event
        WHERE status IN (
          'PENDENTE'::"ESocialEventStatus",
          'ERRO_TECNICO_RETENTAVEL'::"ESocialEventStatus"
        )
        ORDER BY created_at ASC
        LIMIT $1
        `,
        [limit],
      ),
    );
  }

  private async claim(event: PendingESocialEventRow): Promise<boolean> {
    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE public.esocial_event
      SET status = 'GERANDO_XML'::"ESocialEventStatus",
          last_error_code = NULL,
          last_error_message = NULL,
          updated_at = now()
      WHERE id = $1::uuid
        AND status IN (
          'PENDENTE'::"ESocialEventStatus",
          'ERRO_TECNICO_RETENTAVEL'::"ESocialEventStatus"
        )
      RETURNING id::text
      `,
      [event.id],
    );
    return Boolean(rows[0]);
  }

  private async processEvent(event: PendingESocialEventRow): Promise<void> {
    this.validateEvent(event);
    const artifact = buildESocialEventXml({
      eventId: event.id,
      eventType: event.event_type,
      competence: event.competence,
      reference: event.reference,
      payload: event.payload ?? {},
      schemaVersion: event.schema_version,
    });
    const [year, month] = event.competence.split('-');
    const storageKey = [
      event.tenant_id,
      'outputs',
      'esocial',
      event.event_type.toLowerCase(),
      year,
      month,
      artifact.fileName,
    ].join('/');
    const stored = await this.documentsStorageService.storeGeneratedObject({
      storageKey,
      contentType: artifact.contentType,
      body: artifact.content,
    });
    const dispatch = this.dispatchAdapter.dispatch({
      eventId: event.id,
      eventType: event.event_type,
      schemaVersion: event.schema_version,
      xml: artifact.content.toString(),
    });

    await this.databaseService.query(
      `
      UPDATE public.esocial_event
      SET
        xml_payload = $2,
        status = 'PROCESSADO_COM_SUCESSO'::"ESocialEventStatus",
        receipt_number = $3,
        protocol_number = $4,
        generated_at = now(),
        processed_at = now(),
        last_error_code = NULL,
        last_error_message = NULL,
        payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
          'worker',
          jsonb_build_object(
            'runtime', 'sgp-esocial-worker',
            'dispatchMode', $5::text,
            'storageKind', $6::text,
            'storageKey', $7::text,
            'checksum', $8::text,
            'sizeBytes', $9::int,
            'response', $10::jsonb,
            'processedAt', to_jsonb(now())
          )
        ),
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [
        event.id,
        artifact.content.toString(),
        dispatch.receiptNumber,
        dispatch.protocolNumber,
        dispatch.mode,
        stored.storageKind,
        stored.storageKey,
        stored.checksum,
        stored.sizeBytes,
        JSON.stringify(dispatch.responsePayload),
      ],
    );
  }

  private async markFailed(
    event: PendingESocialEventRow,
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected eSocial worker failure';
    const retryCount = event.retry_count + 1;
    const status =
      retryCount >= 3 ? 'ERRO_DEFINITIVO' : 'ERRO_TECNICO_RETENTAVEL';

    await this.databaseService.query(
      `
      UPDATE public.esocial_event
      SET status = $2::"ESocialEventStatus",
          retry_count = retry_count + 1,
          last_error_code = 'WORKER_FAILURE',
          last_error_message = $3,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [event.id, status, message.slice(0, 1000)],
    );
  }

  private validateEvent(event: PendingESocialEventRow): void {
    if (!ESOCIAL_EVENT_TYPE_PATTERN.test(event.event_type)) {
      throw new BadRequestException(
        'eSocial event_type must follow S-9999 format',
      );
    }
    if (!event.reference.trim()) {
      throw new BadRequestException('eSocial reference is required');
    }
    if (!COMPETENCE_PATTERN.test(event.competence)) {
      throw new BadRequestException(
        'eSocial competence must use YYYY-MM format',
      );
    }
    if (event.schema_version !== 'S-1.2') {
      throw new BadRequestException('Only eSocial schema S-1.2 is supported');
    }
    if (
      event.payload !== null &&
      (typeof event.payload !== 'object' || Array.isArray(event.payload))
    ) {
      throw new BadRequestException('eSocial payload must be an object');
    }
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1) return 10;
    return Math.min(limit, 100);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for eSocial worker operations',
      );
    }
  }

  private runBypassingRls<T>(fn: () => Promise<T>): Promise<T> {
    return RequestContextStore.run({ bypassRls: true }, fn);
  }

  private runWithinTenant<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return RequestContextStore.run(
      {
        tenantId,
        permissions: [...ESOCIAL_WORKER_PERMISSIONS],
      },
      fn,
    );
  }
}
