import { QueryResultRow } from 'pg';

export interface AudespPayrollServer {
  employeeId: string;
  registration: string;
  cpf: string;
  position: string;
  earnings: string;
  deductions: string;
  net: string;
}

export interface AudespPayrollEnvelope {
  adapterId: 'audesp-sp';
  layoutCode: 'AUDESP-FOLHA';
  layoutVersion: string;
  tenantId: string;
  payrollRunId: string;
  organizationCode: string;
  competenceYear: number;
  competenceMonth: number;
  shipmentKind: 'FOLHA_PAGAMENTO';
  generatedAt: string;
  servers: AudespPayrollServer[];
}

export interface AudespValidationError {
  fieldPath: string;
  code: 'REQUIRED' | 'MAX_LENGTH' | 'TYPE' | 'DECIMAL' | 'UNSUPPORTED_LAYOUT';
  message: string;
}

export interface AudespLayoutField {
  fieldPath: string;
  dataType:
    | 'STRING'
    | 'INT'
    | 'DECIMAL'
    | 'DATE'
    | 'DATETIME'
    | 'BOOLEAN'
    | 'ENUM'
    | 'XML_NODE';
  required: boolean;
  maxLength: number | null;
  decimalPrecision: number | null;
  decimalScale: number | null;
}

export interface AudespSubmissionDto {
  id: string;
  tenantId: string;
  adapterId: string;
  layoutVersionId: string;
  payrollRunId: string;
  competenceYear: number;
  competenceMonth: number;
  envelopeXmlUri: string | null;
  envelopeHash: string | null;
  requestSizeBytes: number | null;
  status: string;
  validationErrors: AudespValidationError[];
  responsePayload: Record<string, unknown>;
  responseHash: string | null;
  submittedAt: string | null;
  responseAt: string | null;
}

export interface AudespSubmissionRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  adapter_id: string;
  layout_version_id: string;
  payroll_run_id: string;
  competence_year: number;
  competence_month: number;
  envelope_xml_uri: string | null;
  envelope_hash: string | null;
  request_size_bytes: number | null;
  status: string;
  validation_errors: AudespValidationError[] | string;
  response_payload: Record<string, unknown> | string;
  response_hash: string | null;
  submitted_at: Date | string | null;
  response_at: Date | string | null;
}

export function toAudespSubmissionDto(
  row: AudespSubmissionRow,
): AudespSubmissionDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    adapterId: row.adapter_id,
    layoutVersionId: row.layout_version_id,
    payrollRunId: row.payroll_run_id,
    competenceYear: row.competence_year,
    competenceMonth: row.competence_month,
    envelopeXmlUri: row.envelope_xml_uri,
    envelopeHash: row.envelope_hash,
    requestSizeBytes: row.request_size_bytes,
    status: row.status,
    validationErrors: parseJson(row.validation_errors, []),
    responsePayload: parseJson(row.response_payload, {}),
    responseHash: row.response_hash,
    submittedAt: dateTimeOrNull(row.submitted_at),
    responseAt: dateTimeOrNull(row.response_at),
  };
}

function parseJson<T>(value: T | string, fallback: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function dateTimeOrNull(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
