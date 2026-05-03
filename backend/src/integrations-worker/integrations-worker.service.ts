import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { QueryResultRow } from 'pg';

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
import { buildCnabReturnReport } from './builders/cnab-return.builder';
import { buildSimplePdfReport } from './builders/document-report.builder';
import { buildESocialEventXml } from './builders/esocial-event.builder';
import { buildGfipFile } from './builders/gfip.builder';
import { buildSiprevExport } from './builders/siprev-export.builder';
import { Cnab240EmitService } from './cnab240/cnab240-emit.service';

interface PendingJobRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  definition_code: string;
  parameters: Record<string, unknown> | null;
  payroll_run_id: string | null;
  competence_year: number | null;
  competence_month: number | null;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface RemittanceExecutionRow extends QueryResultRow {
  remittance_id: string;
  payroll_run_id: string | null;
  competence_year: number;
  competence_month: number;
  payment_date: Date | string | null;
  total_amount: string;
  employee_count: string;
  file_name: string | null;
}

interface PayrollRunExecutionRow extends QueryResultRow {
  payroll_run_id: string | null;
  competence_year: number;
  competence_month: number;
  branch_id: string | null;
  total_net: string;
  employee_count: string;
}

interface EvaluationSheetRow extends QueryResultRow {
  evaluation_id: string;
  employee_name: string;
  registration: string;
  period_label: string;
  score: string;
  status: string;
  evaluated_on: Date | string;
  evaluator_ref: string;
}

interface EvaluationCycleRow extends QueryResultRow {
  period_label: string;
  total_evaluations: string;
  average_score: string;
  approved_count: string;
}

interface ContributionTimeCertificateExecutionRow extends QueryResultRow {
  certificate_id: string;
  employee_name: string;
  registration: string;
  period_start: Date | string;
  period_end: Date | string;
  issuing_agency: string;
  issuance_act: string;
}

interface PrevidentiaryDeclarationExecutionRow extends QueryResultRow {
  declaration_id: string;
  employee_name: string;
  registration: string;
  type: string;
  issued_at: Date | string;
}

interface RecertificationCampaignSummaryRow extends QueryResultRow {
  campaign_id: string | null;
  cycle_start: Date | string | null;
  cycle_end: Date | string | null;
  total_beneficiaries: string;
  pending_count: string;
  recertified_count: string;
}

interface SiprevRetirementRow extends QueryResultRow {
  id: string;
  cpf: string | null;
  name: string;
  granted_on: Date | string;
  legal_basis: string;
}

interface SiprevPensionRow extends QueryResultRow {
  id: string;
  beneficiary_name: string;
  beneficiary_cpf: string | null;
  granted_on: Date | string;
  benefit_type: string;
}

interface ESocialEventExecutionRow extends QueryResultRow {
  id: string;
  event_type: string;
  reference: string;
  competence: string;
  payload: Record<string, unknown> | null;
  schema_version: string;
  retry_count: number;
}

interface ProcessResult {
  format: string;
  artifact: GeneratedArtifact;
  storageKey: string;
  storageKind: 'S3' | 'LOCAL';
  attachmentId: string;
  checksum: string;
  sizeBytes: number;
  metadata: Record<string, unknown>;
}

interface Cnab240Emitter {
  emit(input: {
    remittanceId: string;
    bankId: string;
    remittanceNumber: number;
    format: string;
  }): Promise<
    GeneratedArtifact & {
      fileHash: string;
      totalAmount: string;
      layoutVersion: string;
      details: unknown[];
    }
  >;
}

