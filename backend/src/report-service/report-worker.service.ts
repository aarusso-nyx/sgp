import { createHash } from 'node:crypto';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import {
  countRows,
  decideWorkerBackpressure,
  WorkerBackpressureDecision,
} from '../common/observability/worker-backpressure';
import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import { DocumentsStorageService } from '../documents/documents-storage.service';
import {
  buildReportPdf,
  buildReportXlsx,
  ReportArtifact,
  ReportTable,
} from './report-artifact.builder';

interface ReportJobRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  definition_code: string;
  parameters: Record<string, unknown> | null;
  payroll_run_id: string | null;
  branch_id: string | null;
  competence_year: number | null;
  competence_month: number | null;
}

interface PayrollSummaryRow extends QueryResultRow {
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

interface ReportLineRow extends QueryResultRow {
  label: string;
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

interface ReconciliationRow extends QueryResultRow {
  metric: string;
  source_total: string;
  recomputed_total: string;
  difference: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface PersistedReportFile {
  artifact: ReportArtifact;
  storageKind: 'S3' | 'LOCAL';
  storageKey: string;
  attachmentId: string;
  checksum: string;
  sizeBytes: number;
}

interface WorkerResult extends PersistedReportFile {
  files: PersistedReportFile[];
  metadata: Record<string, unknown>;
}

export interface ReportWorkerRunSummary {
  discovered: number;
  processed: number;
  failed: number;
  skipped: number;
}

type ReportWorkerJobOutcome = 'processed' | 'failed';

type CanonicalReportCode =
  | 'F_FOL_013'
  | 'F_FOL_014'
  | 'F_FOL_015'
  | 'F_FOL_016'
  | 'F_FOL_017';

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
] as const;

const WORKER_PERMISSIONS = [
  'folha.read',
  'relatorio.read',
  'relatorio.generate',
  'documents.register',
] as const;

@Injectable()
export class ReportWorkerService {
  private readonly logger = new Logger(ReportWorkerService.name);
  private readonly workerName = 'sgp-report-worker';
  private readonly reportGenerationLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly documentsStorageService: DocumentsStorageService,
  ) {}

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

  private async process(job: ReportJobRow): Promise<WorkerResult> {
    const canonical = this.canonicalCode(job.definition_code);
    switch (canonical) {
      case 'F_FOL_013':
        return this.processPayrollSummary(job);
      case 'F_FOL_014':
        return this.processManagerialPdf(job);
      case 'F_FOL_015':
        return this.processBlockedPaymentsPdf(job);
      case 'F_FOL_016':
        return this.processReconciliationXlsx(job);
      case 'F_FOL_017':
        return this.processFinancialPdf(job);
    }
  }

  private async processPayrollSummary(
    job: ReportJobRow,
  ): Promise<WorkerResult> {
    const summary = await this.loadPayrollSummary(job);
    const byBranch = await this.loadFinancialByBranch(job);
    const reportRows = this.withTotals(summary, byBranch);
    const pdfArtifact = buildReportPdf({
      fileName: this.fileName('f-fol-013-relatorio-folha', summary, 'pdf'),
      title: 'F-FOL-013 Relatorio de Folha de Pagamento',
      subtitle: this.competenceLabel(summary),
      lines: this.summaryLines(summary),
      tables: [this.table('Resumo por filial', reportRows)],
      recordCount: Number(summary.employee_count),
    });
    const xlsxArtifact = buildReportXlsx({
      fileName: this.fileName('f-fol-013-relatorio-folha', summary, 'xlsx'),
      sheets: [this.table('Resumo por filial', reportRows)],
      recordCount: reportRows.length,
    });
    const pdf = await this.persistResult(job, pdfArtifact, 'relatorio-folha', {
      reportCode: 'F-FOL-013',
      operation: 'report.folha_pagamento.generated',
      format: 'PDF',
    });
    const xlsx = await this.persistResult(
      job,
      xlsxArtifact,
      'relatorio-folha',
      {
        reportCode: 'F-FOL-013',
        operation: 'report.folha_pagamento.generated',
        format: 'XLSX',
      },
    );
    return this.combineResults([pdf, xlsx], {
      reportCode: 'F-FOL-013',
      operation: 'report.folha_pagamento.generated',
      formats: ['PDF', 'XLSX'],
    });
  }

