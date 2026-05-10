import { domainError } from '../../common/errors/domain-error';

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
  throw domainError.internal(
    'INTERNAL_INVARIANT',
    `Use Cnab240EmitService for CNAB 240 remittance generation (${input.remittanceId})`,
  );
}