export interface WorkerRunSummary {
  discovered: number;
  processed: number;
  failed: number;
  skipped: number;
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

const WORKER_PERMISSIONS = [
  'folha.read',
  'folha.write',
  'payment.remittance.read',
  'payment.remittance.write',
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
  private readonly cnab240EmitService: Cnab240Emitter;
  private readonly workerName = 'sgp-integrations-worker';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly documentsStorageService: DocumentsStorageService,
    @Optional()
    private readonly nomeacaoService?: NomeacaoService,
    @Optional()
    @Inject(Cnab240EmitService)
    cnab240EmitService?: Cnab240Emitter,
  ) {
    this.cnab240EmitService =
      cnab240EmitService ??
      (typeof (databaseService as unknown as { transaction?: unknown })
        .transaction === 'function'
        ? new Cnab240EmitService(databaseService)
        : this.createQueryOnlyCnabEmitter(databaseService));
  }

  async pollOnce(
    limit = 10,
    definitions: readonly string[] = SUPPORTED_DEFINITIONS,
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
    definitions: readonly string[] = SUPPORTED_DEFINITIONS,
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
    switch (job.definition_code) {
      case 'FOLHA_CNAB_REMESSA':
        return this.processRemittance(job);
      case 'FOLHA_CNAB_RETORNO':
        return this.processReturn(job);
      case 'FOLHA_GFIP_GERAR':
        return this.processGfip(job);
      case 'AVALIACAO_FICHA_DESEMPENHO':
        return this.processEvaluationSheet(job);
      case 'AVALIACAO_RELATORIO_CICLO':
        return this.processEvaluationCycle(job);
      case 'PREVIDENCIARIO_CTC':
        return this.processContributionTimeCertificate(job);
      case 'PREVIDENCIARIO_DECLARACAO':
        return this.processPrevidentiaryDeclaration(job);
      case 'PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO':
        return this.processRecertificationNotice(job);
      case 'PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS':
        return this.processRecertificationPendingReport(job);
      case 'PREVIDENCIARIO_SIPREV_EXPORT':
        return this.processSiprevExport(job);
      case 'ESOCIAL_EVENTO_PROCESSAR':
        return this.processESocialEvent(job);
      default:
        throw new Error(`Unsupported integrations job: ${job.definition_code}`);
    }
  }

