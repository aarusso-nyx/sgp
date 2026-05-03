import { RegrasService } from './regras.service';

describe('RegrasService', () => {
  it('lists retirement rules with public DTO field names', async () => {
    const service = new RegrasService({
      configured: true,
      query: jest.fn(async () => [
        {
          id: 'rule-1',
          name: 'Voluntaria',
          legal_basis: 'Lei 1',
          age_criteria: { minYears: 65 },
          contribution_time_criteria: { minYears: 35 },
          grace_period_criteria: {},
          applicable_employment_link: null,
          active: true,
        },
      ]),
    } as never);

    await expect(service.listRules()).resolves.toEqual([
      expect.objectContaining({
        id: 'rule-1',
        nome: 'Voluntaria',
        fundamentoLegal: 'Lei 1',
        ativa: true,
      }),
    ]);
  });
});
