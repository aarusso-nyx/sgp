import { AposentadoriaService } from './aposentadoria.service';

describe('AposentadoriaService', () => {
  it('creates a retirement grant after eligibility simulation', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT id, registration, name, birth_date')) {
        return [
          {
            id: 'emp-1',
            registration: '0001',
            name: 'Servidor',
            birth_date: '1960-01-01',
            hired_on: '1985-01-01',
            cpf: '00011122233',
          },
        ];
      }
      if (sql.includes('FROM hr.retirement_rule')) {
        return [
          {
            id: 'rule-1',
            name: 'Voluntaria',
            legal_basis: 'Lei 1',
            age_criteria: {},
            contribution_time_criteria: {},
            grace_period_criteria: {},
            applicable_employment_link: null,
            active: true,
          },
        ];
      }
      return [
        {
          id: 'grant-1',
          employee_id: 'emp-1',
          registration: '0001',
          employee_name: 'Servidor',
          rule_id: 'rule-1',
          rule_name: 'Voluntaria',
          granted_on: '2026-04-25',
          legal_basis: 'Lei 1',
          appointment_act: 'Ato 1',
          status: 'CONCEDIDA',
          notes: '',
          granted_by_ref: 'previd-user',
        },
      ];
    });
    const regrasService = {
      evaluateSimulation: jest.fn(() => ({
        resultado: { elegivel: true },
        detalhe: {},
      })),
    };
    const service = new AposentadoriaService(
      { configured: true, query } as never,
      regrasService as never,
    );

    await expect(
      service.createRetirementGrant(
        {
          funcionarioId: 'emp-1',
          regraId: 'rule-1',
          dataConcessao: '2026-04-25',
          fundamento: 'Lei 1',
          atoNomeacao: 'Ato 1',
        },
        'previd-user',
      ),
    ).resolves.toMatchObject({ id: 'grant-1', status: 'CONCEDIDA' });
    expect(regrasService.evaluateSimulation).toHaveBeenCalled();
  });
});
