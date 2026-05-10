import { createHash } from 'node:crypto';
import { domainError } from '../../../common/errors/domain-error';

export const EFD_REINF_R2000_LAYOUT_VERSION = '2.1.2';
export const EFD_REINF_R2000_TECHNICAL_NOTE = 'NT 01/2026';

const DEFAULT_PROCESS_VERSION = 'SGP-0.0.1';

export type ReinfRegistrationType = '1' | '2' | '3' | '4';
export type ReinfEnvironment = '1' | '2';
export type ReinfEmissionProcess = '1' | '2';
export type R2000EventKind = 'ORIGINAL' | 'RETIFICADORA';
export type R2000EventCode = 'R2010' | 'R2020' | 'R2055';

export interface R2000ContributorInput {
  registrationType: ReinfRegistrationType;
  registrationNumber: string;
}

export interface R2000BaseEventInput {
  eventId?: string | undefined;
  eventCode: R2000EventCode;
  reportingCompetence: string;
  environment?: ReinfEnvironment | undefined;
  emissionProcess?: ReinfEmissionProcess | undefined;
  processVersion?: string | undefined;
  kind?: R2000EventKind | undefined;
  originalReceiptNumber?: string | undefined;
  contributor: R2000ContributorInput;
}

export interface R2000EnvelopeInput {
  eventCode: R2000EventCode;
  eventElement: string;
  eventId: string;
  headerXml: string;
  bodyXml: string;
}

export interface R2000EstablishmentInput {
  registrationType: ReinfRegistrationType;
  registrationNumber: string;
  constructionIndicator?: '0' | '1' | '2' | undefined;
}

export interface R2000ServiceCounterpartyInput {
  registrationType: Extract<ReinfRegistrationType, '1' | '2'>;
  registrationNumber: string;
  name: string;
}

export interface R2000ServiceInvoiceInput {
  sourceRunId?: string | undefined;
  series?: string | undefined;
  number: string;
  issuedOn: string;
  grossAmount: string;
  retentionBaseAmount: string;
  principalRetainedAmount: string;
  additionalRetainedAmount?: string | undefined;
  principalNotRetainedAmount?: string | undefined;
  additionalNotRetainedAmount?: string | undefined;
  cprbIndicator?: 'S' | 'N' | undefined;
}

export interface R2000ServiceRetentionInput extends R2000BaseEventInput {
  eventCode: 'R2010' | 'R2020';
  establishment: R2000EstablishmentInput;
  counterparty: R2000ServiceCounterpartyInput;
  invoices: R2000ServiceInvoiceInput[];
}

export function buildR2000ServiceRetentionXml(
  input: R2000ServiceRetentionInput,
): string {
  assertNonEmpty(input.invoices, `${input.eventCode} invoices`);
  const eventElement =
    input.eventCode === 'R2010' ? 'evtServTom' : 'evtServPrest';
  const bodyElement =
    input.eventCode === 'R2010' ? 'infoServTom' : 'infoServPrest';
  const counterpartyElement =
    input.eventCode === 'R2010' ? 'idePrestServ' : 'ideTomador';
  const seed = `${input.contributor.registrationNumber}:${input.reportingCompetence}:${input.eventCode}:${input.counterparty.registrationNumber}`;
  const eventId = input.eventId ?? buildR2000EventId(input.eventCode, seed);
  const headerXml = buildR2000EventHeader({ ...input, eventId });
  const invoicesXml = input.invoices.map(buildInvoiceXml).join('\n');
  const bodyXml = `    <${bodyElement}>
      <ideEstabObra>
        <tpInscEstab>${input.establishment.registrationType}</tpInscEstab>
        <nrInscEstab>${xmlEscape(input.establishment.registrationNumber)}</nrInscEstab>
        <indObra>${input.establishment.constructionIndicator ?? '0'}</indObra>
        <${counterpartyElement}>
          <tpInsc>${input.counterparty.registrationType}</tpInsc>
          <nrInsc>${xmlEscape(input.counterparty.registrationNumber)}</nrInsc>
          <nome>${xmlEscape(input.counterparty.name)}</nome>
${invoicesXml}
        </${counterpartyElement}>
      </ideEstabObra>
    </${bodyElement}>`;
  return buildR2000Envelope({
    eventCode: input.eventCode,
    eventElement,
    eventId,
    headerXml,
    bodyXml,
  });
}

