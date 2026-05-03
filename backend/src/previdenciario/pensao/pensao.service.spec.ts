import { PensaoService } from './pensao.service';

describe('PensaoService', () => {
  it('lists pension grants with decimal shares as numbers', async () => {
    const service = new PensaoService({
      configured: true,
      query: jest.fn(async () => [
        {
          id: 'pension-1',
          instituting_employee_id: 'emp-1',
          registration: '0001',
          employee_name: 'Instituidor',
          beneficiary_name: 'Beneficiario',
          beneficiary_cpf: '12345678901',
          kinship: 'CONJUGE',
          benefit_type: 'PENSAO',
          apportionment_type: 'PERCENTUAL',
          share_percent: '50.5',
          adjustment_mode: 'PARIDADE',
          nature: 'VITALICIA',
          granted_on: '2026-04-25',
          ceased_on: null,
          legal_basis: 'Lei 1',
          notes: '',
        },
      ]),
    } as never);

    await expect(service.listPensions()).resolves.toEqual([
      expect.objectContaining({
        id: 'pension-1',
        cotaParte: 50.5,
        nomeBeneficiario: 'Beneficiario',
      }),
    ]);
  });
});