  private async processManagerialPdf(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.loadPayrollSummary(job);
    const byStatus = await this.loadFinancialByFunctionalStatus(job);
    const artifact = buildReportPdf({
      fileName: this.fileName('f-fol-014-relatorio-gerencial', summary, 'pdf'),
      title: 'F-FOL-014 Relatorio Gerencial',
      subtitle: this.competenceLabel(summary),
      lines: this.summaryLines(summary),
      tables: [this.table('Resumo por situacao funcional', byStatus)],
      recordCount: byStatus.length,
    });
    return this.persistResult(job, artifact, 'relatorio-gerencial', {
      reportCode: 'F-FOL-014',
      operation: 'report.gerencial.generated',
    });
  }

  private async processBlockedPaymentsPdf(
    job: ReportJobRow,
  ): Promise<WorkerResult> {
    const summary = await this.loadPayrollSummary(job);
    const blocked = await this.loadBlockedPayments(job);
    const artifact = buildReportPdf({
      fileName: this.fileName(
        'f-fol-015-pagamentos-bloqueados',
        summary,
        'pdf',
      ),
      title: 'F-FOL-015 Servidores com Pagamento Bloqueado',
      subtitle: this.competenceLabel(summary),
      lines: [
        ...this.summaryLines(summary),
        `Pagamentos bloqueados: ${blocked.length}`,
      ],
      tables: [this.table('Bloqueios ativos', blocked)],
      recordCount: blocked.length,
    });
    return this.persistResult(job, artifact, 'pagamentos-bloqueados', {
      reportCode: 'F-FOL-015',
      operation: 'report.pagamentos_bloqueados.generated',
    });
  }

  private async processReconciliationXlsx(
    job: ReportJobRow,
  ): Promise<WorkerResult> {
    const summary = await this.loadPayrollSummary(job);
    const reconciliation = await this.loadReconciliation(job);
    const reportRows = reconciliation.map((row) => [
      row.metric,
      row.source_total,
      row.recomputed_total,
      row.difference,
    ]);
    const table: ReportTable = {
      title: 'Batimento',
      columns: ['Metrica', 'Total fonte', 'Total recalculado', 'Diferenca'],
      rows: reportRows,
    };
    const pdfArtifact = buildReportPdf({
      fileName: this.fileName('f-fol-016-batimento-folha', summary, 'pdf'),
      title: 'F-FOL-016 Batimento da Folha',
      subtitle: this.competenceLabel(summary),
      lines: this.summaryLines(summary),
      tables: [table],
      recordCount: reconciliation.length,
    });
    const xlsxArtifact = buildReportXlsx({
      fileName: this.fileName('f-fol-016-batimento-folha', summary, 'xlsx'),
      sheets: [table],
      recordCount: reconciliation.length,
    });
    const pdf = await this.persistResult(job, pdfArtifact, 'batimento-folha', {
      reportCode: 'F-FOL-016',
      operation: 'report.batimento_folha.generated',
      format: 'PDF',
    });
    const xlsx = await this.persistResult(
      job,
      xlsxArtifact,
      'batimento-folha',
      {
        reportCode: 'F-FOL-016',
        operation: 'report.batimento_folha.generated',
        format: 'XLSX',
      },
    );
    return this.combineResults([pdf, xlsx], {
      reportCode: 'F-FOL-016',
      operation: 'report.batimento_folha.generated',
      formats: ['PDF', 'XLSX'],
    });
  }

  private async processFinancialPdf(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.loadPayrollSummary(job);
    const byBranch = await this.loadFinancialByBranch(job);
    const artifact = buildReportPdf({
      fileName: this.fileName('f-fol-017-relatorio-financeiro', summary, 'pdf'),
      title: 'F-FOL-017 Relatorio Financeiro',
      subtitle: this.competenceLabel(summary),
      lines: this.summaryLines(summary),
      tables: [this.table('Totais financeiros por filial', byBranch)],
      recordCount: byBranch.length,
    });
    return this.persistResult(job, artifact, 'relatorio-financeiro', {
      reportCode: 'F-FOL-017',
      operation: 'report.financeiro.generated',
    });
  }

  private async loadPayrollSummary(
    job: ReportJobRow,
  ): Promise<PayrollSummaryRow> {
    const rows = await this.databaseService.query<PayrollSummaryRow>(
      `
      SELECT
        run.id::text AS payroll_run_id,
        run.competence_year,
        run.competence_month,
        branch.name AS branch_name,
        run.status::text AS status,
        run.employee_count::text,
        run.total_earnings::text,
        run.total_deductions::text,
        run.total_net::text
      FROM payroll.payroll_run run
      LEFT JOIN hr.branch branch
        ON branch.id = run.branch_id
       AND branch.tenant_id = run.tenant_id
      WHERE (
          $1::uuid IS NOT NULL
          AND run.id = $1::uuid
        )
        OR (
          $1::uuid IS NULL
          AND run.competence_year = $2::integer
          AND run.competence_month = $3::integer
          AND ($4::uuid IS NULL OR run.branch_id = $4::uuid)
        )
      ORDER BY run.updated_at DESC
      LIMIT 1
      `,
      this.criteriaValues(job),
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Payroll run source not found for report request');
    }
    return row;
  }

