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
export class ManagerialReportService {
  constructor(
    private readonly data: ReportWorkerDataService,
    private readonly artifacts: ReportWorkerArtifactsService,
  ) {}

  async generate(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.data.loadPayrollSummary(job);
    const byStatus = await this.data.loadFinancialByFunctionalStatus(job);
    const artifact = buildReportPdf({
      fileName: fileName('f-fol-014-relatorio-gerencial', summary, 'pdf'),
      title: 'F-FOL-014 Relatorio Gerencial',
      subtitle: competenceLabel(summary),
      lines: summaryLines(summary),
      tables: [table('Resumo por situacao funcional', byStatus)],
      recordCount: byStatus.length,
    });
    return this.artifacts.persistResult(job, artifact, 'relatorio-gerencial', {
      reportCode: 'F-FOL-014',
      operation: 'report.gerencial.generated',
    });
  }
}
