export interface CnabRemittanceBuildInput {
  competenceYear: number;
  competenceMonth: number;
  paymentDate: string | null;
  bankId: string;
  format: string;
  remittanceNumber: number;
  totalAmount: string;
  employeeCount: number;
  payrollRunId: string | null;
  remittanceId: string;
}

export interface GeneratedArtifact {
  fileName: string;
  contentType: string;
  format: string;
  content: string | Buffer;
  recordCount: number;
}

export function buildCnabRemittance(
  input: CnabRemittanceBuildInput,
): GeneratedArtifact {
  const lines = [
    [
      'HEADER',
      input.format,
      input.bankId,
      `${input.competenceYear}${String(input.competenceMonth).padStart(2, '0')}`,
      `REMESSA-${String(input.remittanceNumber).padStart(6, '0')}`,
      input.paymentDate ?? '',
      input.payrollRunId ?? '',
      input.remittanceId,
    ].join('|'),
    [
      'DETAIL',
      `EMPLOYEES=${input.employeeCount}`,
      `TOTAL=${input.totalAmount}`,
    ].join('|'),
    ['TRAILER', `RECORDS=3`, `TOTAL=${input.totalAmount}`].join('|'),
  ];

  return {
    fileName: `remessa_${String(input.remittanceNumber).padStart(6, '0')}.txt`,
    contentType: 'text/plain; charset=utf-8',
    format: input.format,
    content: `${lines.join('\n')}\n`,
    recordCount: lines.length,
  };
}
