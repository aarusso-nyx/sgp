import { Injectable } from '@nestjs/common';

import {
  buildReportPdf,
  buildReportXlsx,
  ReportTable,
} from './report-artifact.builder';
import { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import { ReportWorkerDataService } from './report-worker-data.service';
import {
  competenceLabel,
  fileName,
  summaryLines,
} from './report-worker-formatting';
import { ReportJobRow, WorkerResult } from './report-worker.types';

@Injectable()
export class ReconciliationReportService {
  constructor(
    private readonly data: ReportWorkerDataService,
    private readonly artifacts: ReportWorkerArtifactsService,
  ) {}

  async generate(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.data.loadPayrollSummary(job);
    const reconciliation = await this.data.loadReconciliation(job);
    const reportRows = reconciliation.map((row) => [
      row.metric,
      row.source_total,
      row.recomputed_total,
      row.difference,
    ]);
    const reportTable: ReportTable = {
      title: 'Batimento',
      columns: ['Metrica', 'Total fonte', 'Total recalculado', 'Diferenca'],
      rows: reportRows,
    };
    const pdfArtifact = buildReportPdf({
      fileName: fileName('f-fol-016-batimento-folha', summary, 'pdf'),
      title: 'F-FOL-016 Batimento da Folha',
      subtitle: competenceLabel(summary),
      lines: summaryLines(summary),
      tables: [reportTable],
      recordCount: reconciliation.length,
    });
    const xlsxArtifact = buildReportXlsx({
      fileName: fileName('f-fol-016-batimento-folha', summary, 'xlsx'),
      sheets: [reportTable],
      recordCount: reconciliation.length,
    });
    const pdf = await this.artifacts.persistResult(
      job,
      pdfArtifact,
      'batimento-folha',
      {
        reportCode: 'F-FOL-016',
        operation: 'report.batimento_folha.generated',
        format: 'PDF',
      },
    );
    const xlsx = await this.artifacts.persistResult(
      job,
      xlsxArtifact,
      'batimento-folha',
      {
        reportCode: 'F-FOL-016',
        operation: 'report.batimento_folha.generated',
        format: 'XLSX',
      },
    );
    return this.artifacts.combineResults([pdf, xlsx], {
      reportCode: 'F-FOL-016',
      operation: 'report.batimento_folha.generated',
      formats: ['PDF', 'XLSX'],
    });
  }
}
