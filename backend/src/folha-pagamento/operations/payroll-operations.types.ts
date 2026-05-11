import { QueryResultRow } from 'pg';

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface PayrollRunRow extends QueryResultRow {
  id: string;
  branch_id: string | null;
  processing_type_id: string;
  status: string;
  competence_year: number;
  competence_month: number;
  total_net: string;
}

export interface IdRow extends QueryResultRow {
  id: string;
}

export interface RemittanceRow extends QueryResultRow {
  id: string;
  status: string;
  competence_year: number;
  competence_month: number;
  payment_date: Date | string | null;
  file_name: string | null;
  file_hash: string | null;
  bank_code: number | null;
  layout_version: string | null;
  record_count: number | null;
  total_amount: string;
  generated_at: Date | string | null;
  attachment_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

export interface RemittanceSummary {
  id: string;
  status: string;
  competenceYear: number;
  competenceMonth: number;
  paymentDate: string | null;
  fileName: string | null;
  fileHash: string | null;
  bankCode: number | null;
  layoutVersion: string | null;
  recordCount: number | null;
  totalAmount: string;
  generatedAt: string | null;
  attachmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperationRequestSummary {
  requestId: string;
  status: string;
  requestedAt: string;
  metadata: Record<string, unknown>;
}

export interface ReportRequestInput {
  definitionId: string;
  branchId: string | null;
  payrollRunId: string | null;
  processingTypeId: string | null;
  competenceYear: number;
  competenceMonth: number;
  parameters: Record<string, unknown>;
}

export const REPORT_DEFINITIONS = {
  remittance: {
    code: 'FOLHA_CNAB_REMESSA',
    name: 'Folha - Remessa CNAB',
    description: 'Solicitacao de geracao de remessa bancaria CNAB da folha.',
  },
  returnProcessing: {
    code: 'FOLHA_CNAB_RETORNO',
    name: 'Folha - Retorno CNAB',
    description: 'Solicitacao de processamento de retorno bancario CNAB.',
  },
  gfip: {
    code: 'FOLHA_GFIP_GERAR',
    name: 'Folha - Geracao GFIP/SEFIP',
    description: 'Solicitacao de geracao do arquivo GFIP/SEFIP.',
  },
} as const;

export function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
