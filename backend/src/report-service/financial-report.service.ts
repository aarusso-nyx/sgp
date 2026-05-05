import { Injectable } from '@nestjs/common';

import { buildReportPdf } from './report-artifact.builder';
import { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import { ReportWorkerDataService } from './report-worker-data.service';
import {
  competenceLabel,
  fileName,
  summaryLines,
  table,
} from './report-worker-formatting';
import { ReportJobRow, WorkerResult } from './report-worker.types';

@Injectable()
export class FinancialReportService {
  constructor(
    private readonly data: ReportWorkerDataService,
    private readonly artifacts: ReportWorkerArtifactsService,
  ) {}

  async generate(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.data.loadPayrollSummary(job);
    const byBranch = await this.data.loadFinancialByBranch(job);
    const artifact = buildReportPdf({
      fileName: fileName('f-fol-017-relatorio-financeiro', summary, 'pdf'),
      title: 'F-FOL-017 Relatorio Financeiro',
      subtitle: competenceLabel(summary),
      lines: summaryLines(summary),
      tables: [table('Totais financeiros por filial', byBranch)],
      recordCount: byBranch.length,
    });
    return this.artifacts.persistResult(job, artifact, 'relatorio-financeiro', {
      reportCode: 'F-FOL-017',
      operation: 'report.financeiro.generated',
    });
  }
}
