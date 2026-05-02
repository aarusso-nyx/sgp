import type { GeneratedArtifact } from './cnab-remittance.builder';

export interface SiprevExportInput {
  competence: string;
  retirements: Array<{
    id: string;
    cpf: string | null;
    name: string;
    grantedOn: string;
    legalBasis: string;
  }>;
  pensions: Array<{
    id: string;
    beneficiaryName: string;
    beneficiaryCpf: string | null;
    grantedOn: string;
    benefitType: string;
  }>;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSiprevExport(input: SiprevExportInput): GeneratedArtifact {
  const retirementsXml = input.retirements
    .map(
      (
        entry,
      ) => `    <Beneficio tipo="APOSENTADORIA" id="${escapeXml(entry.id)}">
      <Nome>${escapeXml(entry.name)}</Nome>
      <CPF>${escapeXml(entry.cpf ?? '')}</CPF>
      <DataConcessao>${escapeXml(entry.grantedOn)}</DataConcessao>
      <Fundamento>${escapeXml(entry.legalBasis)}</Fundamento>
    </Beneficio>`,
    )
    .join('\n');
  const pensionsXml = input.pensions
    .map(
      (entry) => `    <Beneficio tipo="PENSAO" id="${escapeXml(entry.id)}">
      <Nome>${escapeXml(entry.beneficiaryName)}</Nome>
      <CPF>${escapeXml(entry.beneficiaryCpf ?? '')}</CPF>
      <DataConcessao>${escapeXml(entry.grantedOn)}</DataConcessao>
      <Tipo>${escapeXml(entry.benefitType)}</Tipo>
    </Beneficio>`,
    )
    .join('\n');

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<SiprevExport competencia="${escapeXml(input.competence)}">
  <Beneficios>
${retirementsXml}${retirementsXml && pensionsXml ? '\n' : ''}${pensionsXml}
  </Beneficios>
</SiprevExport>
`;

  return {
    fileName: `siprev-${input.competence.replace(/[^0-9]/g, '')}.xml`,
    contentType: 'application/xml; charset=utf-8',
    format: 'XML',
    content,
    recordCount: input.retirements.length + input.pensions.length,
  };
}
