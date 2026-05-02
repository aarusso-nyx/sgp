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
  throw new Error(
    `Use Cnab240EmitService for CNAB 240 remittance generation (${input.remittanceId})`,
  );
}
