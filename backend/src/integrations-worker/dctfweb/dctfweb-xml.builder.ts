import { DctfwebDeclarationKind, DctfwebMitStatus } from './dctfweb.dto';
import { SourceItem, XmlItemMetadata } from './dctfweb-builder.types';
import { sha256, xmlEscape, xmlUnescape } from './dctfweb-builder.util';

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

export function parseDctfwebXmlItemMetadata(
  xml: string,
): Map<string, XmlItemMetadata> {
  const metadata = new Map<string, XmlItemMetadata>();
  for (const match of xml.matchAll(/<debito\b([^>]*)\/>/g)) {
    const attrs = parseXmlAttributes(match[1]!);
    const sourceEvent = attrs.sourceEvent;
    const sourceRunId = attrs.sourceRunId;
    const debitCode = attrs.codigo;
    if (!sourceEvent || !sourceRunId || !debitCode) continue;
    const itemMetadata: XmlItemMetadata = {};
    if (isDctfwebMitStatus(attrs.mitStatus)) {
      itemMetadata.mitStatus = attrs.mitStatus;
    }
    if (attrs.mitId) itemMetadata.mitDebitId = attrs.mitId;
    if (attrs.cnpjFilial) itemMetadata.cnpjFilial = attrs.cnpjFilial;
    metadata.set(`${sourceEvent}:${sourceRunId}:${debitCode}`, itemMetadata);
  }
  return metadata;
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

function parseXmlAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of input.matchAll(/([A-Za-z0-9_:-]+)="([^"]*)"/g)) {
    attrs[match[1]!] = xmlUnescape(match[2]!);
  }
  return attrs;
}

function isDctfwebMitStatus(
  value: string | undefined,
): value is DctfwebMitStatus {
  return (
    value === 'PENDING' ||
    value === 'INCLUDED' ||
    value === 'ACCEPTED' ||
    value === 'REJECTED'
  );
}
