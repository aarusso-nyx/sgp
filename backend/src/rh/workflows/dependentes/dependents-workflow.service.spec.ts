import { DependentsWorkflowService } from './dependents-workflow.service';

describe('DependentsWorkflowService', () => {
  const employeeId = '11111111-1111-4111-8111-111111111111';

  function service() {
    const query = jest.fn().mockResolvedValue([]);
    const workflow = new DependentsWorkflowService({
      databaseService: { query },
      require: (value: unknown, field: string) => {
        if (value === undefined || value === null || value === '') {
          throw new Error(`${field} is required`);
        }
      },
    } as never);
    return { query, workflow };
  }

  it('inserts regular dependents with cleaned CPF and default relationship', async () => {
    const { query, workflow } = service();

    await workflow.insertDependent(
      { name: ' Filho ', cpf: ' 12345678901 ', incomeTaxDependent: true },
      employeeId,
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.employee_dependent'),
      [employeeId, 'Filho', '12345678901', null, 'Nao informado', true],
    );
  });

  it('updates benefit dependents without changing the public DTO contract', async () => {
    const { query, workflow } = service();

    await workflow.updateBenefitDependent('dep-1', {
      name: 'Beneficiario',
      benefitCode: 'BEN',
      startsOn: '2026-01-01',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE hr.employee_benefit_dependent'),
      expect.arrayContaining(['dep-1', '', 'Beneficiario', null, null, 'BEN']),
    );
  });
});
