import { createHash } from 'node:crypto';

import { UnprocessableEntityException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import {
  EfdReinfBeneficiaryKind,
  EfdReinfEventDto,
  EfdReinfEventKind,
  EfdReinfEventType,
  EfdReinfItemDto,
  EfdReinfSourceItemDto,
} from './efd-reinf.dto';

export interface SourcePaymentRow extends QueryResultRow {
  id: string;
  beneficiary_kind: EfdReinfBeneficiaryKind;
  beneficiary_document: string;
  beneficiary_name: string;
  revenue_code: string;
  amount: string;
  irrf: string;
}

export interface AcceptedItemRow extends QueryResultRow {
  source_run_id: string;
  beneficiary_kind: EfdReinfBeneficiaryKind;
  beneficiary_document: string;
  beneficiary_name: string;
  revenue_code: string;
  gross_amount: string;
  retained_amount: string;
}

export interface EventRow extends QueryResultRow {
  id: string;
  competence: Date | string;
  event_type: EfdReinfEventType;
  kind: EfdReinfEventKind;
  status: EfdReinfEventDto['status'];
  original_event_id: string | null;
  payload_xml_ref: string;
  payload_xml: string;
  payload_xml_hash: string;
  signed_xml_ref: string | null;
  signed_xml: string | null;
  signed_xml_hash: string | null;
  transmitted_xml_hash: string | null;
  receipt_number: string | null;
  receipt_at: Date | string | null;
  item_count: number | string;
  total_gross_amount: string;
  total_retained_amount: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ItemRow extends QueryResultRow {
  id: string;
  source_run_id: string;
  beneficiary_kind: EfdReinfBeneficiaryKind;
  beneficiary_document: string;
  beneficiary_name: string;
  revenue_code: string;
  gross_amount: string;
  retained_amount: string;
}

export interface SourceItem {
  sourceRunId: string;
  beneficiaryKind: EfdReinfBeneficiaryKind;
  beneficiaryDocument: string;
  beneficiaryName: string;
  revenueCode: string;
  grossAmount: string;
  retainedAmount: string;
}

const EVENT_ELEMENT: Record<EfdReinfEventType, string> = {
  R4010: 'evtRetPF',
  R4020: 'evtRetPJ',
  R4040: 'evtBenefNId',
  R4080: 'evtRetRec',
  R4099: 'evtFech',
};

export function buildEfdReinfXml(input: {
  tenantId: string;
  competence: string;
  eventType: EfdReinfEventType;
  kind: EfdReinfEventKind;
  originalEventId: string | null;
  items: SourceItem[];
}): string {
  const element = EVENT_ELEMENT[input.eventType];
  const id = `ID${input.eventType}${sha256(
    `${input.tenantId}:${input.competence}:${input.eventType}:${input.kind}:${input.originalEventId ?? ''}`,
  ).slice(0, 32)}`;
  const retificationXml = input.originalEventId
    ? `\n      <nrRecibo>${input.originalEventId}</nrRecibo>`
    : '';
  const itemsXml = sortSourceItems(input.items)
    .map(
      (item) => `      <pagamento sourceRunId="${item.sourceRunId}">
        <beneficiario tipo="${item.beneficiaryKind}">
          <cpfCnpj>${xmlEscape(item.beneficiaryDocument)}</cpfCnpj>
          <nome>${xmlEscape(item.beneficiaryName)}</nome>
        </beneficiario>
        <codReceita>${xmlEscape(item.revenueCode)}</codReceita>
        <vlrBruto>${item.grossAmount}</vlrBruto>
        <vlrRetencao>${item.retainedAmount}</vlrRetencao>
      </pagamento>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="urn:br:gov:rfb:reinf:sgp:r4000">
  <${element} Id="${id}">
    <ideEvento>
      <perApur>${input.competence.slice(0, 7)}</perApur>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <indRetif>${input.kind === 'ORIGINAL' ? '1' : '2'}</indRetif>${retificationXml}
    </ideEvento>
    <ideContri>
      <nrInsc>${input.tenantId}</nrInsc>
    </ideContri>
    <infoR4000>
${itemsXml}
    </infoR4000>
  </${element}>
</Reinf>`;
}

export function sourcePaymentToItem(row: SourcePaymentRow): SourceItem {
  return {
    sourceRunId: row.id,
    beneficiaryKind: row.beneficiary_kind,
    beneficiaryDocument: row.beneficiary_document,
    beneficiaryName: row.beneficiary_name,
    revenueCode: row.revenue_code,
    grossAmount: moneyText(row.amount),
    retainedAmount: moneyText(row.irrf),
  };
}

export function normalizeInputItem(
  input: EfdReinfSourceItemDto,
  eventType: EfdReinfEventType,
  competence: string,
  index: number,
): SourceItem {
  const seed = `${eventType}:${competence}:${input.beneficiaryDocument}:${input.revenueCode}:${index}`;
  return {
    sourceRunId: uuidText(input.sourceRunId, seed),
    beneficiaryKind: input.beneficiaryKind,
    beneficiaryDocument: scalarText(input.beneficiaryDocument, ''),
    beneficiaryName: scalarText(input.beneficiaryName, ''),
    revenueCode: scalarText(input.revenueCode, eventType),
    grossAmount: moneyText(input.grossAmount),
    retainedAmount: moneyText(input.retainedAmount),
  };
}

export function aggregateClosureItems(items: SourceItem[]): SourceItem[] {
  const grouped = new Map<string, SourceItem>();
  for (const item of items) {
    const key = `${item.beneficiaryKind}:${item.beneficiaryDocument}:${item.revenueCode}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...item });
      continue;
    }
    current.grossAmount = (
      Number(current.grossAmount) + Number(item.grossAmount)
    ).toFixed(2);
    current.retainedAmount = (
      Number(current.retainedAmount) + Number(item.retainedAmount)
    ).toFixed(2);
  }
  return sortSourceItems([...grouped.values()]);
}

export function sortSourceItems(items: SourceItem[]): SourceItem[] {
  return [...items].sort(
    (left, right) =>
      left.revenueCode.localeCompare(right.revenueCode) ||
      left.beneficiaryKind.localeCompare(right.beneficiaryKind) ||
      left.beneficiaryDocument.localeCompare(right.beneficiaryDocument) ||
      left.sourceRunId.localeCompare(right.sourceRunId),
  );
}

export function eventSelectSql(where: string): string {
  return `
    SELECT
      event.id::text,
      event.competence,
      event.event_type::text,
      event.kind::text,
      event.status::text,
      event.original_event_id::text,
      event.payload_xml_ref,
      event.payload_xml,
      event.payload_xml_hash,
      event.signed_xml_ref,
      event.signed_xml,
      event.signed_xml_hash,
      event.transmitted_xml_hash,
      event.receipt_number,
      event.receipt_at,
      count(item.id)::integer AS item_count,
      COALESCE(sum(item.gross_amount), 0)::numeric(14,2)::text AS total_gross_amount,
      COALESCE(sum(item.retained_amount), 0)::numeric(14,2)::text AS total_retained_amount,
      event.created_at,
      event.updated_at
    FROM fiscal.efd_reinf_event event
    LEFT JOIN fiscal.efd_reinf_item item
      ON item.tenant_id = event.tenant_id
     AND item.event_id = event.id
    ${where}
    GROUP BY event.tenant_id, event.id
  `;
}

export function toItemDto(row: ItemRow): EfdReinfItemDto {
  return {
    id: row.id,
    sourceRunId: row.source_run_id,
    beneficiaryKind: row.beneficiary_kind,
    beneficiaryDocument: row.beneficiary_document,
    beneficiaryName: row.beneficiary_name,
    revenueCode: row.revenue_code,
    grossAmount: row.gross_amount,
    retainedAmount: row.retained_amount,
  };
}

export function competenceDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function dateText(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

export function moneyText(value: unknown): string {
  const normalized = scalarText(value, '0').replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) {
    throw new UnprocessableEntityException(
      'EFD-Reinf monetary values must be non-negative',
    );
  }
  return number.toFixed(2);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function uuidText(value: unknown, fallbackSeed: string): string {
  const text = scalarText(value, '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    text,
  )
    ? text
    : hashToUuid(fallbackSeed);
}

function scalarText(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function hashToUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
