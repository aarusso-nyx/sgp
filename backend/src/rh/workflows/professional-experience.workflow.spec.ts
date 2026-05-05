import { EmploymentWorkflowService } from './employment-workflow.service';
import { WORKFLOWS } from './workflow-definitions';

describe('Professional experience workflow', () => {
  function service() {
    const query = jest.fn().mockResolvedValue([]);
    const workflow = new EmploymentWorkflowService({
      databaseService: { query },
      require: (value: unknown, field: string) => {
        if (!value) throw new Error(`${field} is required`);
      },
    } as never);
    return { query, workflow };
  }

  it('is registered as an employee-scoped RH workflow over hr.professional_experience', () => {
    const definition = WORKFLOWS.find(
      (candidate) => candidate.key === 'professional-experiences',
    );

    expect(definition).toMatchObject({
      key: 'professional-experiences',
      table: 'professional_experience',
      employeeScoped: true,
      legacyRoute: '#!/experienciaProfissional/gestao',
    });
    expect(definition?.from).toContain('hr.professional_experience');
  });

  it('inserts prior professional experience records with period fields', async () => {
    const { query, workflow } = service();

    await workflow.insertProfessionalExperience(
      {
        employer: 'Prefeitura Municipal',
        roleTitle: 'Analista',
        startsOn: '2020-01-01',
        endsOn: '2024-12-31',
        notes: 'Atuacao em folha',
      },
      '00000000-0000-4000-8000-000000000050',
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.professional_experience'),
      [
        '00000000-0000-4000-8000-000000000050',
        'Prefeitura Municipal',
        'Analista',
        '2020-01-01',
        '2024-12-31',
        'Atuacao em folha',
      ],
    );
  });

  it('updates prior professional experience records without changing workflow identity', async () => {
    const { query, workflow } = service();

    await workflow.updateProfessionalExperience(
      '00000000-0000-4000-8000-000000000051',
      {
        employer: 'Camara Municipal',
        roleTitle: 'Coordenador',
        startsOn: '2018-01-01',
        endsOn: '2019-12-31',
        notes: 'Gestao de equipe',
      },
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE hr.professional_experience'),
      [
        '00000000-0000-4000-8000-000000000051',
        'Camara Municipal',
        'Coordenador',
        '2018-01-01',
        '2019-12-31',
        'Gestao de equipe',
      ],
    );
  });
});