export function buildR2000Envelope(input: R2000EnvelopeInput): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="urn:br:gov:rfb:reinf:sgp:r2000" layoutVersion="${EFD_REINF_R2000_LAYOUT_VERSION}" technicalNote="${EFD_REINF_R2000_TECHNICAL_NOTE}">
  <${input.eventElement} Id="${xmlEscape(input.eventId)}" eventCode="${input.eventCode}">
${input.headerXml}
${input.bodyXml}
  </${input.eventElement}>
</Reinf>`;
}

export function buildR2000EventHeader(input: R2000BaseEventInput): string {
  const kind = input.kind ?? 'ORIGINAL';
  if (kind === 'RETIFICADORA' && !input.originalReceiptNumber) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      `${input.eventCode} retificadora requires originalReceiptNumber`,
    );
  }
  const receiptXml =
    kind === 'RETIFICADORA'
      ? `\n      <nrRecibo>${xmlEscape(input.originalReceiptNumber ?? '')}</nrRecibo>`
      : '';
  return `    <ideEvento>
      <perApur>${competenceText(input.reportingCompetence)}</perApur>
      <tpAmb>${input.environment ?? '2'}</tpAmb>
      <procEmi>${input.emissionProcess ?? '1'}</procEmi>
      <verProc>${xmlEscape(input.processVersion ?? DEFAULT_PROCESS_VERSION)}</verProc>
      <indRetif>${kind === 'ORIGINAL' ? '1' : '2'}</indRetif>${receiptXml}
    </ideEvento>
    <ideContri>
      <tpInsc>${input.contributor.registrationType}</tpInsc>
      <nrInsc>${xmlEscape(input.contributor.registrationNumber)}</nrInsc>
    </ideContri>`;
}

export function buildR2000EventId(
  eventCode: R2000EventCode,
  seed: string,
): string {
  return `ID${eventCode}${sha256(`${eventCode}:${seed}`).slice(0, 32)}`;
}

export function assertRetroactiveReference(
  reportingCompetence: string,
  referenceCompetence: string,
): void {
  const reporting = competenceText(reportingCompetence);
  const reference = competenceText(referenceCompetence);
  if (reference >= reporting) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      `Retroactive EFD-Reinf adjustment must reference a competence before ${reporting}`,
    );
  }
}

export function competenceText(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(value)) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      `Invalid EFD-Reinf competence: ${value}`,
    );
  }
  return value.slice(0, 7);
}

export function dateText(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      `Invalid EFD-Reinf date: ${value}`,
    );
  }
  return value;
}

export function moneyText(value: string | number | undefined): string {
  const normalized = String(value ?? '0').replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      'EFD-Reinf monetary values must be non-negative',
    );
  }
  return number.toFixed(2);
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildInvoiceXml(invoice: R2000ServiceInvoiceInput): string {
  const sourceRunAttribute = invoice.sourceRunId
    ? ` sourceRunId="${xmlEscape(invoice.sourceRunId)}"`
    : '';
  const seriesXml = invoice.series
    ? `\n            <serie>${xmlEscape(invoice.series)}</serie>`
    : '';
  return `          <nfs${sourceRunAttribute}>${seriesXml}
            <numDocto>${xmlEscape(invoice.number)}</numDocto>
            <dtEmissaoNF>${dateText(invoice.issuedOn)}</dtEmissaoNF>
            <vlrBruto>${moneyText(invoice.grossAmount)}</vlrBruto>
            <vlrBaseRet>${moneyText(invoice.retentionBaseAmount)}</vlrBaseRet>
            <vlrRetPrinc>${moneyText(invoice.principalRetainedAmount)}</vlrRetPrinc>
            <vlrRetAdic>${moneyText(invoice.additionalRetainedAmount)}</vlrRetAdic>
            <vlrNRetPrinc>${moneyText(invoice.principalNotRetainedAmount)}</vlrNRetPrinc>
            <vlrNRetAdic>${moneyText(invoice.additionalNotRetainedAmount)}</vlrNRetAdic>
            <indCPRB>${invoice.cprbIndicator ?? 'N'}</indCPRB>
          </nfs>`;
}

function assertNonEmpty<T>(items: T[], label: string): void {
  if (!items.length) {
    throw domainError.internal('INTERNAL_INVARIANT', `${label} are required`);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
