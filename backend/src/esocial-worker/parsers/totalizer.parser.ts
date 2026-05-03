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
    return mapRow(rows[0]!);
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

  const kind = KIND_BY_EVENT_ELEMENT[eventElement]!;
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
      ...structuredPayload(kind, document),
      rawXml: xml,
    },
  };
}

function structuredPayload(
  kind: ESocialTotalizerKind,
  document: libxml.Document,
): Record<string, unknown> {
  if (kind === 'S-5001') {
    return structuredS5001Payload(document);
  }
  if (kind === 'S-5012') {
    return structuredS5012Payload(document);
  }
  if (kind !== 'S-5002') return {};
  return structuredS5002Payload(document);
}

function structuredS5001Payload(document: libxml.Document) {
  const workers = childElements(document, 'ideTrabalhador').map((worker) => {
    const bases = childElements(worker, 'infoBaseCS').map((base) => ({
      valueType: optionalChildText(base, 'tpValor'),
      amount: moneyText(optionalChildText(base, 'valor')),
    }));
    const pisPasepBases = childElements(worker, 'basesPisPasep').map(
      (base) => ({
        valueType: optionalChildText(base, 'tpValorPisPasep'),
        amount: moneyText(optionalChildText(base, 'valorPisPasep')),
      }),
    );
    return {
      cpfTrab: optionalChildText(worker, 'cpfTrab'),
      bases,
      pisPasepBases,
      baseTotal: sumMoneyText(bases.map((base) => base.amount)),
      pisPasepBaseTotal: sumMoneyText(pisPasepBases.map((base) => base.amount)),
      seguradoContribution: sumDescendantElementMoney(worker, ['vrDescSeg']),
      calculatedContribution: sumDescendantElementMoney(worker, ['vrCpSeg']),
    };
  });

  return {
    workers,
    baseTotal: sumMoneyText(workers.map((worker) => worker.baseTotal)),
    pisPasepBaseTotal: sumMoneyText(
      workers.map((worker) => worker.pisPasepBaseTotal),
    ),
    seguradoContributionTotal: sumMoneyText(
      workers.map((worker) => worker.seguradoContribution),
    ),
  };
}

function structuredS5002Payload(document: libxml.Document) {
  const workers = childElements(document, 'ideTrabalhador').map((worker) => {
    const demonstratives = childElements(worker, 'dmDev').map((dmDev) => {
      const monthlyRows = childElements(dmDev, 'totApurMen').map((total) => {
        const revenueCode = optionalChildText(total, 'CRMen');
        const withholding = sumElementMoney(total, ['vlrCRMen', 'vlrCR13Men']);
        return {
          revenueCode,
          taxableIncome: moneyText(optionalChildText(total, 'vlrRendTrib')),
          thirteenthTaxableIncome: moneyText(
            optionalChildText(total, 'vlrRendTrib13'),
          ),
          irrf: moneyText(withholding),
        };
      });
      const dailyRows = childElements(dmDev, 'totApurDia').map((total) => ({
        revenueCode: optionalChildText(total, 'CRDia'),
        irrf: moneyText(optionalChildText(total, 'vlrCRDia')),
        paidAmount: moneyText(optionalChildText(total, 'vlrPagoDia')),
      }));
      return {
        ideDmDev: optionalChildText(dmDev, 'ideDmDev'),
        monthlyRows,
        dailyRows,
        irrfTotal: sumMoneyText([
          ...monthlyRows.map((row) => row.irrf),
          ...dailyRows.map((row) => row.irrf),
        ]),
      };
    });
    return {
      cpfBenef: optionalChildText(worker, 'cpfBenef'),
      demonstratives,
      irrfTotal: sumMoneyText(
        demonstratives.map((demonstrative) => demonstrative.irrfTotal),
      ),
    };
  });

  return {
    workers,
    irrfTotal: sumMoneyText(workers.map((worker) => worker.irrfTotal)),
  };
}

function structuredS5012Payload(document: libxml.Document) {
  const monthlyRows = childElements(document, 'infoCRMen').map((row) => ({
    revenueCode: optionalChildText(row, 'CRMen'),
    irrf: moneyText(optionalChildText(row, 'vrCRMen')),
  }));
  const dailyRows = childElements(document, 'infoCRDia').map((row) => ({
    day: optionalChildText(row, 'perApurDia'),
    revenueCode: optionalChildText(row, 'CRDia'),
    irrf: moneyText(optionalChildText(row, 'vrCRDia')),
  }));

  return {
    monthlyRows,
    dailyRows,
    irrfTotal: sumMoneyText([
      ...monthlyRows.map((row) => row.irrf),
      ...dailyRows.map((row) => row.irrf),
    ]),
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

type XmlNode = {
  find(xpath: string): unknown[];
  get(xpath: string): unknown;
  text(): string;
};

function childElements(
  node: libxml.Document | XmlNode,
  name: string,
): XmlNode[] {
  return (node as { find(xpath: string): unknown[] }).find(
    `.//*[local-name() = '${name}']`,
  ) as XmlNode[];
}

function optionalChildText(node: XmlNode, name: string): string | null {
  const selected = node.get(`./*[local-name() = '${name}']`) as
    | { text(): string }
    | undefined;
  const value = selected?.text().trim();
  return value || null;
}

function sumElementMoney(node: XmlNode, names: string[]): string {
  return sumMoneyText(names.map((name) => optionalChildText(node, name)));
}

function sumDescendantElementMoney(node: XmlNode, names: string[]): string {
  return sumMoneyText(
    names.flatMap((name) =>
      childElements(node, name).map((child) => child.text().trim()),
    ),
  );
}

function sumMoneyText(values: Array<string | null>): string {
  return centsToMoney(
    values.reduce((sum, value) => sum + moneyToCents(value), 0n),
  );
}

function moneyText(value: string | null): string {
  return centsToMoney(moneyToCents(value));
}

function moneyToCents(value: string | null): bigint {
  if (!value) return 0n;
  const normalized = value.trim().replace(',', '.');
  const sign = normalized.startsWith('-') ? -1n : 1n;
  const unsigned = normalized.replace(/^-/, '');
  const [reais, cents = ''] = unsigned.split('.');
  return (
    sign *
    (BigInt(reais || '0') * 100n +
      BigInt((cents.padEnd(2, '0').slice(0, 2) || '0').replace(/\D/g, '0')))
  );
}

function centsToMoney(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
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
