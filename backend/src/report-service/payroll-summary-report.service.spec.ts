import type { ReportArtifact } from './report-artifact.builder';
import { PayrollSummaryReportService } from './payroll-summary-report.service';
import type { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import type { ReportWorkerDataService } from './report-worker-data.service';
import type {
  PayrollSummaryRow,
  ReportJobRow,
  ReportLineRow,
  WorkerResult,
} from './report-worker.types';

describe('PayrollSummaryReportService', () => {
  it('generates F-FOL-013 PDF and XLSX artifacts through its public surface', async () => {
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
    const service = new PayrollSummaryReportService(
      {
        loadPayrollSummary: jest.fn(async () => summary),
        loadFinancialByBranch: jest.fn(async () => byBranch),
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
        fileName: 'f-fol-013-relatorio-folha-2026-05.pdf',
        format: 'PDF',
      }),
      'relatorio-folha',
      expect.objectContaining({ reportCode: 'F-FOL-013', format: 'PDF' }),
    );
    expect(persistResult).toHaveBeenCalledWith(
      job,
      expect.objectContaining({
        fileName: 'f-fol-013-relatorio-folha-2026-05.xlsx',
        format: 'XLSX',
      }),
      'relatorio-folha',
      expect.objectContaining({ reportCode: 'F-FOL-013', format: 'XLSX' }),
    );
    expect(combineResults).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        reportCode: 'F-FOL-013',
        formats: ['PDF', 'XLSX'],
      }),
    );
    expect(result.metadata).toMatchObject({
      operation: 'report.folha_pagamento.generated',
      formats: ['PDF', 'XLSX'],
    });
  });
});

const job: ReportJobRow = {
  id: 'req-013',
  tenant_id: 'tenant-1',
  definition_code: 'F-FOL-013',
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

const byBranch: ReportLineRow[] = [
  {
    label: 'Matriz',
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
    attachmentId: `attachment-${artifact.format}`,
    checksum: `checksum-${artifact.format}`,
    sizeBytes: artifact.content.length,
  };
  return { ...file, files: [file], metadata };
}