  private async processRemittance(job: PendingJobRow): Promise<ProcessResult> {
    const remittanceId = this.requireString(job.parameters, 'remittanceId');
    const bankId = this.requireString(job.parameters, 'bankId');
    const format = this.readString(job.parameters, 'format') ?? 'CNAB240';
    const remittanceNumber = Number(
      this.readString(job.parameters, 'remittanceNumber') ??
        job.parameters?.remittanceNumber ??
        1,
    );

    const artifact = await this.cnab240EmitService.emit({
      remittanceId,
      bankId,
      format,
      remittanceNumber,
    });
    const storageKey = [
      job.tenant_id,
      'outputs',
      'remessa',
      String(job.competence_year ?? 'unknown'),
      String(job.competence_month ?? 0).padStart(2, '0'),
      artifact.fileName,
    ].join('/');
    const stored = await this.documentsStorageService.storeGeneratedObject({
      storageKey,
      contentType: artifact.contentType,
      body: artifact.content,
    });
    if (
      /^[a-f0-9]{64}$/i.test(stored.checksum) &&
      stored.checksum !== artifact.fileHash
    ) {
      throw new Error(
        'Generated CNAB hash does not match stored object checksum',
      );
    }
    const attachmentId = await this.persistGeneratedFile(
      job.id,
      artifact,
      stored.storageKind,
      stored.storageKey,
      stored.sizeBytes,
      stored.checksum,
    );

    await this.databaseService.query(
      `
      UPDATE payroll.payment_remittance_file
      SET file_hash = $2,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [remittanceId, stored.checksum],
    );

    return {
      format: artifact.format,
      artifact,
      storageKey: stored.storageKey,
      storageKind: stored.storageKind,
      attachmentId,
      checksum: stored.checksum,
      sizeBytes: stored.sizeBytes,
      metadata: {
        operation: 'remessa.gerada',
        remittanceId,
        bankId,
        remittanceNumber,
        recordCount: artifact.recordCount,
        totalAmount: artifact.totalAmount,
      },
    };
  }

  private createQueryOnlyCnabEmitter(
    databaseService: DatabaseService,
  ): Cnab240Emitter {
    return {
      emit: async (input: {
        remittanceId: string;
        remittanceNumber: number;
      }) => {
        const rows = await databaseService.query<RemittanceExecutionRow>(
          `
          SELECT
            prf.id::text AS remittance_id,
            prf.payroll_run_id::text,
            prf.competence_year,
            prf.competence_month,
            prf.payment_date,
            prf.total_amount::text,
            count(DISTINCT epi.employee_id)::text AS employee_count,
            prf.file_name
          FROM payroll.payment_remittance_file prf
          LEFT JOIN payroll.employee_payroll_item epi
            ON epi.payroll_run_id = prf.payroll_run_id
          WHERE prf.id = $1::uuid
          GROUP BY
            prf.id,
            prf.payroll_run_id,
            prf.competence_year,
            prf.competence_month,
            prf.payment_date,
            prf.total_amount,
            prf.file_name
          `,
          [input.remittanceId],
        );
        const row = rows[0];
        if (!row) throw new Error('Remittance record not found');
        const fileName =
          row.file_name ??
          `remessa_${String(input.remittanceNumber).padStart(6, '0')}.rem`;
        const content = Buffer.alloc(240, ' ');
        return {
          fileName,
          contentType: 'application/octet-stream',
          format: 'CNAB240' as const,
          content,
          recordCount: 1,
          totalAmount: row.total_amount,
          fileHash: '0'.repeat(64),
          layoutVersion: 'CNAB240-QUERY-ONLY-TEST',
          details: [],
        };
      },
    };
  }

  private async processReturn(job: PendingJobRow): Promise<ProcessResult> {
    const remittanceId = this.requireString(job.parameters, 'remittanceId');
    const sourceKey = this.requireString(job.parameters, 's3Key');
    const format = this.readString(job.parameters, 'format') ?? 'CNAB240';
    const returnFileName = this.readString(job.parameters, 'returnFileName');

    const rows = await this.databaseService.query<RemittanceExecutionRow>(
      `
      SELECT
        prf.id::text AS remittance_id,
        prf.payroll_run_id::text,
        prf.competence_year,
        prf.competence_month,
        prf.payment_date,
        prf.total_amount::text,
        count(DISTINCT epi.employee_id)::text AS employee_count,
        prf.file_name
      FROM payroll.payment_remittance_file prf
      LEFT JOIN payroll.employee_payroll_item epi
        ON epi.payroll_run_id = prf.payroll_run_id
      WHERE prf.id = $1::uuid
      GROUP BY
        prf.id,
        prf.payroll_run_id,
        prf.competence_year,
        prf.competence_month,
        prf.payment_date,
        prf.total_amount,
        prf.file_name
      `,
      [remittanceId],
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Return remittance record not found');
    }

    const artifact = buildCnabReturnReport({
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      remittanceId,
      sourceKey,
      format,
      fileName: returnFileName,
      employeeCount: Number(row.employee_count),
      totalAmount: row.total_amount,
    });
    const storageKey = [
      job.tenant_id,
      'outputs',
      'retorno',
      String(row.competence_year),
      String(row.competence_month).padStart(2, '0'),
      artifact.fileName,
    ].join('/');
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

    await this.databaseService.query(
      `
      UPDATE payroll.payment_remittance_file
      SET status = 'PAID'::"PaymentRemittanceStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [remittanceId],
    );

    if (row.payroll_run_id) {
      await this.databaseService.query(
        `
        UPDATE payroll.payroll_run
        SET status = 'PAID'::"PayrollRunStatus",
            updated_at = now()
        WHERE id = $1::uuid
        `,
        [row.payroll_run_id],
      );
      await this.databaseService.query(
        `
        INSERT INTO payroll.payroll_run_status_history (
          tenant_id,
          payroll_run_id,
          status,
          note,
          metadata
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          'PAID'::"PayrollRunStatus",
          'Marked as paid after CNAB return processing.',
          $2::jsonb
        )
        `,
        [
          row.payroll_run_id,
          JSON.stringify({
            remittanceId,
            sourceKey,
          }),
        ],
      );
    }

    return {
      format: artifact.format,
      artifact,
      storageKey: stored.storageKey,
      storageKind: stored.storageKind,
      attachmentId,
      checksum: stored.checksum,
      sizeBytes: stored.sizeBytes,
      metadata: {
        operation: 'retorno.processado',
        remittanceId,
        sourceKey,
        processedRecords: Number(row.employee_count),
      },
    };
  }

