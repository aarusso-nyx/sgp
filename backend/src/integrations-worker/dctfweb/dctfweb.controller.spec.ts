import { DctfwebController } from './dctfweb.controller';

describe('DctfwebController', () => {
  it('exposes MIT generation with the CSLL adicional response schema', async () => {
    const result = {
      competence: '2026-05-01',
      mitStatus: 'INCLUDED' as const,
      debitCount: 1,
      totalBaseAmount: '100000.00',
      totalAmount: '9000.00',
      totalCsllAdicionalAmount: '1500.00',
      xml: '<DCTFWebMIT />',
      xmlHash: 'a'.repeat(64),
      debits: [
        {
          mitDebitId: 'MIT-csll-adicional-r4-10',
          mitStatus: 'INCLUDED' as const,
          cnpjFilial: '12345678000199',
          pgdDeclarationId: '00000000-0000-4000-8000-000000005100',
          pgdDebitId: '00000000-0000-4000-8000-000000005101',
          taxCode: 'CSLL-ADICIONAL',
          period: '2026-05-01',
          baseAmount: '100000.00',
          amount: '9000.00',
          csllAdicionalAmount: '1500.00',
          dueDate: '2026-06-30',
        },
      ],
    };
    const mitInclusion = {
      generate: jest.fn(async () => result),
    };
    const auditService = {
      auditMutation: jest.fn(),
    };
    const controller = new DctfwebController(
      {} as never,
      {} as never,
      {} as never,
      mitInclusion as never,
      auditService as never,
    );

    await expect(
      controller.generateMit({} as never, {
        year: 2026,
        month: 5,
        cnpjFilial: '12345678000199',
      }),
    ).resolves.toEqual(result);

    expect(mitInclusion.generate).toHaveBeenCalledWith({
      year: 2026,
      month: 5,
      cnpjFilial: '12345678000199',
    });
    expect(auditService.auditMutation).toHaveBeenCalledWith(
      {},
      'PROCESS',
      'fiscal.dctfweb.mit',
      expect.objectContaining({
        metadata: expect.objectContaining({
          totalCsllAdicionalAmount: '1500.00',
        }),
      }),
    );
  });
});
