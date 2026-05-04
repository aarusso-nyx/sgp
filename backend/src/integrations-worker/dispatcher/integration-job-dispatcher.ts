import type { QueryResultRow } from 'pg';

import type { DatabaseService } from '../../database/database.service';
import type { DocumentsStorageService } from '../../documents/documents-storage.service';
import type { GeneratedArtifact } from '../builders/cnab-remittance.builder';

export interface PendingIntegrationJobRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  definition_code: string;
  parameters: Record<string, unknown> | null;
  payroll_run_id: string | null;
  competence_year: number | null;
  competence_month: number | null;
}

export interface IdRow extends QueryResultRow {
  id: string;
}

export interface IntegrationProcessResult {
  format: string;
  artifact: GeneratedArtifact;
  storageKey: string;
  storageKind: 'S3' | 'LOCAL';
  attachmentId: string;
  checksum: string;
  sizeBytes: number;
  metadata: Record<string, unknown>;
}

export interface IntegrationDispatchContext {
  databaseService: DatabaseService;
  documentsStorageService: DocumentsStorageService;
  persistGeneratedFile(
    reportRequestId: string,
    artifact: GeneratedArtifact,
    storageKind: 'S3' | 'LOCAL',
    storageKey: string,
    sizeBytes: number,
    checksum: string,
  ): Promise<string>;
  persistDocumentResult(
    job: PendingIntegrationJobRow,
    artifact: GeneratedArtifact,
    storageKey: string,
    metadata: Record<string, unknown>,
  ): Promise<IntegrationProcessResult>;
  requireString(
    payload: Record<string, unknown> | null | undefined,
    key: string,
  ): string;
  readString(
    payload: Record<string, unknown> | null | undefined,
    key: string,
  ): string | null;
  toDateString(value: string | Date): string;
}

export interface IntegrationJobDispatcher {
  readonly definitions: readonly string[];
  process(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult>;
}

export const SUPPORTED_DEFINITIONS = [
  'FOLHA_CNAB_REMESSA',
  'FOLHA_CNAB_RETORNO',
  'FOLHA_GFIP_GERAR',
  'AVALIACAO_FICHA_DESEMPENHO',
  'AVALIACAO_RELATORIO_CICLO',
  'PREVIDENCIARIO_CTC',
  'PREVIDENCIARIO_DECLARACAO',
  'PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO',
  'PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS',
  'PREVIDENCIARIO_SIPREV_EXPORT',
  'ESOCIAL_EVENTO_PROCESSAR',
] as const;

export const REPORT_SERVICE_DEFINITIONS = SUPPORTED_DEFINITIONS.filter(
  (definition) => definition !== 'ESOCIAL_EVENTO_PROCESSAR',
);
