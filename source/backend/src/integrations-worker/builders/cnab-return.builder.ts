import type { GeneratedArtifact } from './cnab-remittance.builder';

export interface CnabReturnBuildInput {
  competenceYear: number;
  competenceMonth: number;
  remittanceId: string;
  sourceKey: string;
  format: string;
  fileName?: string | null;
  employeeCount: number;
  totalAmount: string;
}

export function buildCnabReturnReport(
  input: CnabReturnBuildInput,
): GeneratedArtifact {
  const payload = {
    type: 'CNAB_RETURN_REPORT',
    format: input.format,
    remittanceId: input.remittanceId,
    sourceKey: input.sourceKey,
    sourceFileName: input.fileName ?? null,
    competenceYear: input.competenceYear,
    competenceMonth: input.competenceMonth,
    processedRecords: input.employeeCount,
    paidAmount: input.totalAmount,
    rejectedRecords: 0,
  };

  return {
    fileName:
      input.fileName?.replace(/\.txt$/i, '.json') ??
      `retorno_${input.remittanceId}.json`,
    contentType: 'application/json',
    format: 'JSON',
    content: `${JSON.stringify(payload, null, 2)}\n`,
    recordCount: input.employeeCount,
  };
}
