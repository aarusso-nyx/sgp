import type { ReportArtifact } from './report-artifact.builder';
import { RepasseFundoRhReportService } from './repasse-fundo-rh-report.service';
import type { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import type { ReportWorkerDataService } from './report-worker-data.service';
import type {
  PayrollSummaryRow,
  RepasseFundoRhRow,
  ReportJobRow,
  WorkerResult,
} from './report-worker.types';

describe('RepasseFundoRhReportService', () => {
  it('generates deterministic PDF, CSV, and JSON artifacts from approved payroll rows', async () => {
    const persistResult = jest.fn(
      async (
        _job: ReportJobRow,
        artifact: ReportArtifact,
        pathSegment: string,
        metadata: Record<string, unknown>,
      ) => makeResult(artifact, pathSegment, metadata),
    );
    const combineResults = jest.fn(
      (files: WorkerResult[], metadata: Record<string, unknown>) => ({
        ...files[0],
        files,
        metadata,
      }),
    );
    const service = new RepasseFundoRhReportService(
      {
        loadPayrollSummary: jest.fn(async () => summary),
        loadRepasseFundoRh: jest.fn(async () => rows),
      } as unknown as ReportWorkerDataService,
      {
        persistResult,
        combineResults,
      } as unknown as ReportWorkerArtifactsService,
    );

    const result = await service.generate(job);

    expect(persistResult).toHaveBeenCalledTimes(3);
    expect(persistResult).toHaveBeenNthCalledWith(
      1,
      job,
      expect.objectContaining({
        fileName: 'relatorio-repasse-fundo-rh-2026-05.pdf',
        format: 'PDF',
      }),
      'repasse-fundo-rh',
      expect.objectContaining({ format: 'PDF' }),
    );
    expect(persistResult).toHaveBeenNthCalledWith(
      2,
      job,
      expect.objectContaining({
        fileName: 'relatorio-repasse-fundo-rh-2026-05.csv',
        format: 'CSV',
      }),
      'repasse-fundo-rh',
      expect.objectContaining({ format: 'CSV' }),
    );
    expect(persistResult).toHaveBeenNthCalledWith(
      3,
      job,
      expect.objectContaining({
        fileName: 'relatorio-repasse-fundo-rh-2026-05.json',
        format: 'JSON',
      }),
      'repasse-fundo-rh',
      expect.objectContaining({ format: 'JSON' }),
    );
    expect(result.metadata).toMatchObject({
      reportCode: 'RELATORIO_REPASSE_FUNDO_RH',
      operation: 'report.repasse_fundo_rh.generated',
      formats: ['PDF', 'CSV', 'JSON'],
      basisTotal: '1000.00',
      transferTotal: '200.00',
    });
  });
});

const job: ReportJobRow = {
  id: 'req-rfrh',
  tenant_id: 'tenant-1',
  definition_code: 'RELATORIO_REPASSE_FUNDO_RH',
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
  status: 'APPROVED',
  employee_count: '12',
  total_earnings: '120000.00',
  total_deductions: '24000.00',
  total_net: '96000.00',
};

const rows: RepasseFundoRhRow[] = [
  {
    fund_source: 'TESOURO',
    rubric_code: 'FUNDO_RH',
    rubric_description: 'Repasse Fundo RH',
    employee_count: '12',
    basis_total: '1000.00',
    transfer_total: '200.00',
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
    attachmentId: 'attachment-1',
    checksum: 'checksum-1',
    sizeBytes: artifact.content.length,
  };
  return { ...file, files: [file], metadata };
}
