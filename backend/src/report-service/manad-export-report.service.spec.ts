import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ReportArtifact } from './report-artifact.builder';
import { ManadExportReportService } from './manad-export-report.service';
import type { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import type { ReportWorkerDataService } from './report-worker-data.service';
import type {
  ManadPayrollRow,
  PayrollSummaryRow,
  ReportJobRow,
  WorkerResult,
} from './report-worker.types';

describe('ManadExportReportService', () => {
  it('generates deterministic MANAD TXT and JSON artifacts from approved payroll rows', async () => {
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
    const service = new ManadExportReportService(
      {
        loadPayrollSummary: jest.fn(async () => summary),
        loadManadPayrollRows: jest.fn(async () => rows),
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
        join(__dirname, '../../../tests/backend/golden/manad-v01/expected.txt'),
        'utf8',
      ),
    );
    expect(persistResult).toHaveBeenCalledTimes(2);
    expect(persistResult).toHaveBeenNthCalledWith(
      1,
      job,
      expect.objectContaining({
        fileName: 'm-06-manad-2026-05.txt',
        format: 'TXT',
      }),
      'manad',
      expect.objectContaining({
        reportCode: 'M.06',
        operation: 'report.manad.generated',
        format: 'TXT',
      }),
    );
    expect(persistResult).toHaveBeenNthCalledWith(
      2,
      job,
      expect.objectContaining({
        fileName: 'm-06-manad-2026-05.json',
        format: 'JSON',
      }),
      'manad',
      expect.objectContaining({ format: 'JSON' }),
    );
    expect(result.metadata).toMatchObject({
      reportCode: 'M.06',
      operation: 'report.manad.generated',
      layout: 'MANAD-SGP-V1',
      formats: ['TXT', 'JSON'],
      recordCount: 2,
      totalEarnings: '1000.00',
      totalDeductions: '110.00',
      netTotal: '890.00',
    });
  });

  it('rejects non-approved payroll runs before exporting MANAD', async () => {
    const service = new ManadExportReportService(
      {
        loadPayrollSummary: jest.fn(async () => ({
          ...summary,
          status: 'DRAFT',
        })),
        loadManadPayrollRows: jest.fn(),
      } as unknown as ReportWorkerDataService,
      {
        persistResult: jest.fn(),
        combineResults: jest.fn(),
      } as unknown as ReportWorkerArtifactsService,
    );

    await expect(service.generate(job)).rejects.toMatchObject({
      code: 'MANAD_PAYROLL_STATUS_NOT_EXPORTABLE',
    });
  });
});

const job: ReportJobRow = {
  id: 'req-manad',
  tenant_id: 'tenant-1',
  definition_code: 'MANAD_EXPORT',
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
  employee_count: '1',
  total_earnings: '1000.00',
  total_deductions: '110.00',
  total_net: '890.00',
};

const rows: ManadPayrollRow[] = [
  {
    employee_registration: 'MAT-001',
    employee_cpf: '123.456.789-01',
    rubric_code: 'BASE',
    rubric_description: 'Vencimento base',
    entry_kind: 'EARNING',
    quantity: '1.0000',
    reference_value: '1000.00',
    amount: '1000.00',
  },
  {
    employee_registration: 'MAT-001',
    employee_cpf: '123.456.789-01',
    rubric_code: 'RPPS',
    rubric_description: 'Contribuicao previdenciaria',
    entry_kind: 'DEDUCTION',
    quantity: '1.0000',
    reference_value: '110.00',
    amount: '110.00',
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
