import type { QueryResultRow } from 'pg';

import { buildESocialEventXml } from '../builders/esocial-event.builder';
import {
  IntegrationDispatchContext,
  IntegrationJobDispatcher,
  IntegrationProcessResult,
  PendingIntegrationJobRow,
} from './integration-job-dispatcher';

interface ESocialEventExecutionRow extends QueryResultRow {
  id: string;
  event_type: string;
  reference: string;
  competence: string;
  payload: Record<string, unknown> | null;
  schema_version: string;
  retry_count: number;
}

export class ESocialEventIntegrationDispatcher implements IntegrationJobDispatcher {
  readonly definitions = ['ESOCIAL_EVENTO_PROCESSAR'] as const;

  async process(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const eventId = context.requireString(job.parameters, 'eventId');
    await context.databaseService.query(
      `
      UPDATE public.esocial_event
      SET status = 'GERANDO_XML'::"ESocialEventStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [eventId],
    );

    const rows = await context.databaseService.query<ESocialEventExecutionRow>(
      `
      SELECT
        id::text,
        event_type,
        reference,
        competence,
        payload,
        schema_version,
        retry_count
      FROM public.esocial_event
      WHERE id = $1::uuid
      `,
      [eventId],
    );
    const event = rows[0];
    if (!event) {
      throw new Error('eSocial event not found');
    }

    const artifact = buildESocialEventXml({
      eventId: event.id,
      eventType: event.event_type,
      competence: event.competence,
      reference: event.reference,
      payload: event.payload ?? {},
      schemaVersion: event.schema_version,
    });
    const receiptNumber = `REC-${event.event_type}-${event.id.slice(0, 8)}`;
    const protocolNumber = `PROTO-${event.id.slice(0, 12)}`;

    await context.databaseService.query(
      `
      UPDATE public.esocial_event
      SET
        xml_payload = $2,
        status = 'AGUARDANDO_RETORNO'::"ESocialEventStatus",
        receipt_number = $3,
        protocol_number = $4,
        generated_at = now(),
        processed_at = now(),
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [eventId, artifact.content.toString(), receiptNumber, protocolNumber],
    );

    return context.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'esocial',
        event.event_type.toLowerCase(),
        artifact.fileName,
      ].join('/'),
      {
        operation: 'esocial.evento.processado',
        eventId: event.id,
        eventType: event.event_type,
        competence: event.competence,
        status: 'AGUARDANDO_RETORNO',
        receiptNumber,
        protocolNumber,
        retryCount: event.retry_count,
      },
    );
  }
}
