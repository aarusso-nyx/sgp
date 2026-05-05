import { PayrollAccountingService } from './payroll-accounting.service';
import {
  TEST_INSTANT_2026_04_26T00_00_00_000Z,
  TEST_INSTANT_2026_04_27T00_00_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';

describe('PayrollAccountingService', () => {
  const catalogRow = {
    id: 'catalog-1',
    code: '001',
    description: 'Catalogo',
    active: true,
    metadata: { type: 'CATEGORIA' },
    created_at: new Date(TEST_INSTANT_2026_04_26T00_00_00_000Z),
    updated_at: '2026-04-27T00:00:00.000Z',
  };
  const accountRow = {
    id: 'acc-1',
    code: '319011',
    description: 'EMPENHO',
    active: true,
    metadata: {
      accountType: 'EMPENHO',
      accountCode: '319011',
      allocationPercent: '100.0000',
      totalAllocationPercent: '100.0000',
      workLocationIds: ['loc-1'],
    },
    created_at: '2026-04-26T00:00:00.000Z',
    updated_at: new Date(TEST_INSTANT_2026_04_27T00_00_00_000Z),
  };

  const createQuery = () =>
    jest.fn(async (sql: string) => {
      if (sql.includes('count(')) return [{ total: '1' }];
      if (
        sql.includes('DELETE FROM payroll.accounting_account_work_location') ||
        sql.includes('INSERT INTO payroll.accounting_account_work_location')
      ) {
        return [];
      }
      if (sql.includes('payroll.accounting_account')) return [accountRow];
      return [catalogRow];
    });

  it('returns the supported payroll catalog resources', () => {
    const service = new PayrollAccountingService({ configured: true } as never);

    const resources = service.listCatalogResources();

    expect(resources.map((resource) => resource.key)).toEqual(
      expect.arrayContaining([
        'gps-codes',
        'sefip',
        'accounting-histories',
        'simple-accounts',
      ]),
    );
  });

  it('creates payroll sefip catalog records', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'sefip-1',
        code: '115',
        description: 'Categoria trabalhador',
        active: true,
        metadata: { type: 'CATEGORIA' },
        created_at: new Date(TEST_INSTANT_2026_04_26T00_00_00_000Z),
        updated_at: new Date(TEST_INSTANT_2026_04_26T00_00_00_000Z),
      },
    ]);
    const service = new PayrollAccountingService({
      configured: true,
      query,
    } as never);

    const result = await service.createCatalogRecord('sefip', {
      code: '115',
      description: 'Categoria trabalhador',
      type: 'CATEGORIA',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payroll.sefip_code'),
      ['115', 'Categoria trabalhador', 'CATEGORIA', 'ACTIVE'],
    );
    expect(result.code).toBe('115');
  });

  it('creates accounting accounts and syncs work locations', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'acc-1',
          code: '319011',
          description: 'EMPENHO',
          active: true,
          metadata: {},
          created_at: new Date(TEST_INSTANT_2026_04_26T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_04_26T00_00_00_000Z),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'acc-1',
          code: '319011',
          description: 'EMPENHO',
          active: true,
          metadata: {
            workLocationIds: ['loc-1'],
          },
          created_at: new Date(TEST_INSTANT_2026_04_26T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_04_26T00_00_00_000Z),
        },
      ]);
    const service = new PayrollAccountingService({
      configured: true,
      query,
    } as never);

    const result = await service.createAccountingAccount({
      accountType: 'EMPENHO',
      accountCode: '319011',
      allocationPercent: '100.0000',
      workLocationIds: ['loc-1'],
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO payroll.accounting_account'),
      [
        '',
        '',
        '',
        '',
        '',
        'EMPENHO',
        '319011',
        '100.0000',
        '100.0000',
        'ACTIVE',
      ],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(
        'INSERT INTO payroll.accounting_account_work_location',
      ),
      ['acc-1', ['loc-1']],
    );
    expect(result.code).toBe('319011');
  });

  it('lists and mutates every payroll accounting catalog mapping', async () => {
    const query = createQuery();
    const service = new PayrollAccountingService({
      configured: true,
      query,
    } as never);

    for (const resource of service.listCatalogResources()) {
      const input = {
        code: ' 001 ',
        description: ' Catalogo ',
        type: resource.key === 'sefip' ? ' CATEGORIA ' : undefined,
        active: false,
      };

      await expect(
        service.listCatalogRecords(resource.key, {
          page: 1,
          pageSize: 5,
          search: 'catalogo',
        }),
      ).resolves.toMatchObject({ total: 1 });
      await expect(
        service.createCatalogRecord(resource.key, input),
      ).resolves.toMatchObject({ code: '001' });
      await expect(
        service.updateCatalogRecord(resource.key, 'catalog-1', input),
      ).resolves.toMatchObject({ updatedAt: '2026-04-27T00:00:00.000Z' });
      await expect(
        service.deactivateCatalogRecord(resource.key, 'catalog-1'),
      ).resolves.toMatchObject({ id: 'catalog-1' });
    }

    await expect(
      service.createCatalogRecord('sefip', {
        code: '115',
        description: 'Sem tipo',
      }),
    ).rejects.toThrow('Catalog type is required');
    await expect(service.listCatalogRecords('missing', {})).rejects.toThrow(
      'Payroll catalog resource not mapped',
    );
  });

  it('lists, updates, and deactivates accounting accounts', async () => {
    const query = createQuery();
    const service = new PayrollAccountingService({
      configured: true,
      query,
    } as never);

    await expect(
      service.listAccountingAccounts({
        page: 1,
        pageSize: 5,
        search: '319011',
      }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      service.updateAccountingAccount('acc-1', {
        branchId: 'branch-1',
        costCenterId: 'cost-1',
        earningDeductionId: 'earning-1',
        accountingHistoryId: 'history-1',
        simpleAccountingId: 'simple-1',
        accountType: ' EMPENHO ',
        accountCode: ' 319011 ',
        allocationPercent: '75.0000',
        active: false,
        workLocationIds: [],
      }),
    ).resolves.toMatchObject({ code: '319011' });
    await expect(
      service.deactivateAccountingAccount('acc-1'),
    ).resolves.toMatchObject({ id: 'acc-1' });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        'DELETE FROM payroll.accounting_account_work_location',
      ),
      ['acc-1'],
    );
  });

  it('rejects unavailable databases and missing accounting records', async () => {
    await expect(
      new PayrollAccountingService({
        configured: false,
      } as never).listCatalogRecords('sefip', {}),
    ).rejects.toThrow('DATABASE_URL is required');
    await expect(
      new PayrollAccountingService({
        configured: true,
        query: jest.fn(async () => []),
      } as never).updateCatalogRecord('sefip', 'missing', {
        code: '115',
        description: 'Categoria',
        type: 'CATEGORIA',
      }),
    ).rejects.toThrow('Payroll catalog record not found');
    await expect(
      new PayrollAccountingService({
        configured: true,
        query: jest.fn(async () => []),
      } as never).updateAccountingAccount('missing', {
        accountType: 'EMPENHO',
        accountCode: '319011',
        allocationPercent: '100.0000',
      }),
    ).rejects.toThrow('Payroll accounting account not found');
  });
});
