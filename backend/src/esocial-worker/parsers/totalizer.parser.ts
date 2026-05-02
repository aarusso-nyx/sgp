import { BadRequestException, Injectable } from '@nestjs/common';
import * as libxml from 'libxmljs2';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { dateCompetence, monthCompetence } from '../builders/s1299.builder';

export type ESocialTotalizerKind =
  | 'S-5001'
  | 'S-5002'
  | 'S-5003'
  | 'S-5011'
  | 'S-5012'
  | 'S-5013';

export interface ESocialTotalizerRecord {
  tenantId: string;
  competence: string;
  kind: ESocialTotalizerKind;
  sourceEventRecibo: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

interface TotalizerRow extends QueryResultRow {
  tenant_id: string;
  competence: Date | string;
  kind: ESocialTotalizerKind;
  source_event_recibo: string;
  payload: Record<string, unknown> | string;
  received_at: Date | string;
}

const KIND_BY_EVENT_ELEMENT: Record<string, ESocialTotalizerKind> = {
  evtBasesTrab: 'S-5001',
  evtIrrfBenef: 'S-5002',
  evtBasesFGTS: 'S-5003',
  evtCS: 'S-5011',
  evtIrrf: 'S-5012',
  evtFGTS: 'S-5013',
};

@Injectable()
export class TotalizerParser {
  constructor(private readonly databaseService: DatabaseService) {}

  async ingest(
    tenantId: string,
    xml: string,
    receivedAt = new Date(),
  ): Promise<ESocialTotalizerRecord> {
    const parsed = parseTotalizerXml(xml);
    const rows = await this.databaseService.transaction(async (client) => {
      const result = await client.query<TotalizerRow>(
        `
        INSERT INTO esocial.esocial_totalizer (
          tenant_id,
          competence,
          kind,
          source_event_recibo,
          payload,
          received_at
        )
        VALUES ($1::uuid, $2::date, $3::esocial.esocial_totalizer_kind, $4, $5::jsonb, $6::timestamptz)
        ON CONFLICT (tenant_id, competence, kind, source_event_recibo)
        DO UPDATE
        SET payload = EXCLUDED.payload,
            received_at = EXCLUDED.received_at,
            updated_at = now()
        RETURNING
          tenant_id::text,
          competence,
          kind::text,
          source_event_recibo,
          payload,
          received_at
        `,
        [
          tenantId,
          dateCompetence(parsed.competence),
          parsed.kind,
          parsed.sourceEventRecibo,
          JSON.stringify(parsed.payload),
          receivedAt.toISOString(),
        ],
      );

      await client.query(
        `
        UPDATE esocial.s1299_emission_state
        SET status = 'ACCEPTED'::esocial.s1299_emission_status,
            accepted_at = COALESCE(accepted_at, $4::timestamptz),
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND competence = $2::date
          AND recibo = $3
        `,
        [
          tenantId,
          dateCompetence(parsed.competence),
          parsed.sourceEventRecibo,
          receivedAt.toISOString(),
        ],
      );

      return result.rows;
    });
    return mapRow(rows[0]);
  }
}

export function parseTotalizerXml(
  xml: string,
): Omit<ESocialTotalizerRecord, 'tenantId' | 'receivedAt'> {
  let document: libxml.Document;
  try {
    document = libxml.parseXml(xml);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(`Invalid eSocial totalizer XML: ${message}`);
  }

  const eventElement = Object.keys(KIND_BY_EVENT_ELEMENT).find((name) =>
    hasElement(document, name),
  );
  if (!eventElement) {
    throw new BadRequestException(
      'Unsupported eSocial totalizer kind; expected S-5001..S-5013',
    );
  }

  const kind = KIND_BY_EVENT_ELEMENT[eventElement];
  const competence = monthCompetence(firstText(document, 'perApur'));
  const sourceEventRecibo =
    firstOptionalText(document, 'nrRecArqBase') ??
    firstOptionalText(document, 'nrRecEvt') ??
    firstOptionalText(document, 'nrRecibo');
  if (!sourceEventRecibo) {
    throw new BadRequestException(
      'eSocial totalizer return is missing source event receipt',
    );
  }

  return {
    competence,
    kind,
    sourceEventRecibo,
    payload: {
      kind,
      eventElement,
      eventId: firstAttribute(document, eventElement, 'Id'),
      sourceEventRecibo,
      competence,
      rawXml: xml,
    },
  };
}

function hasElement(document: libxml.Document, name: string): boolean {
  return Boolean(document.get(`//*[local-name() = '${name}']`));
}

function firstText(document: libxml.Document, name: string): string {
  const value = firstOptionalText(document, name);
  if (!value) {
    throw new BadRequestException(
      `eSocial totalizer return is missing ${name}`,
    );
  }
  return value;
}

function firstOptionalText(
  document: libxml.Document,
  name: string,
): string | null {
  const node = document.get(`//*[local-name() = '${name}']`) as
    | { text(): string }
    | undefined;
  const value = node?.text().trim();
  return value || null;
}

function firstAttribute(
  document: libxml.Document,
  elementName: string,
  attributeName: string,
): string | null {
  const node = document.get(`//*[local-name() = '${elementName}']`) as
    | { attr(name: string): { value(): string } | undefined }
    | undefined;
  const value = node?.attr(attributeName)?.value();
  return value || null;
}

function mapRow(row: TotalizerRow): ESocialTotalizerRecord {
  const competence =
    row.competence instanceof Date
      ? row.competence.toISOString().slice(0, 7)
      : String(row.competence).slice(0, 7);
  return {
    tenantId: row.tenant_id,
    competence,
    kind: row.kind,
    sourceEventRecibo: row.source_event_recibo,
    payload:
      typeof row.payload === 'string'
        ? (JSON.parse(row.payload) as Record<string, unknown>)
        : row.payload,
    receivedAt: new Date(row.received_at).toISOString(),
  };
}
