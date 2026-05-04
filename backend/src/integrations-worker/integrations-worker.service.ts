import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import {
  countRows,
  decideWorkerBackpressure,
  WorkerBackpressureDecision,
} from '../common/observability/worker-backpressure';
import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import { DocumentsStorageService } from '../documents/documents-storage.service';
import { NomeacaoService } from '../recrutamento/nomeacao/nomeacao.service';
import type { GeneratedArtifact } from './builders/cnab-remittance.builder';
import { Cnab240EmitService } from './cnab240/cnab240-emit.service';
import { Cnab240RelayDispatchService } from './cnab240/cnab240-relay-dispatch.service';
import type {
  Cnab240Emitter,
  Cnab240RelayDispatcher,
} from './dispatcher/cnab240.dispatcher';
import { createIntegrationJobDispatchers } from './dispatcher/default-dispatchers';
import {
  IdRow,
  IntegrationDispatchContext,
  IntegrationJobDispatcher,
  IntegrationProcessResult,
  PendingIntegrationJobRow,
  SUPPORTED_DEFINITIONS as DEFAULT_SUPPORTED_DEFINITIONS,
} from './dispatcher/integration-job-dispatcher';

export {
  REPORT_SERVICE_DEFINITIONS,
  SUPPORTED_DEFINITIONS,
} from './dispatcher/integration-job-dispatcher';

type PendingJobRow = PendingIntegrationJobRow;
type ProcessResult = IntegrationProcessResult;

export interface WorkerRunSummary {
  discovered: number;
  processed: number;
  failed: number;
  skipped: number;
}

const WORKER_PERMISSIONS = [
  'folha.read',
  'folha.write',
  'payment.remittance.read',
  'payment.remittance.write',
  'payment.return.read',
  'payment.return.write',
  'hr.bank_account.read',
  'avaliacao.read',
  'previdenciario.read',
  'previdenciario.write',
  'relatorio.read',
  'relatorio.generate',
  'documents.register',
] as const;

