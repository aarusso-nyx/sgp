import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  DctfwebDeclarationDetailsDto,
  DctfwebDeclarationDto,
  DctfwebDeclarationKind,
  DctfwebItemDto,
  DctfwebMitStatus,
  DctfwebSourceEvent,
  GenerateDctfwebDto,
} from './dctfweb.dto';
import { buildMitDebitId } from './mit-inclusion.service';

interface TotalizerRow extends QueryResultRow {
  kind: 'S-5011' | 'S-5012' | 'S-5013' | 'R-9015';
  source_event_recibo: string;
  payload: Record<string, unknown> | string;
}

interface DeclarationRow extends QueryResultRow {
  id: string;
  competence: Date | string;
  kind: DctfwebDeclarationKind;
  status: DctfwebDeclarationDto['status'];
  original_declaration_id: string | null;
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
  total_base_amount: string;
  total_amount: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ItemRow extends QueryResultRow {
  id: string;
  source_event: DctfwebSourceEvent;
  source_run_id: string;
  debit_code: string;
  base_amount: string;
  amount: string;
  csll_adicional_amount: string | null;
  mit_status: DctfwebMitStatus | null;
  mit_debit_id: string | null;
  cnpj_filial: string | null;
}

interface PgdTaxDebitRow extends QueryResultRow {
  pgd_declaration_id: string;
  pgd_debit_id: string;
  cnpj_filial: string;
  tax_code: string;
  base_amount: string;
  amount: string;
  csll_adicional_amount: string | null;
  mit_status: DctfwebMitStatus | null;
}

interface SourceItem {
  sourceEvent: DctfwebSourceEvent;
  sourceRunId: string;
  debitCode: string;
  baseAmount: string;
  amount: string;
  csllAdicionalAmount: string;
  mitStatus?: DctfwebMitStatus;
  mitDebitId?: string;
  cnpjFilial?: string;
}

const EVENT_MAP: Record<TotalizerRow['kind'], DctfwebSourceEvent> = {
  'S-5011': 'S5011',
  'S-5012': 'S5012',
  'S-5013': 'S5013',
  'R-9015': 'R9015',
};

@Injectable()
export class DctfwebBuilderService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(year?: number, month?: number): Promise<DctfwebDeclarationDto[]> {
    this.ensureDatabase();
    const params: unknown[] = [];
    const filters: string[] = [];
    if (year && month) {
      params.push(competenceDate(year, month));
      filters.push(`competence = $${params.length}::date`);
    }
    const rows = await this.databaseService.query<DeclarationRow>(
      `
      SELECT
        declaration_id::text AS id,
        competence,
        kind::text,
        status::text,
        original_declaration_id::text,
        payload_xml_ref,
        NULL::text AS payload_xml,
        payload_xml_hash,
        signed_xml_ref,
        NULL::text AS signed_xml,
        signed_xml_hash,
        transmitted_xml_hash,
        receipt_number,
        receipt_at,
        item_count,
        total_base_amount::text,
        total_amount::text,
        created_at,
        updated_at
      FROM fiscal.v_dctfweb_summary
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY competence DESC, created_at DESC
      `,
      params,
    );
    return rows.map((row) => this.toDto(row));
  }

