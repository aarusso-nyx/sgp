import type { ReportArtifact } from './report-artifact.builder';
import { ReconciliationReportService } from './reconciliation-report.service';
import type { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import type { ReportWorkerDataService } from './report-worker-data.service';
import type {
  PayrollSummaryRow,
  ReconciliationRow,
  ReportJobRow,
  WorkerResult,
} from './report-worker.types';

describe('ReconciliationReportService', () => {
  it('generates F-FOL-016 PDF and XLSX artifacts through its public surface', async () => {
    const persistResult = jest.fn(
      async (
        _job: ReportJobRow,
        artifact: ReportArtifact,
        pathSegment: string,
        metadata: Record<string, unknown>,
      ) => makeResult(artifact, pathSegment, metadata),
    );
    const combineResults = jest.fn(
      (results: WorkerResult[], metadata: Record<string, unknown>) => {
        const first = results[0];
        if (!first) throw new Error('missing result');
        return {
          ...first,
          files: results.flatMap((result) => result.files),
          metadata,
        };
      },
    );
    const service = new ReconciliationReportService(
      {
        loadPayrollSummary: jest.fn(async () => summary),
        loadReconciliation: jest.fn(async () => reconciliation),
      } as unknown as ReportWorkerDataService,
      {
        persistResult,
        combineResults,
      } as unknown as ReportWorkerArtifactsService,
    );

    const result = await service.generate(job);

    expect(persistResult).toHaveBeenCalledWith(
      job,
      expect.objectContaining({
        fileName: 'f-fol-016-batimento-folha-2026-05.pdf',
        format: 'PDF',
      }),
      'batimento-folha',
      expect.objectContaining({ reportCode: 'F-FOL-016', format: 'PDF' }),
    );
    expect(persistResult).toHaveBeenCalledWith(
      job,
      expect.objectContaining({
        fileName: 'f-fol-016-batimento-folha-2026-05.xlsx',
        format: 'XLSX',
      }),
      'batimento-folha',
      expect.objectContaining({ reportCode: 'F-FOL-016', format: 'XLSX' }),
    );
    expect(result.metadata).toMatchObject({
      operation: 'report.batimento_folha.generated',
      formats: ['PDF', 'XLSX'],
    });
  });
});

const job: ReportJobRow = {
  id: 'req-016',
  tenant_id: 'tenant-1',
  definition_code: 'F-FOL-016',
  parameters: {},
  payroll_run_id: 'run-1',
  branch_id: null,
  competence_year: 2026,
  competence_month: 5,
};

const summary: PayrollSummaryRow = {
  payroll_run_id: 'run-1',
  competence_year: 2026,
  competence_month: 5,
  branch_name: 'Matriz',
  status: 'GENERATED',
  employee_count: '12',
  total_earnings: '120000.00',
  total_deductions: '24000.00',
  total_net: '96000.00',
};

const reconciliation: ReconciliationRow[] = [
  {
    metric: 'total_net',
    source_total: '96000.00',
    recomputed_total: '96000.00',
    difference: '0.00',
  },
];

function makeResult(
  artifact: ReportArtifact,
  pathSegment: string,
  metadata: Record<string, unknown>,
): WorkerResult {
  const file = {
    artifact,
    storageKind: 'LOCAL' as const,
    storageKey: `tenant-1/outputs/reports/${pathSegment}/${artifact.fileName}`,
    attachmentId: `attachment-${artifact.format}`,
    checksum: `checksum-${artifact.format}`,
    sizeBytes: artifact.content.length,
  };
  return { ...file, files: [file], metadata };
}
