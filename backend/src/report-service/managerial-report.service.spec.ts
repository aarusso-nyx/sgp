import type { ReportArtifact } from './report-artifact.builder';
import { ManagerialReportService } from './managerial-report.service';
import type { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import type { ReportWorkerDataService } from './report-worker-data.service';
import type {
  PayrollSummaryRow,
  ReportJobRow,
  ReportLineRow,
  WorkerResult,
} from './report-worker.types';

describe('ManagerialReportService', () => {
  it('generates F-FOL-014 PDF artifacts through its public surface', async () => {
    const persistResult = jest.fn(
      async (
        _job: ReportJobRow,
        artifact: ReportArtifact,
        pathSegment: string,
        metadata: Record<string, unknown>,
      ) => makeResult(artifact, pathSegment, metadata),
    );
    const service = new ManagerialReportService(
      {
        loadPayrollSummary: jest.fn(async () => summary),
        loadFinancialByFunctionalStatus: jest.fn(async () => byStatus),
      } as unknown as ReportWorkerDataService,
      { persistResult } as unknown as ReportWorkerArtifactsService,
    );

    const result = await service.generate(job);

    expect(persistResult).toHaveBeenCalledWith(
      job,
      expect.objectContaining({
        fileName: 'f-fol-014-relatorio-gerencial-2026-05.pdf',
        format: 'PDF',
      }),
      'relatorio-gerencial',
      expect.objectContaining({
        reportCode: 'F-FOL-014',
        operation: 'report.gerencial.generated',
      }),
    );
    expect(result.metadata).toMatchObject({
      reportCode: 'F-FOL-014',
      operation: 'report.gerencial.generated',
    });
  });
});

const job: ReportJobRow = {
  id: 'req-014',
  tenant_id: 'tenant-1',
  definition_code: 'F-FOL-014',
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

const byStatus: ReportLineRow[] = [
  {
    label: 'Ativo',
    employee_count: '12',
    total_earnings: '120000.00',
    total_deductions: '24000.00',
    total_net: '96000.00',
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
