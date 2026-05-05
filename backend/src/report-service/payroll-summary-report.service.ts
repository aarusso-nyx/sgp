import { Injectable } from '@nestjs/common';

import { buildReportPdf, buildReportXlsx } from './report-artifact.builder';
import { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import { ReportWorkerDataService } from './report-worker-data.service';
import {
  competenceLabel,
  fileName,
  summaryLines,
  table,
  withTotals,
} from './report-worker-formatting';
import { ReportJobRow, WorkerResult } from './report-worker.types';

@Injectable()
export class PayrollSummaryReportService {
  constructor(
    private readonly data: ReportWorkerDataService,
    private readonly artifacts: ReportWorkerArtifactsService,
  ) {}

  async generate(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.data.loadPayrollSummary(job);
    const byBranch = await this.data.loadFinancialByBranch(job);
    const reportRows = withTotals(summary, byBranch);
    const pdfArtifact = buildReportPdf({
      fileName: fileName('f-fol-013-relatorio-folha', summary, 'pdf'),
      title: 'F-FOL-013 Relatorio de Folha de Pagamento',
      subtitle: competenceLabel(summary),
      lines: summaryLines(summary),
      tables: [table('Resumo por filial', reportRows)],
      recordCount: Number(summary.employee_count),
    });
    const xlsxArtifact = buildReportXlsx({
      fileName: fileName('f-fol-013-relatorio-folha', summary, 'xlsx'),
      sheets: [table('Resumo por filial', reportRows)],
      recordCount: reportRows.length,
    });
    const pdf = await this.artifacts.persistResult(
      job,
      pdfArtifact,
      'relatorio-folha',
      {
        reportCode: 'F-FOL-013',
        operation: 'report.folha_pagamento.generated',
        format: 'PDF',
      },
    );
    const xlsx = await this.artifacts.persistResult(
      job,
      xlsxArtifact,
      'relatorio-folha',
      {
        reportCode: 'F-FOL-013',
        operation: 'report.folha_pagamento.generated',
        format: 'XLSX',
      },
    );
    return this.artifacts.combineResults([pdf, xlsx], {
      reportCode: 'F-FOL-013',
      operation: 'report.folha_pagamento.generated',
      formats: ['PDF', 'XLSX'],
    });
  }
}
