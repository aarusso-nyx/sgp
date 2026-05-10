import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  countRows,
  decideWorkerBackpressure,
  WorkerBackpressureDecision,
} from '../common/observability/worker-backpressure';
import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import { DocumentsStorageService } from '../documents/documents-storage.service';
import { BlockedPaymentsReportService } from './blocked-payments-report.service';
import { FinancialReportService } from './financial-report.service';
import { ManagerialReportService } from './managerial-report.service';
import { ManadExportReportService } from './manad-export-report.service';
import { PerdcompExportReportService } from './perdcomp-export-report.service';
import { PayrollSummaryReportService } from './payroll-summary-report.service';
import { ReconciliationReportService } from './reconciliation-report.service';
import { RepasseFundoRhReportService } from './repasse-fundo-rh-report.service';
import { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import { ReportWorkerDataService } from './report-worker-data.service';
import {
  canonicalReportCode,
  REPORT_WORKER_DEFINITIONS,
  ReportJobRow,
  ReportWorkerJobOutcome,
  ReportWorkerRunSummary,
  WorkerResult,
  WORKER_PERMISSIONS,
} from './report-worker.types';
import { domainError } from '../common/errors/domain-error';

export { REPORT_WORKER_DEFINITIONS } from './report-worker.types';
export type { ReportWorkerRunSummary } from './report-worker.types';

@Injectable()
export class ReportWorkerService {
  private readonly logger = new Logger(ReportWorkerService.name);
  private readonly workerName = 'sgp-report-worker';
  private readonly reportGenerationLocks = new Map<string, Promise<void>>();
  private readonly payrollSummaryReports: PayrollSummaryReportService;
  private readonly managerialReports: ManagerialReportService;
  private readonly blockedPaymentsReports: BlockedPaymentsReportService;
  private readonly reconciliationReports: ReconciliationReportService;
  private readonly financialReports: FinancialReportService;
  private readonly manadExports: ManadExportReportService;
  private readonly perdcompExports: PerdcompExportReportService;
  private readonly repasseFundoRhReports: RepasseFundoRhReportService;

  constructor(
    private readonly databaseService: DatabaseService,
    documentsStorageService: DocumentsStorageService,
    @Optional()
    payrollSummaryReports?: PayrollSummaryReportService,
    @Optional()
    managerialReports?: ManagerialReportService,
    @Optional()
    blockedPaymentsReports?: BlockedPaymentsReportService,
    @Optional()
    reconciliationReports?: ReconciliationReportService,
    @Optional()
    financialReports?: FinancialReportService,
    @Optional()
    manadExports?: ManadExportReportService,
    @Optional()
    perdcompExports?: PerdcompExportReportService,
    @Optional()
    repasseFundoRhReports?: RepasseFundoRhReportService,
  ) {
    const fallback = createFallbackReportServices(
      databaseService,
      documentsStorageService,
    );
    this.payrollSummaryReports =
      payrollSummaryReports ?? fallback.payrollSummaryReports;
    this.managerialReports = managerialReports ?? fallback.managerialReports;
    this.blockedPaymentsReports =
      blockedPaymentsReports ?? fallback.blockedPaymentsReports;
    this.reconciliationReports =
      reconciliationReports ?? fallback.reconciliationReports;
    this.financialReports = financialReports ?? fallback.financialReports;
    this.manadExports = manadExports ?? fallback.manadExports;
    this.perdcompExports = perdcompExports ?? fallback.perdcompExports;
    this.repasseFundoRhReports =
      repasseFundoRhReports ?? fallback.repasseFundoRhReports;
  }

  async pollOnce(limit = 10): Promise<ReportWorkerRunSummary> {
    this.ensureDatabase();
    const jobs = await this.runBypassingRls(() => this.claimJobs(limit));
    const summary: ReportWorkerRunSummary = {
      discovered: jobs.length,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const job of jobs) {
      const outcome = await this.processClaimedJob(job);
      if (outcome === 'processed') {
        summary.processed += 1;
      } else {
        summary.failed += 1;
      }
    }

    return summary;
  }

  private async processClaimedJob(
    job: ReportJobRow,
  ): Promise<ReportWorkerJobOutcome> {
    try {
      await this.runWithReportIsolation(job, async () => {
        const result = await this.runWithinTenant(job.tenant_id, () =>
          this.process(job),
        );
        await this.runWithinTenant(job.tenant_id, () =>
          this.complete(job, result),
        );
      });
      return 'processed';
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected report failure';
      this.logger.error(
        `failed to process ${job.definition_code} request ${job.id}: ${message}`,
      );
      await this.runWithinTenant(job.tenant_id, () =>
        this.fail(job.id, message),
      );
      return 'failed';
    }
  }

  async backpressureStatus(limit = 10): Promise<WorkerBackpressureDecision> {
    this.ensureDatabase();
    const requestedLimit = this.normalizeLimit(limit);
    return this.runBypassingRls(async () => {
      const queueDepth = await this.countReportRequests('REQUESTED');
      const activeClaims = await this.countReportRequests('RUNNING');
      return decideWorkerBackpressure(this.workerName, requestedLimit, {
        queueDepth,
        activeClaims,
        capacity: requestedLimit,
      });
    });
  }

  private async claimJobs(limit: number): Promise<ReportJobRow[]> {
    return this.databaseService.query<ReportJobRow>(
      `
      WITH claimed AS (
        SELECT
          rr.id,
          rr.tenant_id,
          rd.code AS definition_code,
          rr.parameters,
          rr.payroll_run_id,
          rr.branch_id,
          rr.competence_year,
          rr.competence_month
        FROM public.report_request rr
        JOIN public.report_definition rd ON rd.id = rr.definition_id
        WHERE rr.status = 'REQUESTED'::"ReportRequestStatus"
          AND rd.code = ANY($1::text[])
        ORDER BY rr.requested_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $2
      )
      UPDATE public.report_request rr
      SET status = 'RUNNING'::"ReportRequestStatus",
          error_message = NULL
      FROM claimed
      WHERE rr.id = claimed.id
      RETURNING
        rr.id::text,
        rr.tenant_id::text,
        claimed.definition_code,
        rr.parameters,
        rr.payroll_run_id::text,
        rr.branch_id::text,
        rr.competence_year,
        rr.competence_month
      `,
      [REPORT_WORKER_DEFINITIONS, this.normalizeLimit(limit)],
    );
  }

  private countReportRequests(
    status: 'REQUESTED' | 'RUNNING',
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
      [status, REPORT_WORKER_DEFINITIONS],
    );
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1) return 10;
    return Math.min(limit, 100);
  }

  private process(job: ReportJobRow): Promise<WorkerResult> {
    const canonical = canonicalReportCode(job.definition_code);
    switch (canonical) {
      case 'F_FOL_013':
        return this.payrollSummaryReports.generate(job);
      case 'F_FOL_014':
        return this.managerialReports.generate(job);
      case 'F_FOL_015':
        return this.blockedPaymentsReports.generate(job);
      case 'F_FOL_016':
        return this.reconciliationReports.generate(job);
      case 'F_FOL_017':
        return this.financialReports.generate(job);
      case 'MANAD_EXPORT':
        return this.manadExports.generate(job);
      case 'PERDCOMP_EXPORT':
        return this.perdcompExports.generate(job);
      case 'RELATORIO_REPASSE_FUNDO_RH':
        return this.repasseFundoRhReports.generate(job);
      default:
        return assertNever(canonical);
    }
  }

  private async complete(
    job: ReportJobRow,
    result: WorkerResult,
  ): Promise<void> {
    const nextParameters = {
      ...(job.parameters ?? {}),
      result: {
        status: 'completed',
        format: result.artifact.format,
        fileName: result.artifact.fileName,
        storageKind: result.storageKind,
        storageKey: result.storageKey,
        attachmentId: result.attachmentId,
        checksum: result.checksum,
        sizeBytes: result.sizeBytes,
        files: result.files.map((file) => ({
          format: file.artifact.format,
          fileName: file.artifact.fileName,
          storageKind: file.storageKind,
          storageKey: file.storageKey,
          attachmentId: file.attachmentId,
          checksum: file.checksum,
          sizeBytes: file.sizeBytes,
        })),
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
      [job.id, JSON.stringify(nextParameters)],
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

  private async runWithReportIsolation<T>(
    job: ReportJobRow,
    fn: () => Promise<T>,
  ): Promise<T> {
    const key = this.reportGenerationLockKey(job);
    let releaseLock!: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const previousLock = this.reportGenerationLocks.get(key);
    this.reportGenerationLocks.set(key, currentLock);

    if (previousLock) {
      await previousLock;
    }

    try {
      return await fn();
    } finally {
      releaseLock();
      if (this.reportGenerationLocks.get(key) === currentLock) {
        this.reportGenerationLocks.delete(key);
      }
    }
  }

  private reportGenerationLockKey(job: ReportJobRow): string {
    return [job.tenant_id, canonicalReportCode(job.definition_code)].join(':');
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for report worker operations',
      );
    }
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

  private runBypassingRls<T>(fn: () => Promise<T>): Promise<T> {
    return RequestContextStore.run(
      {
        bypassRls: true,
        bypassRlsReason: 'report-worker',
      },
      fn,
    );
  }
}

function createFallbackReportServices(
  databaseService: DatabaseService,
  documentsStorageService: DocumentsStorageService,
) {
  const data = new ReportWorkerDataService(databaseService);
  const artifacts = new ReportWorkerArtifactsService(
    databaseService,
    documentsStorageService,
  );
  return {
    payrollSummaryReports: new PayrollSummaryReportService(data, artifacts),
    managerialReports: new ManagerialReportService(data, artifacts),
    blockedPaymentsReports: new BlockedPaymentsReportService(data, artifacts),
    reconciliationReports: new ReconciliationReportService(data, artifacts),
    financialReports: new FinancialReportService(data, artifacts),
    manadExports: new ManadExportReportService(data, artifacts),
    perdcompExports: new PerdcompExportReportService(data, artifacts),
    repasseFundoRhReports: new RepasseFundoRhReportService(data, artifacts),
  };
}

function assertNever(value: never): never {
  void value;
  throw domainError.internal(
    'INTERNAL_INVARIANT',
    'Unsupported report worker definition',
  );
}
