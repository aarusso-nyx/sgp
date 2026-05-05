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
export class BlockedPaymentsReportService {
  constructor(
    private readonly data: ReportWorkerDataService,
    private readonly artifacts: ReportWorkerArtifactsService,
  ) {}

  async generate(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.data.loadPayrollSummary(job);
    const blocked = await this.data.loadBlockedPayments(job);
    const artifact = buildReportPdf({
      fileName: fileName('f-fol-015-pagamentos-bloqueados', summary, 'pdf'),
      title: 'F-FOL-015 Servidores com Pagamento Bloqueado',
      subtitle: competenceLabel(summary),
      lines: [
        ...summaryLines(summary),
        `Pagamentos bloqueados: ${blocked.length}`,
      ],
      tables: [table('Bloqueios ativos', blocked)],
      recordCount: blocked.length,
    });
    return this.artifacts.persistResult(
      job,
      artifact,
      'pagamentos-bloqueados',
      {
        reportCode: 'F-FOL-015',
        operation: 'report.pagamentos_bloqueados.generated',
      },
    );
  }
}
