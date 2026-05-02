export type FgtsRemittanceKind = 'GRF_MONTHLY' | 'GRRF_TERMINATION';
export type FgtsRemittanceStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'SENT'
  | 'PAID'
  | 'REJECTED';

export interface SifgeHeader {
  tenantId: string;
  remittanceId: string;
  competence: string;
  kind: FgtsRemittanceKind;
  generatedAt: string;
  daeBarcode: string;
}

export interface SifgeRecord {
  employeeId: string;
  employmentLinkId: string;
  payrollRunId: string | null;
  baseAmount: string;
  rate: string;
  amount: string;
  movementId: string | null;
  terminationDate?: string;
  noticeAmount?: string;
}

export interface SifgePayload {
  header: SifgeHeader;
  totals: {
    employeeCount: number;
    totalBase: string;
    totalAmount: string;
  };
  records: SifgeRecord[];
}

export interface ParsedSifgePayload extends SifgePayload {
  layoutVersion: string;
  adapterKey: string;
  signed: boolean;
}

export interface CaixaSifgeAdapter {
  adapterKey: string;
  layoutVersion: string;
  requiresSignature: boolean;
  assemble(payload: SifgePayload): Buffer;
  parse(buffer: Buffer): ParsedSifgePayload;
  signIfRequired(buffer: Buffer): Buffer;
}

export const SIFGE_ADAPTERS = Symbol('SIFGE_ADAPTERS');