  private async loadFinancialByBranch(
    job: ReportJobRow,
  ): Promise<ReportLineRow[]> {
    return this.databaseService.query<ReportLineRow>(
      `
      SELECT
        coalesce(branch.name, 'Sem filial') AS label,
        count(DISTINCT financial.employee_id)::text AS employee_count,
        coalesce(sum(financial.total_earnings), 0)::numeric(16, 2)::text AS total_earnings,
        coalesce(sum(financial.total_deductions), 0)::numeric(16, 2)::text AS total_deductions,
        coalesce(sum(financial.net_amount), 0)::numeric(16, 2)::text AS total_net
      FROM payroll.payroll_financial_record financial
      LEFT JOIN hr.branch branch
        ON branch.id = financial.branch_id
       AND branch.tenant_id = financial.tenant_id
      WHERE (
          $1::uuid IS NOT NULL
          AND financial.payroll_run_id = $1::uuid
        )
        OR (
          $1::uuid IS NULL
          AND financial.competence_year = $2::integer
          AND financial.competence_month = $3::integer
          AND ($4::uuid IS NULL OR financial.branch_id = $4::uuid)
        )
      GROUP BY coalesce(branch.name, 'Sem filial')
      ORDER BY label ASC
      `,
      this.criteriaValues(job),
    );
  }

  private async loadFinancialByFunctionalStatus(
    job: ReportJobRow,
  ): Promise<ReportLineRow[]> {
    return this.databaseService.query<ReportLineRow>(
      `
      SELECT
        coalesce(status.description, 'Sem situacao') AS label,
        count(DISTINCT financial.employee_id)::text AS employee_count,
        coalesce(sum(financial.total_earnings), 0)::numeric(16, 2)::text AS total_earnings,
        coalesce(sum(financial.total_deductions), 0)::numeric(16, 2)::text AS total_deductions,
        coalesce(sum(financial.net_amount), 0)::numeric(16, 2)::text AS total_net
      FROM payroll.payroll_financial_record financial
      LEFT JOIN hr.functional_status status
        ON status.id = financial.functional_status_id
       AND status.tenant_id = financial.tenant_id
      WHERE (
          $1::uuid IS NOT NULL
          AND financial.payroll_run_id = $1::uuid
        )
        OR (
          $1::uuid IS NULL
          AND financial.competence_year = $2::integer
          AND financial.competence_month = $3::integer
          AND ($4::uuid IS NULL OR financial.branch_id = $4::uuid)
        )
      GROUP BY coalesce(status.description, 'Sem situacao')
      ORDER BY label ASC
      `,
      this.criteriaValues(job),
    );
  }

  private async loadBlockedPayments(
    job: ReportJobRow,
  ): Promise<ReportLineRow[]> {
    return this.databaseService.query<ReportLineRow>(
      `
      SELECT
        employee.registration || ' - ' || employee.name AS label,
        '1'::text AS employee_count,
        '0.00'::text AS total_earnings,
        '0.00'::text AS total_deductions,
        '0.00'::text AS total_net
      FROM payroll.blocked_payment blocked
      JOIN hr.employee employee
        ON employee.id = blocked.employee_id
       AND employee.tenant_id = blocked.tenant_id
      WHERE blocked.released_at IS NULL
        AND (
          (
            $1::uuid IS NOT NULL
            AND blocked.payroll_run_id = $1::uuid
          )
          OR (
            $1::uuid IS NULL
            AND blocked.competence_year = $2::integer
            AND blocked.competence_month = $3::integer
            AND ($4::uuid IS NULL OR blocked.branch_id = $4::uuid)
          )
        )
      ORDER BY employee.registration ASC
      LIMIT 200
      `,
      this.criteriaValues(job),
    );
  }

