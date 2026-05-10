import type { QueryResultRow } from 'pg';

import type { ReportArtifact } from './report-artifact.builder';
import { domainError } from '../common/errors/domain-error';

export interface ReportJobRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  definition_code: string;
  parameters: Record<string, unknown> | null;
  payroll_run_id: string | null;
  branch_id: string | null;
  competence_year: number | null;
  competence_month: number | null;
}

export interface PayrollSummaryRow extends QueryResultRow {
  payroll_run_id: string | null;
  competence_year: number;
  competence_month: number;
  branch_name: string | null;
  status: string;
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export interface ReportLineRow extends QueryResultRow {
  label: string;
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export interface ReconciliationRow extends QueryResultRow {
  metric: string;
  source_total: string;
  recomputed_total: string;
  difference: string;
}

export interface RepasseFundoRhRow extends QueryResultRow {
  fund_source: string;
  rubric_code: string;
  rubric_description: string;
  employee_count: string;
  basis_total: string;
  transfer_total: string;
}

export interface ManadPayrollRow extends QueryResultRow {
  employee_registration: string;
  employee_cpf: string;
  rubric_code: string;
  rubric_description: string;
  entry_kind: string;
  quantity: string;
  reference_value: string;
  amount: string;
}

export interface PerdcompCreditRow extends QueryResultRow {
  rubric_code: string;
  rubric_description: string;
  entry_kind: string;
  category: 'INSS_PATRONAL' | 'INSS_SEGURADO' | 'RAT' | 'OUTROS';
  employee_count: string;
  total_amount: string;
}

export interface IdRow extends QueryResultRow {
  id: string;
}

export interface PersistedReportFile {
  artifact: ReportArtifact;
  storageKind: 'S3' | 'LOCAL';
  storageKey: string;
  attachmentId: string;
  checksum: string;
  sizeBytes: number;
}

export interface WorkerResult extends PersistedReportFile {
  files: PersistedReportFile[];
  metadata: Record<string, unknown>;
}

export interface ReportWorkerRunSummary {
  discovered: number;
  processed: number;
  failed: number;
  skipped: number;
}

export type ReportWorkerJobOutcome = 'processed' | 'failed';

export type CanonicalReportCode =
  | 'F_FOL_013'
  | 'F_FOL_014'
  | 'F_FOL_015'
  | 'F_FOL_016'
  | 'F_FOL_017'
  | 'MANAD_EXPORT'
  | 'PERDCOMP_EXPORT'
  | 'RELATORIO_REPASSE_FUNDO_RH';

export const REPORT_WORKER_DEFINITIONS = [
  'F-FOL-013',
  'F_FOL_013',
  'RELATORIO_FOLHA_PAGAMENTO',
  'F-FOL-014',
  'F_FOL_014',
  'FOLHA_GERENCIAL',
  'RELATORIO_GERENCIAL',
  'F-FOL-015',
  'F_FOL_015',
  'SERVIDOR_PAGAMENTO_BLOQUEADO',
  'RELATORIO_SERV_PAG_BLOQUEADO',
  'F-FOL-016',
  'F_FOL_016',
  'RELATORIO_BATIMENTO_FOLHA',
  'F-FOL-017',
  'F_FOL_017',
  'RELATORIO_FINANCEIRO',
  'M-06',
  'M_06',
  'MANAD',
  'MANAD_EXPORT',
  'M-08',
  'M_08',
  'PERDCOMP',
  'PERDCOMP_EXPORT',
  'RELATORIO_REPASSE_FUNDO_RH',
] as const;

export const WORKER_PERMISSIONS = [
  'folha.read',
  'relatorio.read',
  'relatorio.generate',
  'documents.register',
] as const;

export function canonicalReportCode(code: string): CanonicalReportCode {
  const normalized = code.trim().toUpperCase().replace(/-/g, '_');
  if (
    normalized === 'F_FOL_013' ||
    normalized === 'RELATORIO_FOLHA_PAGAMENTO'
  ) {
    return 'F_FOL_013';
  }
  if (
    normalized === 'F_FOL_014' ||
    normalized === 'FOLHA_GERENCIAL' ||
    normalized === 'RELATORIO_GERENCIAL'
  ) {
    return 'F_FOL_014';
  }
  if (
    normalized === 'F_FOL_015' ||
    normalized === 'SERVIDOR_PAGAMENTO_BLOQUEADO' ||
    normalized === 'RELATORIO_SERV_PAG_BLOQUEADO'
  ) {
    return 'F_FOL_015';
  }
  if (
    normalized === 'F_FOL_016' ||
    normalized === 'RELATORIO_BATIMENTO_FOLHA'
  ) {
    return 'F_FOL_016';
  }
  if (normalized === 'F_FOL_017' || normalized === 'RELATORIO_FINANCEIRO') {
    return 'F_FOL_017';
  }
  if (
    normalized === 'M_06' ||
    normalized === 'MANAD' ||
    normalized === 'MANAD_EXPORT'
  ) {
    return 'MANAD_EXPORT';
  }
  if (
    normalized === 'M_08' ||
    normalized === 'PERDCOMP' ||
    normalized === 'PERDCOMP_EXPORT'
  ) {
    return 'PERDCOMP_EXPORT';
  }
  if (normalized === 'RELATORIO_REPASSE_FUNDO_RH') {
    return 'RELATORIO_REPASSE_FUNDO_RH';
  }
  throw domainError.internal(
    'INTERNAL_INVARIANT',
    `Unsupported report worker definition: ${code}`,
  );
}
