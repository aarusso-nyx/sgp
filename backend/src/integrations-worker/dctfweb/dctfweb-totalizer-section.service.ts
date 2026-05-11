import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { DctfwebSourceEvent } from './dctfweb.dto';
import { SourceItem, TotalizerRow } from './dctfweb-builder.types';
import {
  childText,
  hashToUuid,
  moneyText,
  scalarText,
  uuidText,
} from './dctfweb-builder.util';

const EVENT_MAP: Record<TotalizerRow['kind'], DctfwebSourceEvent> = {
  'S-5011': 'S5011',
  'S-5012': 'S5012',
  'S-5013': 'S5013',
  'R-9015': 'R9015',
};

@Injectable()
export class DctfwebTotalizerSectionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async loadPublishedTotalizers(
    tenantId: string,
    competence: string,
  ): Promise<TotalizerRow[]> {
    return this.databaseService.query<TotalizerRow>(
      `
      SELECT
        spool.event_class AS kind,
        COALESCE(
          spool.response->'receipt'->>'receiptNumber',
          spool.response->>'receiptNumber',
          spool.message_id::text
        ) AS source_event_recibo,
        COALESCE(spool.response->'payload', spool.response, spool.payload) AS payload
      FROM public.esocial_events spool
      WHERE spool.tenant_id = $1::uuid
        AND COALESCE(spool.source_ref->>'competence', spool.payload->>'competence') = $2
        AND spool.status = 'ACCEPTED'::public.esocial_events_status
        AND spool.event_class IN ('S-5011', 'S-5012', 'S-5013')
      UNION ALL
      SELECT
        totalizer.kind::text AS kind,
        totalizer.receipt_number AS source_event_recibo,
        totalizer.payload
      FROM fiscal.efd_reinf_totalizer totalizer
      WHERE totalizer.tenant_id = $1::uuid
        AND totalizer.competence = $2::date
        AND totalizer.kind = 'R-9015'::fiscal.efd_reinf_totalizer_kind
      ORDER BY kind, source_event_recibo
      `,
      [tenantId, competence],
    );
  }

  itemsFromTotalizer(row: TotalizerRow): SourceItem[] {
    const payload =
      typeof row.payload === 'string'
        ? (JSON.parse(row.payload) as Record<string, unknown>)
        : row.payload;
    const sourceEvent = EVENT_MAP[row.kind];
    const explicitItems = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.debits)
        ? payload.debits
        : null;
    if (explicitItems) {
      return explicitItems.map((entry, index) =>
        normalizePayloadItem(
          entry,
          sourceEvent,
          row.source_event_recibo,
          index,
        ),
      );
    }

    const rawXml = typeof payload.rawXml === 'string' ? payload.rawXml : '';
    if (!rawXml) return [];
    return extractItemsFromTotalizerXml(
      rawXml,
      sourceEvent,
      row.source_event_recibo,
    );
  }
}

function normalizePayloadItem(
  value: unknown,
  sourceEvent: DctfwebSourceEvent,
  receipt: string,
  index: number,
): SourceItem {
  const item =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const debitCode = scalarText(
    item.debitCode ?? item.codigo ?? item.code,
    sourceEvent,
  );
  const baseAmount = moneyText(
    item.baseAmount ?? item.base ?? item.base_amount ?? 0,
  );
  const amount = moneyText(item.amount ?? item.valor ?? item.value ?? 0);
  const csllAdicionalAmount = moneyText(
    item.csllAdicionalAmount ??
      item.csllAdicional ??
      item.csll_adicional_amount ??
      item.valorCsllAdicional ??
      item.vrCsllAdicional ??
      item.vrAdicionalCsll ??
      item.adicionalCsll ??
      0,
  );
  const sourceRunId = uuidText(
    item.sourceRunId ?? item.source_run_id,
    `${sourceEvent}:${receipt}:${debitCode}:${index}`,
  );
  return {
    sourceEvent,
    sourceRunId,
    debitCode,
    baseAmount,
    amount,
    csllAdicionalAmount,
  };
}

function extractItemsFromTotalizerXml(
  xml: string,
  sourceEvent: DctfwebSourceEvent,
  receipt: string,
): SourceItem[] {
  const blocks = xml.match(
    /<[^>]*(?:infoCRContrib|infoCRIRRF|infoBaseFGTS|infoFGTS)\b[^>]*>[\s\S]*?<\/[^>]*(?:infoCRContrib|infoCRIRRF|infoBaseFGTS|infoFGTS)>/g,
  ) ?? [xml];
  return blocks
    .map((node, index) => {
      const debitCode =
        childText(node, 'tpCR') ??
        childText(node, 'codReceita') ??
        childText(node, 'codCateg') ??
        childText(node, 'tpValor') ??
        `${sourceEvent}-${index + 1}`;
      const baseAmount = firstMoney(node, [
        'vrBcCP',
        'vrBcCP00',
        'vrBcFGTS',
        'vrBcFGTSProcTrab',
        'base',
      ]);
      const amount = firstMoney(node, [
        'vrCR',
        'vrDescCP',
        'vrDescSest',
        'vrFGTS',
        'vrFGTSProcTrab',
        'valor',
      ]);
      const csllAdicionalAmount = firstMoney(node, [
        'csllAdicional',
        'valorCsllAdicional',
        'vrCsllAdicional',
        'vrAdicionalCsll',
        'adicionalCsll',
      ]);
      if (amount === null && baseAmount === null) return null;
      return {
        sourceEvent,
        sourceRunId: hashToUuid(
          `${sourceEvent}:${receipt}:${debitCode}:${index}`,
        ),
        debitCode,
        baseAmount: moneyText(baseAmount ?? 0),
        amount: moneyText(amount ?? 0),
        csllAdicionalAmount: moneyText(csllAdicionalAmount ?? 0),
      };
    })
    .filter((item): item is SourceItem => Boolean(item));
}

function firstMoney(node: string, names: string[]): string | null {
  for (const name of names) {
    const value = childText(node, name);
    if (value !== null) return value;
  }
  return null;
}