  async find(id: string): Promise<DctfwebDeclarationDetailsDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DeclarationRow>(
      declarationSelectSql('WHERE declaration.id = $1::uuid'),
      [id],
    );
    const declaration = rows[0];
    if (!declaration) {
      throw new BadRequestException('DCTFWeb declaration not found');
    }
    const items = await this.databaseService.query<ItemRow>(
      `
      SELECT
        id::text,
        source_event::text,
        source_run_id::text,
        debit_code,
        base_amount::text,
        amount::text,
        csll_adicional_amount::text,
        NULL::text AS mit_status,
        NULL::text AS mit_debit_id,
        NULL::text AS cnpj_filial
      FROM fiscal.dctfweb_item
      WHERE declaracao_id = $1::uuid
      ORDER BY source_event, debit_code
      `,
      [id],
    );
    return {
      ...this.toDto(declaration),
      payloadXml: declaration.payload_xml,
      signedXml: declaration.signed_xml,
      items: items.map(toItemDto),
    };
  }

  async generate(
    input: GenerateDctfwebDto,
  ): Promise<DctfwebDeclarationDetailsDto> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const kind = input.kind ?? 'ORIGINAL';
    if (kind === 'RETIFICADORA' && !input.originalDeclarationId) {
      throw new UnprocessableEntityException(
        'Retificadora must reference the original declaracao_id',
      );
    }
    const competence = competenceDate(input.year, input.month);
    const totalizers = await this.loadPublishedTotalizers(tenantId, competence);
    const mitDebits = await this.loadPendingMitDebits(tenantId, competence);
    const items = [
      ...totalizers.flatMap((row) => this.itemsFromTotalizer(row)),
      ...mitDebits.map((row) =>
        this.itemFromMitDebit(tenantId, competence, row),
      ),
    ];
    if (!items.length) {
      throw new PreconditionFailedException(
        'DCTFWeb generation requires accepted S-5011, S-5012, S-5013, EFD-Reinf R-9015 totalizers, or pending MIT tax debits for the competence',
      );
    }

    const xml = buildDctfwebXml({
      tenantId,
      competence,
      kind,
      originalDeclarationId: input.originalDeclarationId ?? null,
      items,
    });
    const xmlHash = sha256(xml);
    const payloadXmlRef = `s3://local-fiscal/${tenantId}/dctfweb/${competence}/${xmlHash}.xml`;

    const id = await this.databaseService.transaction(async (client) => {
      if (kind === 'RETIFICADORA') {
        await this.assertOriginalExists(
          client,
          input.originalDeclarationId as string,
        );
      }

      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO fiscal.dctfweb_declaration (
          tenant_id,
          competence,
          kind,
          status,
          original_declaration_id,
          payload_xml_ref,
          payload_xml,
          payload_xml_hash
        )
        VALUES (
          $1::uuid,
          $2::date,
          $3::fiscal.dctfweb_declaration_kind,
          'DRAFT'::fiscal.dctfweb_declaration_status,
          $4::uuid,
          $5,
          $6,
          $7
        )
        RETURNING id::text
        `,
        [
          tenantId,
          competence,
          kind,
          input.originalDeclarationId ?? null,
          payloadXmlRef,
          xml,
          xmlHash,
        ],
      );
      const declarationId = inserted.rows[0]!.id;
      for (const item of items) {
        await client.query(
          `
          INSERT INTO fiscal.dctfweb_item (
            tenant_id,
            declaracao_id,
            source_event,
            source_run_id,
            debit_code,
            base_amount,
            amount,
            csll_adicional_amount
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::fiscal.dctfweb_source_event,
            $4::uuid,
            $5,
            $6::numeric(14,2),
            $7::numeric(14,2),
            $8::numeric(14,2)
          )
          `,
          [
            tenantId,
            declarationId,
            item.sourceEvent,
            item.sourceRunId,
            item.debitCode,
            item.baseAmount,
            item.amount,
            item.csllAdicionalAmount,
          ],
        );
      }
      return declarationId;
    });

    return this.find(id);
  }

  private async loadPublishedTotalizers(
    tenantId: string,
    competence: string,
  ): Promise<TotalizerRow[]> {
    return this.databaseService.query<TotalizerRow>(
      `
      SELECT
        totalizer.kind::text AS kind,
        totalizer.source_event_recibo,
        totalizer.payload
      FROM esocial.esocial_totalizer totalizer
      JOIN esocial.s1299_emission_state state
        ON state.tenant_id = totalizer.tenant_id
       AND state.competence = totalizer.competence
       AND state.recibo = totalizer.source_event_recibo
       AND state.status = 'ACCEPTED'::esocial.s1299_emission_status
      WHERE totalizer.tenant_id = $1::uuid
        AND totalizer.competence = $2::date
        AND totalizer.kind IN (
          'S-5011'::esocial.esocial_totalizer_kind,
          'S-5012'::esocial.esocial_totalizer_kind,
          'S-5013'::esocial.esocial_totalizer_kind
        )
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

  private async loadPendingMitDebits(
    tenantId: string,
    competence: string,
  ): Promise<PgdTaxDebitRow[]> {
    return this.databaseService.query<PgdTaxDebitRow>(
      `
      SELECT
        pgd_declaration_id::text,
        pgd_debit_id::text,
        cnpj_filial,
        tax_code,
        base_amount::text,
        amount::text,
        csll_adicional_amount::text,
        mit_status::text
      FROM fiscal.dctf_pgd_tax_debit
      WHERE tenant_id = $1::uuid
        AND competence = $2::date
        AND COALESCE(mit_status::text, 'PENDING') IN ('PENDING', 'REJECTED')
      ORDER BY cnpj_filial, tax_code, pgd_debit_id
      `,
      [tenantId, competence],
    );
  }

  private itemsFromTotalizer(row: TotalizerRow): SourceItem[] {
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

  private itemFromMitDebit(
    tenantId: string,
    competence: string,
    row: PgdTaxDebitRow,
  ): SourceItem {
    const cnpjFilial = scalarText(row.cnpj_filial, '').replace(/\D/g, '');
    const debitCode = scalarText(row.tax_code, 'MIT');
    const baseAmount = moneyText(row.base_amount);
    const amount = moneyText(row.amount);
    const csllAdicionalAmount = moneyText(row.csll_adicional_amount ?? 0);
    const pgdDeclarationId = scalarText(row.pgd_declaration_id, '');
    const pgdDebitId = scalarText(row.pgd_debit_id, '');
    return {
      sourceEvent: 'MIT',
      sourceRunId: uuidText(pgdDebitId, `MIT:${pgdDeclarationId}:${debitCode}`),
      debitCode,
      baseAmount,
      amount,
      csllAdicionalAmount,
      mitStatus: row.mit_status ?? 'PENDING',
      mitDebitId: buildMitDebitId({
        tenantId,
        competence,
        cnpjFilial,
        pgdDeclarationId,
        pgdDebitId,
        taxCode: debitCode,
        amount,
      }),
      cnpjFilial,
    };
  }

  private async assertOriginalExists(
    client: PoolClient,
    originalDeclarationId: string,
  ): Promise<void> {
    const found = await client.query(
      `
      SELECT 1
      FROM fiscal.dctfweb_declaration
      WHERE id = $1::uuid
        AND kind = 'ORIGINAL'::fiscal.dctfweb_declaration_kind
      `,
      [originalDeclarationId],
    );
    if (!found.rowCount) {
      throw new UnprocessableEntityException(
        'Retificadora must reference an existing original DCTFWeb declaration',
      );
    }
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new UnprocessableEntityException(
        'Tenant context is required for DCTFWeb',
      );
    }
    return tenantId;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for DCTFWeb operations',
      );
    }
  }

  private toDto(row: DeclarationRow): DctfwebDeclarationDto {
    return {
      id: row.id,
      competence: dateText(row.competence),
      kind: row.kind,
      status: row.status,
      originalDeclarationId: row.original_declaration_id,
      payloadXmlRef: row.payload_xml_ref,
      payloadXmlHash: row.payload_xml_hash,
      signedXmlRef: row.signed_xml_ref,
      signedXmlHash: row.signed_xml_hash,
      transmittedXmlHash: row.transmitted_xml_hash,
      receiptNumber: row.receipt_number,
      receiptAt: row.receipt_at ? new Date(row.receipt_at).toISOString() : null,
      itemCount: Number(row.item_count),
      totalBaseAmount: row.total_base_amount,
      totalAmount: row.total_amount,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}

export function buildDctfwebXml(input: {
  tenantId: string;
  competence: string;
  kind: DctfwebDeclarationKind;
  originalDeclarationId: string | null;
  items: SourceItem[];
}): string {
  const id = `DCTF${sha256(
    `${input.tenantId}:${input.competence}:${input.kind}:${input.originalDeclarationId ?? ''}`,
  ).slice(0, 32)}`;
  const itemsXml = input.items
    .map(
      (item) =>
        `    <debito sourceEvent="${item.sourceEvent}"${mitAttributes(
          item,
        )}${csllAdicionalAttribute(item)} sourceRunId="${item.sourceRunId}" codigo="${xmlEscape(
          item.debitCode,
        )}" base="${item.baseAmount}" valor="${item.amount}" />`,
    )
    .join('\n');
  const originalXml = input.originalDeclarationId
    ? `\n    <declaracaoOriginal>${input.originalDeclarationId}</declaracaoOriginal>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<DCTFWeb xmlns="urn:br:gov:rfb:dctfweb:sgp:v1">
  <declaracao Id="${id}">
    <tenantId>${input.tenantId}</tenantId>
    <competencia>${input.competence.slice(0, 7)}</competencia>
    <tipo>${input.kind}</tipo>${originalXml}
    <totalizadores>
${itemsXml}
    </totalizadores>
  </declaracao>
</DCTFWeb>`;
}

function mitAttributes(item: SourceItem): string {
  if (item.sourceEvent !== 'MIT') return '';
  const attrs = [
    item.mitStatus ? `mitStatus="${xmlEscape(item.mitStatus)}"` : null,
    item.mitDebitId ? `mitId="${xmlEscape(item.mitDebitId)}"` : null,
    item.cnpjFilial ? `cnpjFilial="${xmlEscape(item.cnpjFilial)}"` : null,
  ].filter(Boolean);
  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

function csllAdicionalAttribute(item: SourceItem): string {
  if (!item.csllAdicionalAmount || item.csllAdicionalAmount === '0.00') {
    return '';
  }
  return ` csllAdicional="${xmlEscape(item.csllAdicionalAmount)}"`;
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

function childText(node: string, name: string): string | null {
  const value = node
    .match(new RegExp(`<(?:[A-Za-z0-9_]+:)?${name}\\b[^>]*>([^<]+)<`, 'i'))?.[1]
    ?.trim();
  return value || null;
}

function declarationSelectSql(where: string): string {
  return `
    SELECT
      declaration.id::text,
      declaration.competence,
      declaration.kind::text,
      declaration.status::text,
      declaration.original_declaration_id::text,
      declaration.payload_xml_ref,
      declaration.payload_xml,
      declaration.payload_xml_hash,
      declaration.signed_xml_ref,
      declaration.signed_xml,
      declaration.signed_xml_hash,
      declaration.transmitted_xml_hash,
      declaration.receipt_number,
      declaration.receipt_at,
      count(item.id)::integer AS item_count,
      COALESCE(sum(item.base_amount), 0)::numeric(14,2)::text AS total_base_amount,
      COALESCE(sum(item.amount), 0)::numeric(14,2)::text AS total_amount,
      declaration.created_at,
      declaration.updated_at
    FROM fiscal.dctfweb_declaration declaration
    LEFT JOIN fiscal.dctfweb_item item
      ON item.tenant_id = declaration.tenant_id
     AND item.declaracao_id = declaration.id
    ${where}
    GROUP BY declaration.tenant_id, declaration.id
  `;
}

function toItemDto(row: ItemRow): DctfwebItemDto {
  return {
    id: row.id,
    sourceEvent: row.source_event,
    sourceRunId: row.source_run_id,
    debitCode: row.debit_code,
    baseAmount: row.base_amount,
    amount: row.amount,
    csllAdicionalAmount: row.csll_adicional_amount ?? '0.00',
    mitStatus: row.mit_status ?? undefined,
    mitDebitId: row.mit_debit_id ?? undefined,
    cnpjFilial: row.cnpj_filial ?? undefined,
  };
}

function competenceDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function dateText(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function moneyText(value: unknown): string {
  const normalized = scalarText(value, '0').replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) {
    throw new UnprocessableEntityException(
      'DCTFWeb monetary values must be non-negative',
    );
  }
  return number.toFixed(2);
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

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