@Injectable()
export class IntegrationsWorkerService {
  private readonly logger = new Logger(IntegrationsWorkerService.name);
  private readonly dispatchersByDefinition: Map<
    string,
    IntegrationJobDispatcher
  >;
  private readonly dispatchContext: IntegrationDispatchContext;
  private readonly workerName = 'sgp-integrations-worker';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly documentsStorageService: DocumentsStorageService,
    @Optional()
    private readonly nomeacaoService?: NomeacaoService,
    @Optional()
    @Inject(Cnab240RelayDispatchService)
    cnab240RelayDispatchService?: Cnab240RelayDispatcher,
    @Optional()
    @Inject(Cnab240EmitService)
    cnab240EmitService?: Cnab240Emitter,
  ) {
    const dispatchers = createIntegrationJobDispatchers({
      databaseService,
      cnab240EmitService,
      cnab240RelayDispatchService,
    });
    this.dispatchersByDefinition = new Map(
      dispatchers.flatMap((dispatcher) =>
        dispatcher.definitions.map((definition) => [definition, dispatcher]),
      ),
    );
    this.dispatchContext = {
      databaseService: this.databaseService,
      documentsStorageService: this.documentsStorageService,
      persistGeneratedFile: (...args) => this.persistGeneratedFile(...args),
      persistDocumentResult: (...args) => this.persistDocumentResult(...args),
      requireString: (payload, key) => this.requireString(payload, key),
      readString: (payload, key) => this.readString(payload, key),
      toDateString: (value) => this.toDateString(value),
    };
  }

  async pollOnce(
    limit = 10,
    definitions: readonly string[] = DEFAULT_SUPPORTED_DEFINITIONS,
  ): Promise<WorkerRunSummary> {
    await this.expireNomeacaoDeadlines();
    const jobs = await this.runBypassingRls(() =>
      this.databaseService.query<PendingJobRow>(
        `
        SELECT
          rr.id::text,
          rr.tenant_id::text,
          rd.code AS definition_code,
          rr.parameters,
          rr.payroll_run_id::text,
          rr.competence_year,
          rr.competence_month
        FROM public.report_request rr
        JOIN public.report_definition rd ON rd.id = rr.definition_id
        WHERE rr.status = 'REQUESTED'::"ReportRequestStatus"
          AND rd.code = ANY($1::text[])
        ORDER BY rr.requested_at ASC
        LIMIT $2
        `,
        [definitions, limit],
      ),
    );

    const summary: WorkerRunSummary = {
      discovered: jobs.length,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const job of jobs) {
      const claimed = await this.runWithinTenant(job.tenant_id, () =>
        this.claim(job),
      );
      if (!claimed) {
        summary.skipped += 1;
        continue;
      }

      try {
        const result = await this.runWithinTenant(job.tenant_id, () =>
          this.process(claimed),
        );
        await this.runWithinTenant(job.tenant_id, () =>
          this.complete(claimed.id, claimed.parameters ?? {}, result),
        );
        summary.processed += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unexpected worker failure';
        this.logger.error(
          `failed to process ${claimed.definition_code} request ${claimed.id}: ${message}`,
        );
        await this.runWithinTenant(job.tenant_id, () =>
          this.fail(claimed.id, message),
        );
        summary.failed += 1;
      }
    }

    return summary;
  }

  async backpressureStatus(
    limit = 10,
    definitions: readonly string[] = DEFAULT_SUPPORTED_DEFINITIONS,
  ): Promise<WorkerBackpressureDecision> {
    const requestedLimit = this.normalizeLimit(limit);
    return this.runBypassingRls(async () => {
      const queueDepth = await this.countReportRequests(
        'REQUESTED',
        definitions,
      );
      const activeClaims = await this.countReportRequests(
        'RUNNING',
        definitions,
      );
      return decideWorkerBackpressure(this.workerName, requestedLimit, {
        queueDepth,
        activeClaims,
        capacity: requestedLimit,
      });
    });
  }

  private async expireNomeacaoDeadlines(): Promise<void> {
    if (!this.nomeacaoService) return;
    await this.runBypassingRls(() => this.nomeacaoService!.expireOverdue());
  }

  private countReportRequests(
    status: 'REQUESTED' | 'RUNNING',
    definitions: readonly string[],
  ): Promise<number> {
    return countRows(
      (sql, values) => this.databaseService.query(sql, values),
      `
      SELECT count(*)::text AS total
      FROM public.report_request rr
      JOIN public.report_definition rd ON rd.id = rr.definition_id
      WHERE rr.status = $1::"ReportRequestStatus"
        AND rd.code = ANY($2::text[])
      `,
      [status, definitions],
    );
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1) return 10;
    return Math.min(limit, 100);
  }

  private async claim(job: PendingJobRow): Promise<PendingJobRow | null> {
    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE public.report_request
      SET status = 'RUNNING'::"ReportRequestStatus",
          error_message = NULL
      WHERE id = $1::uuid
        AND status = 'REQUESTED'::"ReportRequestStatus"
      RETURNING id::text
      `,
      [job.id],
    );

    return rows[0] ? job : null;
  }

  private async process(job: PendingJobRow): Promise<ProcessResult> {
    const dispatcher = this.dispatchersByDefinition.get(job.definition_code);
    if (!dispatcher) {
      throw new Error(`Unsupported integrations job: ${job.definition_code}`);
    }
    return dispatcher.process(job, this.dispatchContext);
  }

  private async persistGeneratedFile(
    reportRequestId: string,
    artifact: GeneratedArtifact,
    storageKind: 'S3' | 'LOCAL',
    storageKey: string,
    sizeBytes: number,
    checksum: string,
  ): Promise<string> {
    const storageKindSql =
      storageKind === 'S3'
        ? `'S3'::"DocumentStorageKind"`
        : `'LOCAL'::"DocumentStorageKind"`;

    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO public.document_attachment (
        tenant_id,
        owner_type,
        owner_id,
        storage_kind,
        file_name,
        content_type,
        size_bytes,
        checksum,
        storage_key
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        'report_request',
        $1::uuid,
        ${storageKindSql},
        $2,
        $3,
        $4,
        $5,
        $6
      )
      RETURNING id::text
      `,
      [
        reportRequestId,
        artifact.fileName,
        artifact.contentType,
        sizeBytes,
        checksum,
        storageKey,
      ],
    );
    const attachmentId = rows[0]?.id;
    if (!attachmentId) {
      throw new Error('Unable to persist generated attachment');
    }

    await this.databaseService.query(
      `
      INSERT INTO public.generated_report_file (
        tenant_id,
        report_request_id,
        attachment_id,
        format
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3
      )
      `,
      [reportRequestId, attachmentId, artifact.format],
    );

    return attachmentId;
  }

  private async persistDocumentResult(
    job: PendingJobRow,
    artifact: GeneratedArtifact,
    storageKey: string,
    metadata: Record<string, unknown>,
  ): Promise<ProcessResult> {
    const stored = await this.documentsStorageService.storeGeneratedObject({
      storageKey,
      contentType: artifact.contentType,
      body: artifact.content,
    });
    const attachmentId = await this.persistGeneratedFile(
      job.id,
      artifact,
      stored.storageKind,
      stored.storageKey,
      stored.sizeBytes,
      stored.checksum,
    );

    return {
      format: artifact.format,
      artifact,
      storageKey: stored.storageKey,
      storageKind: stored.storageKind,
      attachmentId,
      checksum: stored.checksum,
      sizeBytes: stored.sizeBytes,
      metadata,
    };
  }

  private async complete(
    reportRequestId: string,
    parameters: Record<string, unknown>,
    result: ProcessResult,
  ): Promise<void> {
    const nextParameters = {
      ...parameters,
      result: {
        status: 'completed',
        format: result.format,
        fileName: result.artifact.fileName,
        storageKind: result.storageKind,
        storageKey: result.storageKey,
        attachmentId: result.attachmentId,
        checksum: result.checksum,
        sizeBytes: result.sizeBytes,
        completedAt: new Date().toISOString(),
        ...result.metadata,
      },
    };

    await this.databaseService.query(
      `
      UPDATE public.report_request
      SET status = 'COMPLETED'::"ReportRequestStatus",
          completed_at = now(),
          error_message = NULL,
          parameters = $2::jsonb
      WHERE id = $1::uuid
      `,
      [reportRequestId, JSON.stringify(nextParameters)],
    );
  }

  private async fail(
    reportRequestId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.databaseService.query(
      `
      UPDATE public.report_request
      SET status = 'FAILED'::"ReportRequestStatus",
          completed_at = now(),
          error_message = $2
      WHERE id = $1::uuid
      `,
      [reportRequestId, errorMessage.slice(0, 1000)],
    );
  }

  private runBypassingRls<T>(fn: () => Promise<T>): Promise<T> {
    return RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'integrations-worker' },
      fn,
    );
  }

  private runWithinTenant<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return RequestContextStore.run(
      {
        tenantId,
        permissions: [...WORKER_PERMISSIONS],
      },
      fn,
    );
  }

  private requireString(
    payload: Record<string, unknown> | null | undefined,
    key: string,
  ): string {
    const value = this.readString(payload, key);
    if (!value) {
      throw new Error(`Missing required worker parameter: ${key}`);
    }
    return value;
  }

  private readString(
    payload: Record<string, unknown> | null | undefined,
    key: string,
  ): string | null {
    const value = payload?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return null;
  }

  private toDateString(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
  }
}
