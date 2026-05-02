/* eslint-disable */
import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

const {
  mockQueryQueue,
  mockTransactionDatabase,
  queryResult,
} = require('../../../../tests/backend/support/mock-db.cjs');
import { PayslipRenderService } from './payslip-render.service';

const actor = {
  sub: 'sub-1',
  username: 'portal.user',
  tenantId: '00000000-0000-4000-8000-000000000100',
  groups: [],
  permissions: [],
  claims: { employee_id: 'employee-1' },
};

const sourceRow = {
  tenant_id: 'tenant-1',
  tenant_name: null,
  employee_id: 'employee-1',
  registration: 'MAT-1',
  employee_name: 'Servidor Teste',
  cpf: null,
  employment_link: null,
  bank_agency: null,
  bank_account: null,
  payroll_run_id: 'run-1',
  competence_date: '2026-05-01',
  total_earnings: '1000.00',
  total_deductions: '100.00',
  net_amount: '900.00',
  irrf_base: '1000.00',
  inss_base: '1000.00',
  fgts_deposit: '0.00',
  lines: [
    {
      code: '100',
      description: 'Base',
      reference: '30',
      kind: 'EARNING',
      amount: '1000.00',
    },
    {
      code: '900',
      description: 'Desconto',
      kind: 'DEDUCTION',
      amount: '100.00',
    },
  ],
};

describe('PayslipRenderService', () => {
  it('requires DATABASE_URL-backed database operations', async () => {
    const service = new PayslipRenderService(
      { configured: false } as never,
      {} as never,
    );

    await expect(
      service.renderAndPersist('run-1', 'employee-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps portal file rows and defaults count results', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'employee-1', tenant_id: 'tenant-1' }])
      .mockResolvedValueOnce([
        {
          id: 'file-1',
          competence: '2026-05-01',
          file_hash: 'hash-1',
          payroll_run_id: 'run-1',
          generated_at: new Date('2026-05-02T10:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);
    const service = new PayslipRenderService(
      { configured: true, query } as never,
      {} as never,
    );

    await expect(service.listPortalFiles(actor)).resolves.toEqual([
      {
        id: 'file-1',
        competence: '2026-05-01',
        fileHash: 'hash-1',
        generatedAt: '2026-05-02T10:00:00.000Z',
      },
    ]);
    await expect(service.countFilesForRun('run-1')).resolves.toBe(0);
  });

  it('rejects portal downloads for employees without an available file', async () => {
    const service = new PayslipRenderService(
      {
        configured: true,
        query: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'employee-1', tenant_id: 'tenant-1' }])
          .mockResolvedValueOnce([]),
      } as never,
      {} as never,
    );

    await expect(
      service.renderPortalDownload(actor, 'file-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('loads a payslip document with defaults and deduction mapping', async () => {
    const service = new PayslipRenderService(
      {
        configured: true,
        query: jest.fn().mockResolvedValueOnce([sourceRow]),
      } as never,
      {} as never,
    );

    await expect(
      service.loadPayslipDocument('run-1', 'employee-1'),
    ).resolves.toMatchObject({
      tenantName: 'Ente publico',
      employee: {
        id: 'employee-1',
        cpf: '',
        employmentLink: '',
        bankAgency: '',
        bankAccount: '',
      },
      lines: [
        { code: '100', earning: '1000.00', deduction: '' },
        { code: '900', earning: '', deduction: '100.00' },
      ],
    });
  });

  it('fails when source data or PDF/A validation is unavailable', async () => {
    const client = { query: jest.fn().mockResolvedValueOnce(queryResult([])) };
    const service = new PayslipRenderService(
      mockTransactionDatabase(client) as never,
      {} as never,
    );

    await expect(
      (
        service as never as { renderAndPersistWithClient: Function }
      ).renderAndPersistWithClient(client, 'run-1', 'employee-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const invalidClient = {
      query: jest.fn().mockResolvedValueOnce(queryResult([sourceRow])),
    };
    const invalidPdf = {
      buildPayslip: jest.fn().mockResolvedValue(Buffer.from('not-pdfa')),
      validatePdfA1b: jest
        .fn()
        .mockReturnValue({ valid: false, reasons: ['missing xmp'] }),
    };
    const invalidService = new PayslipRenderService(
      mockTransactionDatabase(invalidClient) as never,
      invalidPdf as never,
    );

    await expect(
      (
        invalidService as never as { renderAndPersistWithClient: Function }
      ).renderAndPersistWithClient(invalidClient, 'run-1', 'employee-1'),
    ).rejects.toThrow('PDF/A-1b validation failed: missing xmp');
  });

  it('renders and persists a valid PDF file record', async () => {
    const client = {
      query: mockQueryQueue([
        [sourceRow],
        { id: 'definition-1' },
        { id: 'request-1' },
        { id: 'attachment-1' },
        { id: 'file-1' },
      ]),
    };
    const pdf = {
      buildPayslip: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
      validatePdfA1b: jest.fn().mockReturnValue({ valid: true, reasons: [] }),
    };
    const service = new PayslipRenderService(
      mockTransactionDatabase(client) as never,
      pdf as never,
    );

    await expect(
      (
        service as never as { renderAndPersistWithClient: Function }
      ).renderAndPersistWithClient(client, 'run-1', 'employee-1'),
    ).resolves.toMatchObject({
      fileId: 'file-1',
      employeeId: 'employee-1',
      payrollRunId: 'run-1',
      competence: '2026-05-01',
    });
    expect(client.query).toHaveBeenCalledTimes(5);
  });

  it('marks a batch as failed when one employee render fails', async () => {
    const client = {
      query: mockQueryQueue([
        { tenant_id: 'tenant-1' },
        { id: 'batch-1' },
        [{ id: 'employee-ok' }, { id: 'employee-fail' }],
        [],
      ]),
    };
    const service = new PayslipRenderService(
      mockTransactionDatabase(client) as never,
      {} as never,
    );
    jest
      .spyOn(
        service as never as { renderAndPersistWithClient: jest.Mock },
        'renderAndPersistWithClient',
      )
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error('render failed'));

    await expect(service.renderBatch('run-1', '2026-05-01')).resolves.toEqual({
      batchId: 'batch-1',
      status: 'FAILED',
      fileCount: 1,
      errorCount: 1,
    });
  });
});
