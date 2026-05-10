import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PerdcompExportReportService } from './perdcomp-export-report.service';
import type { ReportArtifact } from './report-artifact.builder';
import type { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import type { ReportWorkerDataService } from './report-worker-data.service';
import type {
  PayrollSummaryRow,
  PerdcompCreditRow,
  ReportJobRow,
  WorkerResult,
} from './report-worker.types';

describe('PerdcompExportReportService', () => {
  it('generates deterministic PERDCOMP TXT and JSON artifacts grouping INSS credits', async () => {
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
    const service = new PerdcompExportReportService(
      {
        loadPayrollSummary: jest.fn(async () => summary),
        loadPerdcompCreditRows: jest.fn(async () => rows),
      } as unknown as ReportWorkerDataService,
      {
        persistResult,
        combineResults,
      } as unknown as ReportWorkerArtifactsService,
    );

    const result = await service.generate(job);
    const textArtifact = persistResult.mock.calls[0]?.[1] as ReportArtifact;
    expect(textArtifact.content.toString('utf8')).toBe(
      readFileSync(
        join(
          __dirname,
          '../../../tests/backend/golden/perdcomp-v01/expected.txt',
        ),
        'utf8',
      ),
    );
    expect(persistResult).toHaveBeenCalledTimes(2);
    expect(persistResult).toHaveBeenNthCalledWith(
      1,
      job,
      expect.objectContaining({
        fileName: 'm-08-perdcomp-2026-05.txt',
        format: 'TXT',
      }),
      'perdcomp',
      expect.objectContaining({
        reportCode: 'M.08',
        operation: 'report.perdcomp.generated',
        format: 'TXT',
      }),
    );
    expect(persistResult).toHaveBeenNthCalledWith(
      2,
      job,
      expect.objectContaining({
        fileName: 'm-08-perdcomp-2026-05.json',
        format: 'JSON',
      }),
      'perdcomp',
      expect.objectContaining({ format: 'JSON' }),
    );
    expect(result.metadata).toMatchObject({
      reportCode: 'M.08',
      operation: 'report.perdcomp.generated',
      layout: 'PERDCOMP-SGP-V1',
      formats: ['TXT', 'JSON'],
      recordCount: 3,
      compensationCompetence: '2026-06',
      totalCredit: '1580.00',
      inssPatronal: '1100.00',
      inssSegurado: '330.00',
      rat: '150.00',
    });
  });

  it('honours an explicit compensationCompetence parameter', async () => {
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
    const service = new PerdcompExportReportService(
      {
        loadPayrollSummary: jest.fn(async () => summary),
        loadPerdcompCreditRows: jest.fn(async () => rows),
      } as unknown as ReportWorkerDataService,
      {
        persistResult,
        combineResults,
      } as unknown as ReportWorkerArtifactsService,
    );

    const result = await service.generate({
      ...job,
      parameters: { compensationCompetence: '2027-01' },
    });
    expect(result.metadata).toMatchObject({
      compensationCompetence: '2027-01',
    });
  });

  it('rejects non-approved payroll runs before exporting PERDCOMP', async () => {
    const service = new PerdcompExportReportService(
      {
        loadPayrollSummary: jest.fn(async () => ({
          ...summary,
          status: 'DRAFT',
        })),
        loadPerdcompCreditRows: jest.fn(),
      } as unknown as ReportWorkerDataService,
      {
        persistResult: jest.fn(),
        combineResults: jest.fn(),
      } as unknown as ReportWorkerArtifactsService,
    );

    await expect(service.generate(job)).rejects.toMatchObject({
      code: 'PERDCOMP_PAYROLL_STATUS_NOT_EXPORTABLE',
    });
  });
});

const job: ReportJobRow = {
  id: 'req-perdcomp',
  tenant_id: 'tenant-1',
  definition_code: 'PERDCOMP_EXPORT',
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
  employee_count: '3',
  total_earnings: '15000.00',
  total_deductions: '1580.00',
  total_net: '13420.00',
};

const rows: PerdcompCreditRow[] = [
  {
    rubric_code: 'INSS_PAT',
    rubric_description: 'Inss patronal',
    entry_kind: 'DEDUCTION',
    category: 'INSS_PATRONAL',
    employee_count: '3',
    total_amount: '1100.00',
  },
  {
    rubric_code: 'INSS',
    rubric_description: 'Inss segurado',
    entry_kind: 'DEDUCTION',
    category: 'INSS_SEGURADO',
    employee_count: '3',
    total_amount: '330.00',
  },
  {
    rubric_code: 'RAT',
    rubric_description: 'Risco ambiental',
    entry_kind: 'DEDUCTION',
    category: 'RAT',
    employee_count: '3',
    total_amount: '150.00',
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