  private async loadReconciliation(
    job: ReportJobRow,
  ): Promise<ReconciliationRow[]> {
    return this.databaseService.query<ReconciliationRow>(
      `
      WITH run AS (
        SELECT
          payroll_run.id,
          payroll_run.competence_year,
          payroll_run.competence_month,
          payroll_run.employee_count::numeric AS employee_count,
          payroll_run.total_earnings,
          payroll_run.total_deductions,
          payroll_run.total_net
        FROM payroll.payroll_run
        WHERE (
            $1::uuid IS NOT NULL
            AND payroll_run.id = $1::uuid
          )
          OR (
            $1::uuid IS NULL
            AND payroll_run.competence_year = $2::integer
            AND payroll_run.competence_month = $3::integer
            AND ($4::uuid IS NULL OR payroll_run.branch_id = $4::uuid)
          )
        ORDER BY payroll_run.updated_at DESC
        LIMIT 1
      ),
      financial AS (
        SELECT
          count(DISTINCT record.employee_id)::numeric AS employee_count,
          coalesce(sum(record.total_earnings), 0)::numeric(16, 2) AS total_earnings,
          coalesce(sum(record.total_deductions), 0)::numeric(16, 2) AS total_deductions,
          coalesce(sum(record.net_amount), 0)::numeric(16, 2) AS total_net
        FROM payroll.payroll_financial_record record
        JOIN run ON run.id = record.payroll_run_id
      ),
      item_totals AS (
        SELECT
          coalesce(sum(item.amount) FILTER (
            WHERE earning.code IN ('INSS', 'RPPS')
              OR earning.incidences @> '{"official_social_security": true}'::jsonb
          ), 0)::numeric(16, 2) AS social_security,
          coalesce(sum(item.amount) FILTER (
            WHERE earning.code = 'IRRF'
              OR earning.incidences @> '{"income_tax": true}'::jsonb
          ), 0)::numeric(16, 2) AS irrf
        FROM payroll.employee_payroll_item item
        JOIN payroll.payroll_earning_deduction earning
          ON earning.id = item.earning_deduction_id
         AND earning.tenant_id = item.tenant_id
        JOIN run ON run.id = item.payroll_run_id
        WHERE item.deleted_at IS NULL
      ),
      esocial_totals AS (
        SELECT
          coalesce(sum(NULLIF(totalizer.payload->>'seguradoContributionTotal', '')::numeric) FILTER (
            WHERE totalizer.kind IN ('S-5001'::esocial.esocial_totalizer_kind, 'S-5011'::esocial.esocial_totalizer_kind)
          ), 0)::numeric(16, 2) AS social_security,
          coalesce(sum(NULLIF(totalizer.payload->>'irrfTotal', '')::numeric) FILTER (
            WHERE totalizer.kind IN ('S-5002'::esocial.esocial_totalizer_kind, 'S-5012'::esocial.esocial_totalizer_kind)
          ), 0)::numeric(16, 2) AS irrf
        FROM run
        LEFT JOIN esocial.esocial_totalizer totalizer
          ON totalizer.competence = make_date(run.competence_year, run.competence_month, 1)
      )
      SELECT metric, source_total::text, recomputed_total::text, difference::text
      FROM (
        VALUES
          ('employee_count', (SELECT employee_count FROM run), (SELECT employee_count FROM financial)),
          ('total_earnings', (SELECT total_earnings FROM run), (SELECT total_earnings FROM financial)),
          ('total_deductions', (SELECT total_deductions FROM run), (SELECT total_deductions FROM financial)),
          ('total_net', (SELECT total_net FROM run), (SELECT total_net FROM financial)),
          ('inss_esocial_s5011', (SELECT social_security FROM item_totals), (SELECT social_security FROM esocial_totals)),
          ('irrf_esocial_s5012_s5002', (SELECT irrf FROM item_totals), (SELECT irrf FROM esocial_totals))
      ) AS rows(metric, source_total, recomputed_total)
      CROSS JOIN LATERAL (
        SELECT (rows.source_total - rows.recomputed_total)::numeric(16, 2) AS difference
      ) diff
      `,
      this.criteriaValues(job),
    );
  }

  private async persistResult(
    job: ReportJobRow,
    artifact: ReportArtifact,
    pathSegment: string,
    metadata: Record<string, unknown>,
  ): Promise<WorkerResult> {
    const checksum = createHash('sha256')
      .update(artifact.content)
      .digest('hex');
    const storageKey = [
      job.tenant_id,
      'outputs',
      'reports',
      pathSegment,
      String(job.competence_year ?? 'unknown'),
      String(job.competence_month ?? 0).padStart(2, '0'),
      job.id,
      artifact.fileName,
    ].join('/');
    const stored = await this.documentsStorageService.storeGeneratedObject({
      storageKey,
      contentType: artifact.contentType,
      body: artifact.content,
    });
    const attachmentId = await this.persistGeneratedFile(
      job,
      artifact,
      stored.storageKind,
      stored.storageKey,
      stored.sizeBytes,
      stored.checksum || checksum,
    );

    return {
      artifact,
      storageKind: stored.storageKind,
      storageKey: stored.storageKey,
      attachmentId,
      checksum: stored.checksum || checksum,
      sizeBytes: stored.sizeBytes,
      files: [
        {
          artifact,
          storageKind: stored.storageKind,
          storageKey: stored.storageKey,
          attachmentId,
          checksum: stored.checksum || checksum,
          sizeBytes: stored.sizeBytes,
        },
      ],
      metadata,
    };
  }

