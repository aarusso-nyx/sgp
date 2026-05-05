/* eslint-disable */
import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  mockQueryQueue,
  mockTransactionDatabase,
  queryResult,
} from '../../../../tests/backend/support/mock-db.cjs';
import { LGPD_DATA_FLOWS } from '../../common/lgpd/legal-basis.registry';
import { YearlyIncomeRenderService } from './yearly-income-render.service';
import { TEST_INSTANT_2026_02_28T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

const actor = {
  sub: 'sub-1',
  username: 'portal.user',
  tenantId: 'tenant-1',
  groups: [],
  permissions: [],
  claims: { employee_id: 'employee-1' },
};

const aggregate = {
  tenant_id: 'tenant-1',
  tenant_name: null,
  tenant_document: null,
  employee_id: 'employee-1',
  registration: 'MAT-1',
  employee_name: 'Servidor Teste',
  cpf: null,
  employment_link: null,
  year_base: '2025',
  taxable_total: '60000.00',
  thirteenth_salary: '0.00',
  vacation_total: '0.00',
  severance_total: '0.00',
  exempt_total: '0.00',
  inss_rpps_total: '6000.00',
  irrf_total: '4000.00',
  dependents_count: '1',
  s1210_total: '60000.00',
  s1210_irrf_total: '4000.00',
  recomputed_at: new Date(TEST_INSTANT_2026_02_28T00_00_00_000Z),
};

describe('YearlyIncomeRenderService', () => {
  it('requires a configured database and authenticated employee claims', async () => {
    const unavailable = new YearlyIncomeRenderService(
      { configured: false } as never,
      {} as never,
    );
    await expect(unavailable.listPortalFiles(actor)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    const service = new YearlyIncomeRenderService(
      { configured: true, query: jest.fn() } as never,
      {} as never,
    );
    await expect(service.listPortalFiles(undefined)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists portal aggregates and rejects unknown actor employees', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'employee-1' }])
      .mockResolvedValueOnce([aggregate])
      .mockResolvedValueOnce([]);
    const service = new YearlyIncomeRenderService(
      { configured: true, query } as never,
      {} as never,
    );

    await expect(service.listPortalFiles(actor)).resolves.toEqual([
      {
        yearBase: 2025,
        taxableTotal: '60000.00',
        exemptTotal: '0.00',
        irrfTotal: '4000.00',
        recomputedAt: '2026-02-28T00:00:00.000Z',
      },
    ]);
    await expect(service.listPortalFiles(actor)).rejects.toThrow(
      'Authenticated employee context not found',
    );
  });

  it('loads aggregate rows and maps defaults', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce(queryResult([aggregate])),
    };
    const service = new YearlyIncomeRenderService(
      { configured: true } as never,
      {} as never,
    );

    await expect(
      (
        service as never as { loadAggregateWithClient: Function }
      ).loadAggregateWithClient(client, 2025, 'employee-1'),
    ).resolves.toEqual(aggregate);
    expect(
      (service as never as { toAggregate: Function }).toAggregate(aggregate),
    ).toMatchObject({
      tenantName: 'Ente publico',
      tenantDocument: '',
      cpf: '',
      employmentLink: '',
      yearBase: 2025,
      dependentsCount: 1,
      recomputedAt: '2026-02-28T00:00:00.000Z',
    });
  });

  it('checks the LGPD legal-basis rule before reading yearly income PII', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce(queryResult([aggregate])),
    };
    const legalBasis = {
      assertPiiReadAllowed: jest.fn().mockResolvedValue({}),
    };
    const service = new YearlyIncomeRenderService(
      { configured: true } as never,
      {} as never,
      legalBasis as never,
    );

    await expect(
      (
        service as never as { loadAggregateWithClient: Function }
      ).loadAggregateWithClient(client, 2025, 'employee-1'),
    ).resolves.toEqual(aggregate);
    expect(legalBasis.assertPiiReadAllowed).toHaveBeenCalledWith(
      LGPD_DATA_FLOWS.FISCAL_YEARLY_INCOME_PDF,
    );
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('rejects missing aggregate rows and invalid PDF/A output', async () => {
    const client = { query: jest.fn().mockResolvedValueOnce(queryResult([])) };
    const service = new YearlyIncomeRenderService(
      { configured: true } as never,
      {} as never,
    );

    await expect(
      (
        service as never as { loadAggregateWithClient: Function }
      ).loadAggregateWithClient(client, 2025, 'employee-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const invalidClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce(queryResult([aggregate])),
    };
    const invalidPdf = {
      buildYearlyIncome: jest.fn().mockResolvedValue(Buffer.from('bad')),
      validatePdfA1b: jest
        .fn()
        .mockReturnValue({ valid: false, reasons: ['xmp'] }),
    };
    const invalidService = new YearlyIncomeRenderService(
      mockTransactionDatabase(invalidClient) as never,
      invalidPdf as never,
    );
    await expect(
      invalidService.renderAndPersist(2025, 'employee-1'),
    ).rejects.toThrow('PDF/A-1b validation failed: xmp');
  });

  it('renders and persists yearly income reports and enforces portal ownership', async () => {
    const client = {
      query: mockQueryQueue([
        [],
        [aggregate],
        { id: 'definition-1' },
        { id: 'request-1' },
        { id: 'attachment-1' },
        { id: 'file-1' },
      ]),
    };
    const pdf = {
      buildYearlyIncome: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-yearly')),
      validatePdfA1b: jest.fn().mockReturnValue({ valid: true, reasons: [] }),
    };
    const db = mockTransactionDatabase(client);
    db.query = jest.fn().mockResolvedValue([{ id: 'employee-1' }]);
    const service = new YearlyIncomeRenderService(db as never, pdf as never);

    await expect(
      service.renderPortalDownload(actor, 2025),
    ).resolves.toMatchObject({
      fileId: 'file-1',
      employeeId: 'employee-1',
      yearBase: 2025,
    });

    const forbidden = new YearlyIncomeRenderService(
      {
        ...db,
        query: jest.fn().mockResolvedValue([{ id: 'employee-other' }]),
      } as never,
      pdf as never,
    );
    jest
      .spyOn(forbidden, 'renderAndPersist')
      .mockResolvedValue({ employeeId: 'employee-1' } as never);
    await expect(
      forbidden.renderPortalDownload(actor, 2025),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