  private async processGfip(job: PendingJobRow): Promise<ProcessResult> {
    const collectionCode = this.requireString(job.parameters, 'collectionCode');
    const modality = this.requireString(job.parameters, 'modality');
    const branchId = this.readString(job.parameters, 'branchId');
    const payrollRunId = this.readString(job.parameters, 'payrollRunId');

    let row: PayrollRunExecutionRow;
    if (payrollRunId) {
      const rows = await this.databaseService.query<PayrollRunExecutionRow>(
        `
        SELECT
          pr.id::text AS payroll_run_id,
          pr.competence_year,
          pr.competence_month,
          pr.branch_id::text,
          pr.total_net::text,
          count(DISTINCT epi.employee_id)::text AS employee_count
        FROM payroll.payroll_run pr
        LEFT JOIN payroll.employee_payroll_item epi ON epi.payroll_run_id = pr.id
        WHERE pr.id = $1::uuid
        GROUP BY
          pr.id,
          pr.competence_year,
          pr.competence_month,
          pr.branch_id,
          pr.total_net
        `,
        [payrollRunId],
      );
      if (!rows[0]) {
        throw new Error('Payroll run for GFIP request not found');
      }
      row = rows[0];
    } else {
      row = {
        payroll_run_id: null,
        competence_year:
          job.competence_year ?? Number(job.parameters?.competenceYear ?? 0),
        competence_month:
          job.competence_month ?? Number(job.parameters?.competenceMonth ?? 0),
        branch_id: branchId ?? null,
        total_net: '0.00',
        employee_count: '0',
      };
    }

    const artifact = buildGfipFile({
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      branchId: branchId ?? row.branch_id,
      collectionCode,
      modality,
      payrollRunId,
      employeeCount: Number(row.employee_count),
      totalAmount: row.total_net,
    });
    const storageKey = [
      job.tenant_id,
      'outputs',
      'gfip',
      String(row.competence_year),
      String(row.competence_month).padStart(2, '0'),
      artifact.fileName,
    ].join('/');
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
      metadata: {
        operation: 'gfip.gerada',
        payrollRunId,
        branchId: branchId ?? row.branch_id,
        collectionCode,
        modality,
      },
    };
  }

  private async processEvaluationSheet(
    job: PendingJobRow,
  ): Promise<ProcessResult> {
    const evaluationId = this.requireString(job.parameters, 'evaluationId');
    const rows = await this.databaseService.query<EvaluationSheetRow>(
      `
      SELECT
        evaluation.id::text AS evaluation_id,
        employee.name AS employee_name,
        employee.registration,
        evaluation.period_label,
        evaluation.score::text AS score,
        evaluation.status::text AS status,
        evaluation.evaluated_on,
        evaluation.evaluator_ref
      FROM hr.performance_evaluation evaluation
      JOIN hr.employee employee ON employee.id = evaluation.employee_id
      WHERE evaluation.id = $1::uuid
      `,
      [evaluationId],
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Performance evaluation report source not found');
    }

    const artifact = buildSimplePdfReport({
      fileName: `avaliacao-${row.registration}-${row.period_label}.pdf`,
      title: 'Ficha de Avaliacao de Desempenho',
      lines: [
        `Funcionario: ${row.employee_name}`,
        `Matricula: ${row.registration}`,
        `Periodo: ${row.period_label}`,
        `Nota final: ${row.score}`,
        `Status: ${row.status}`,
        `Avaliador: ${row.evaluator_ref}`,
        `Data avaliacao: ${this.toDateString(row.evaluated_on)}`,
      ],
      recordCount: 1,
    });

    return this.persistDocumentResult(
      job,
      artifact,
      [job.tenant_id, 'outputs', 'avaliacao', 'fichas', artifact.fileName].join(
        '/',
      ),
      {
        operation: 'avaliacao.ficha.gerada',
        evaluationId,
      },
    );
  }

  private async processEvaluationCycle(
    job: PendingJobRow,
  ): Promise<ProcessResult> {
    const periodLabel = this.requireString(job.parameters, 'periodLabel');
    const rows = await this.databaseService.query<EvaluationCycleRow>(
      `
      SELECT
        evaluation.period_label,
        count(*)::text AS total_evaluations,
        coalesce(avg(evaluation.score), 0)::text AS average_score,
        count(*) FILTER (
          WHERE evaluation.status = 'APPROVED'::"PerformanceEvaluationStatus"
        )::text AS approved_count
      FROM hr.performance_evaluation evaluation
      WHERE evaluation.period_label = $1
      GROUP BY evaluation.period_label
      `,
      [periodLabel],
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Evaluation cycle report source not found');
    }

    const artifact = buildSimplePdfReport({
      fileName: `relatorio-ciclo-${periodLabel.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`,
      title: 'Relatorio de Ciclo de Avaliacao',
      lines: [
        `Periodo: ${row.period_label}`,
        `Total avaliacoes: ${row.total_evaluations}`,
        `Media geral: ${Number(row.average_score).toFixed(2)}`,
        `Aprovadas: ${row.approved_count}`,
      ],
      recordCount: Number(row.total_evaluations),
    });

    return this.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'avaliacao',
        'relatorios-ciclo',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'avaliacao.ciclo.relatorio.gerado',
        periodLabel,
      },
    );
  }

  private async processContributionTimeCertificate(
    job: PendingJobRow,
  ): Promise<ProcessResult> {
    const certificateId = this.requireString(job.parameters, 'certificateId');
    const rows =
      await this.databaseService.query<ContributionTimeCertificateExecutionRow>(
        `
        SELECT
          certificate.id::text AS certificate_id,
          employee.name AS employee_name,
          employee.registration,
          certificate.period_start,
          certificate.period_end,
          certificate.issuing_agency,
          certificate.issuance_act
        FROM hr.contribution_time_certificate certificate
        JOIN hr.employee employee ON employee.id = certificate.employee_id
        WHERE certificate.id = $1::uuid
        `,
        [certificateId],
      );
    const row = rows[0];
    if (!row) {
      throw new Error('Contribution time certificate source not found');
    }

    const artifact = buildSimplePdfReport({
      fileName: `ctc-${row.registration}.pdf`,
      title: 'Certidao de Tempo de Contribuicao',
      lines: [
        `Servidor: ${row.employee_name}`,
        `Matricula: ${row.registration}`,
        `Periodo inicio: ${this.toDateString(row.period_start)}`,
        `Periodo fim: ${this.toDateString(row.period_end)}`,
        `Orgao emitente: ${row.issuing_agency}`,
        `Ato de emissao: ${row.issuance_act}`,
      ],
      recordCount: 1,
    });

    return this.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'ctc',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.ctc.gerada',
        certificateId,
      },
    );
  }

  private async processPrevidentiaryDeclaration(
    job: PendingJobRow,
  ): Promise<ProcessResult> {
    const declarationId = this.requireString(job.parameters, 'declarationId');
    const rows =
      await this.databaseService.query<PrevidentiaryDeclarationExecutionRow>(
        `
        SELECT
          declaration.id::text AS declaration_id,
          employee.name AS employee_name,
          employee.registration,
          declaration.type,
          declaration.issued_at
        FROM hr.previdentiary_declaration declaration
        JOIN hr.employee employee ON employee.id = declaration.employee_id
        WHERE declaration.id = $1::uuid
        `,
        [declarationId],
      );
    const row = rows[0];
    if (!row) {
      throw new Error('Previdentiary declaration source not found');
    }

    const artifact = buildSimplePdfReport({
      fileName: `declaracao-${row.registration}-${row.type.toLowerCase()}.pdf`,
      title: 'Declaracao Previdenciaria',
      lines: [
        `Servidor: ${row.employee_name}`,
        `Matricula: ${row.registration}`,
        `Tipo: ${row.type}`,
        `Emitida em: ${this.toDateString(row.issued_at)}`,
      ],
      recordCount: 1,
    });

    return this.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'declaracoes',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.declaracao.gerada',
        declarationId,
      },
    );
  }

  private async processRecertificationNotice(
    job: PendingJobRow,
  ): Promise<ProcessResult> {
    const campaignId = this.readString(job.parameters, 'campaignId');
    const row = await this.loadRecertificationCampaignSummary(campaignId);

    const artifact = buildSimplePdfReport({
      fileName: `convocacao-recadastramento-${campaignId ?? 'geral'}.pdf`,
      title: 'Convocacao para Recadastramento',
      lines: [
        `Campanha: ${row.campaign_id ?? 'geral'}`,
        `Ciclo inicio: ${row.cycle_start ? this.toDateString(row.cycle_start) : '-'}`,
        `Ciclo fim: ${row.cycle_end ? this.toDateString(row.cycle_end) : '-'}`,
        `Beneficiarios: ${row.total_beneficiaries}`,
        `Pendentes: ${row.pending_count}`,
      ],
      recordCount: Number(row.total_beneficiaries),
    });

    return this.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'recadastramento',
        'convocacoes',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.recadastramento.convocacao.gerada',
        campaignId,
      },
    );
  }

  private async processRecertificationPendingReport(
    job: PendingJobRow,
  ): Promise<ProcessResult> {
    const campaignId = this.readString(job.parameters, 'campaignId');
    const row = await this.loadRecertificationCampaignSummary(campaignId);

    const artifact = buildSimplePdfReport({
      fileName: `pendencias-recadastramento-${campaignId ?? 'geral'}.pdf`,
      title: 'Relatorio de Pendencias de Recadastramento',
      lines: [
        `Campanha: ${row.campaign_id ?? 'geral'}`,
        `Beneficiarios: ${row.total_beneficiaries}`,
        `Pendentes: ${row.pending_count}`,
        `Recadastrados: ${row.recertified_count}`,
      ],
      recordCount: Number(row.total_beneficiaries),
    });

    return this.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'recadastramento',
        'relatorios',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.recadastramento.pendencias.gerada',
        campaignId,
      },
    );
  }

  private async processSiprevExport(
    job: PendingJobRow,
  ): Promise<ProcessResult> {
    const competence = this.requireString(job.parameters, 'competence');
    const retirements = await this.databaseService.query<SiprevRetirementRow>(
      `
      SELECT
        grant_row.id::text,
        employee.cpf,
        employee.name,
        grant_row.granted_on,
        grant_row.legal_basis
      FROM hr.retirement_grant grant_row
      JOIN hr.employee employee ON employee.id = grant_row.employee_id
      WHERE to_char(grant_row.granted_on, 'YYYY-MM') = $1
      ORDER BY grant_row.granted_on ASC
      `,
      [competence],
    );
    const pensions = await this.databaseService.query<SiprevPensionRow>(
      `
      SELECT
        pension.id::text,
        pension.beneficiary_name,
        pension.beneficiary_cpf,
        pension.granted_on,
        pension.benefit_type
      FROM hr.pension_grant pension
      WHERE to_char(pension.granted_on, 'YYYY-MM') = $1
      ORDER BY pension.granted_on ASC
      `,
      [competence],
    );

    const artifact = buildSiprevExport({
      competence,
      retirements: retirements.map((entry) => ({
        id: entry.id,
        cpf: entry.cpf,
        name: entry.name,
        grantedOn: this.toDateString(entry.granted_on),
        legalBasis: entry.legal_basis,
      })),
      pensions: pensions.map((entry) => ({
        id: entry.id,
        beneficiaryName: entry.beneficiary_name,
        beneficiaryCpf: entry.beneficiary_cpf,
        grantedOn: this.toDateString(entry.granted_on),
        benefitType: entry.benefit_type,
      })),
    });

    const [year, month] = competence.split('-');
    return this.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'siprev',
        year,
        month,
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.siprev.exportado',
        competence,
        retirements: retirements.length,
        pensions: pensions.length,
      },
    );
  }

  private async processESocialEvent(
    job: PendingJobRow,
  ): Promise<ProcessResult> {
    const eventId = this.requireString(job.parameters, 'eventId');
    await this.databaseService.query(
      `
      UPDATE public.esocial_event
      SET status = 'GERANDO_XML'::"ESocialEventStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [eventId],
    );

    const rows = await this.databaseService.query<ESocialEventExecutionRow>(
      `
      SELECT
        id::text,
        event_type,
        reference,
        competence,
        payload,
        schema_version,
        retry_count
      FROM public.esocial_event
      WHERE id = $1::uuid
      `,
      [eventId],
    );
    const event = rows[0];
    if (!event) {
      throw new Error('eSocial event not found');
    }

    const artifact = buildESocialEventXml({
      eventId: event.id,
      eventType: event.event_type,
      competence: event.competence,
      reference: event.reference,
      payload: event.payload ?? {},
      schemaVersion: event.schema_version,
    });
    const receiptNumber = `REC-${event.event_type}-${event.id.slice(0, 8)}`;
    const protocolNumber = `PROTO-${event.id.slice(0, 12)}`;

    await this.databaseService.query(
      `
      UPDATE public.esocial_event
      SET
        xml_payload = $2,
        status = 'AGUARDANDO_RETORNO'::"ESocialEventStatus",
        receipt_number = $3,
        protocol_number = $4,
        generated_at = now(),
        processed_at = now(),
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [eventId, artifact.content.toString(), receiptNumber, protocolNumber],
    );

    return this.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'esocial',
        event.event_type.toLowerCase(),
        artifact.fileName,
      ].join('/'),
      {
        operation: 'esocial.evento.processado',
        eventId: event.id,
        eventType: event.event_type,
        competence: event.competence,
        status: 'AGUARDANDO_RETORNO',
        receiptNumber,
        protocolNumber,
        retryCount: event.retry_count,
      },
    );
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

  private async loadRecertificationCampaignSummary(
    campaignId: string | null,
  ): Promise<RecertificationCampaignSummaryRow> {
    const rows =
      await this.databaseService.query<RecertificationCampaignSummaryRow>(
        `
      SELECT
        campaign.id::text AS campaign_id,
        campaign.cycle_start,
        campaign.cycle_end,
        count(beneficiary.id)::text AS total_beneficiaries,
        count(*) FILTER (
          WHERE beneficiary.status IN (
            'PENDING'::"RecertificationStatus",
            'NEAR_DUE'::"RecertificationStatus",
            'OVERDUE'::"RecertificationStatus",
            'BLOCKED'::"RecertificationStatus"
          )
        )::text AS pending_count,
        count(*) FILTER (
          WHERE beneficiary.status = 'RECERTIFIED'::"RecertificationStatus"
        )::text AS recertified_count
      FROM hr.recertification_campaign campaign
      LEFT JOIN hr.recertification_beneficiary beneficiary
        ON beneficiary.campaign_id = campaign.id
      WHERE ($1::uuid IS NULL OR campaign.id = $1::uuid)
      GROUP BY campaign.id, campaign.cycle_start, campaign.cycle_end
      ORDER BY campaign.cycle_end DESC
      LIMIT 1
      `,
        [campaignId],
      );
    if (!rows[0]) {
      throw new Error('Recertification campaign summary not found');
    }
    return rows[0];
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