  private async persistGeneratedFile(
    job: ReportJobRow,
    artifact: ReportArtifact,
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
        job.id,
        artifact.fileName,
        artifact.contentType,
        sizeBytes,
        checksum,
        storageKey,
      ],
    );
    const attachmentId = rows[0]?.id;
    if (!attachmentId) throw new Error('Unable to persist report attachment');

    await this.databaseService.query(
      `
      INSERT INTO public.generated_report_file (
        tenant_id,
        report_request_id,
        attachment_id,
        format,
        competence,
        payroll_run_id,
        file_hash
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3,
        CASE
          WHEN $4::integer IS NULL OR $5::integer IS NULL THEN NULL
          ELSE make_date($4::integer, $5::integer, 1)
        END,
        $6::uuid,
        $7
      )
      `,
      [
        job.id,
        attachmentId,
        artifact.format,
        job.competence_year,
        job.competence_month,
        job.payroll_run_id,
        checksum,
      ],
    );

    return attachmentId;
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

  private table(title: string, rows: ReportLineRow[]): ReportTable {
    return {
      title,
      columns: ['Descricao', 'Servidores', 'Proventos', 'Descontos', 'Liquido'],
      rows: rows.map((row) => [
        row.label,
        row.employee_count,
        row.total_earnings,
        row.total_deductions,
        row.total_net,
      ]),
    };
  }

  private summaryLines(row: PayrollSummaryRow): string[] {
    return [
      `Folha: ${row.payroll_run_id ?? 'por competencia'}`,
      `Status: ${row.status}`,
      `Filial: ${row.branch_name ?? 'Todas'}`,
      `Servidores: ${row.employee_count}`,
      `Total proventos: ${row.total_earnings}`,
      `Total descontos: ${row.total_deductions}`,
      `Total liquido: ${row.total_net}`,
    ];
  }

  private withTotals(
    summary: PayrollSummaryRow,
    rows: ReportLineRow[],
  ): ReportLineRow[] {
    return [
      ...rows,
      {
        label: 'Total geral',
        employee_count: summary.employee_count,
        total_earnings: summary.total_earnings,
        total_deductions: summary.total_deductions,
        total_net: summary.total_net,
      },
    ];
  }

  private combineResults(
    results: WorkerResult[],
    metadata: Record<string, unknown>,
  ): WorkerResult {
    const primary = results[0];
    if (!primary) throw new Error('Report worker produced no files');
    return {
      ...primary,
      files: results.flatMap((result) => result.files),
      metadata,
    };
  }

  private criteriaValues(
    job: ReportJobRow,
  ): [string | null, number, number, string | null] {
    const params = job.parameters ?? {};
    const payrollRunId =
      job.payroll_run_id ?? this.readString(params, 'payrollRunId');
    const competenceYear =
      job.competence_year ?? Number(params.competenceYear ?? 0);
    const competenceMonth =
      job.competence_month ?? Number(params.competenceMonth ?? 0);
    const branchId = job.branch_id ?? this.readString(params, 'branchId');
    if (!payrollRunId && (!competenceYear || !competenceMonth)) {
      throw new Error(
        'Report request requires payrollRunId or competenceYear/competenceMonth',
      );
    }
    return [payrollRunId, competenceYear, competenceMonth, branchId];
  }

  private canonicalCode(code: string): CanonicalReportCode {
    const normalized = code.trim().toUpperCase().replace(/-/g, '_');
    if (
      normalized === 'F_FOL_013' ||
      normalized === 'RELATORIO_FOLHA_PAGAMENTO'
    ) {
      return 'F_FOL_013';
    }
    if (normalized === 'F_FOL_014' || normalized === 'FOLHA_GERENCIAL') {
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
    throw new Error(`Unsupported report worker definition: ${code}`);
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
    return [job.tenant_id, this.canonicalCode(job.definition_code)].join(':');
  }

  private fileName(
    prefix: string,
    summary: PayrollSummaryRow,
    extension: 'pdf' | 'xlsx',
  ): string {
    return `${prefix}-${summary.competence_year}-${String(summary.competence_month).padStart(2, '0')}.${extension}`;
  }

  private competenceLabel(summary: PayrollSummaryRow): string {
    return `Competencia ${summary.competence_year}-${String(summary.competence_month).padStart(2, '0')}`;
  }

  private readString(
    parameters: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = parameters[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
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
