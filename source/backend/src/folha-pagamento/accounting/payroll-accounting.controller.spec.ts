import { PayrollAccountingController } from './payroll-accounting.controller';

describe('PayrollAccountingController', () => {
  it('creates payroll catalog records through the accounting service', async () => {
    const createCatalogRecord = jest.fn().mockResolvedValue({ id: 'gps-1' });
    const appendMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new PayrollAccountingController(
      { createCatalogRecord } as never,
      { appendMutation } as never,
    );

    const result = await controller.createCatalogRecord(
      { actor: { username: 'folha-user' } } as never,
      'gps-codes',
      { code: '2100', description: 'Prefeitura' },
    );

    expect(createCatalogRecord).toHaveBeenCalledWith('gps-codes', {
      code: '2100',
      description: 'Prefeitura',
    });
    expect(result).toEqual({ id: 'gps-1' });
  });

  it('creates accounting accounts through the accounting service', async () => {
    const createAccountingAccount = jest
      .fn()
      .mockResolvedValue({ id: 'acc-1' });
    const appendMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new PayrollAccountingController(
      { createAccountingAccount } as never,
      { appendMutation } as never,
    );

    const result = await controller.createAccountingAccount(
      { actor: { username: 'folha-user' } } as never,
      {
        accountType: 'EMPENHO',
        accountCode: '319011',
        allocationPercent: '100.0000',
      },
    );

    expect(createAccountingAccount).toHaveBeenCalledWith({
      accountType: 'EMPENHO',
      accountCode: '319011',
      allocationPercent: '100.0000',
    });
    expect(result).toEqual({ id: 'acc-1' });
  });
});
