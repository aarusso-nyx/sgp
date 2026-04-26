import type { GeneratedArtifact } from './cnab-remittance.builder';

export interface ESocialEventBuildInput {
  eventId: string;
  eventType: string;
  competence: string;
  reference: string;
  payload: Record<string, unknown>;
  schemaVersion: string;
}

const ROOT_TAG_BY_TYPE: Record<string, string> = {
  'S-2230': 'evtAfastTemp',
  'S-2299': 'evtDeslig',
  'S-2200': 'evtAdmissao',
  'S-2205': 'evtAltCadastral',
  'S-1200': 'evtRemun',
  'S-1210': 'evtPgtos',
  'S-1299': 'evtFechaEvPer',
  'S-2400': 'evtCdBenefIn',
};

export function buildESocialEventXml(
  input: ESocialEventBuildInput,
): GeneratedArtifact {
  const rootTag = ROOT_TAG_BY_TYPE[input.eventType] ?? 'evtGenerico';
  const payloadEntries = Object.entries(input.payload).map(([key, value]) => {
    return `      <campo nome="${escapeXml(key)}">${escapeXml(String(value))}</campo>`;
  });
  const content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<eSocial xmlns="http://www.esocial.gov.br/schema/evt/${rootTag}/v02_05_00">`,
    `  <${rootTag} Id="${escapeXml(input.eventId)}">`,
    '    <ideEvento>',
    `      <tpEvento>${escapeXml(input.eventType)}</tpEvento>`,
    `      <perApur>${escapeXml(input.competence)}</perApur>`,
    `      <schemaVersion>${escapeXml(input.schemaVersion)}</schemaVersion>`,
    '    </ideEvento>',
    '    <sgpMeta>',
    `      <referencia>${escapeXml(input.reference)}</referencia>`,
    ...payloadEntries,
    '    </sgpMeta>',
    `  </${rootTag}>`,
    '</eSocial>',
  ].join('\n');

  return {
    fileName: `esocial-${sanitize(input.eventType)}-${sanitize(input.eventId)}.xml`,
    contentType: 'application/xml',
    format: 'XML',
    content,
    recordCount: 1,
  };
}

function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
