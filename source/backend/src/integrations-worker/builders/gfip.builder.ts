import type { GeneratedArtifact } from './cnab-remittance.builder';

export interface GfipBuildInput {
  competenceYear: number;
  competenceMonth: number;
  branchId: string | null;
  collectionCode: string;
  modality: string;
  payrollRunId: string | null;
  employeeCount: number;
  totalAmount: string;
}

export function buildGfipFile(input: GfipBuildInput): GeneratedArtifact {
  const competence = `${input.competenceYear}${String(input.competenceMonth).padStart(2, '0')}`;
  const lines = [
    `GFIP|COMPETENCE=${competence}|COLLECTION=${input.collectionCode}|MODALITY=${input.modality}`,
    `RUN|PAYROLL_RUN_ID=${input.payrollRunId ?? ''}|BRANCH_ID=${input.branchId ?? ''}`,
    `TOTALS|EMPLOYEES=${input.employeeCount}|NET=${input.totalAmount}`,
    `EOF|LINES=4`,
  ];

  return {
    fileName: `sefip_${competence}.re`,
    contentType: 'text/plain; charset=utf-8',
    format: 'GFIP',
    content: `${lines.join('\n')}\n`,
    recordCount: lines.length,
  };
}
