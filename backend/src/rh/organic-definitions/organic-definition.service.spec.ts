import { OrganicDefinitionService } from './organic-definition.service';

describe('OrganicDefinitionService', () => {
  const row = {
    id: '00000000-0000-4000-8000-000000000751',
    code: 'ORG-EDU-ANL',
    name: 'Analistas da Educacao',
    description: 'Quadro autorizado',
    work_location_id: '00000000-0000-4000-8000-000000000752',
    work_location_code: 'EDU',
    work_location_name: 'Secretaria de Educacao',
    job_position_id: '00000000-0000-4000-8000-000000000753',
    job_position_code: 'ANL',
    job_position_name: 'Analista',
    vacancies_total: 5,
    vacancies_filled: 2,
    vacancies_open: 3,
    effective_from: '2026-01-01',
    effective_to: null,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  const createService = () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('count(*)::text AS total')) return [{ total: '1' }];
      if (sql.includes('INSERT INTO hr.organic_definition')) {
        return [{ id: row.id }];
      }
      if (sql.includes('UPDATE hr.organic_definition')) {
        return [{ id: row.id }];
      }
      if (sql.includes('FROM hr.organic_definition od')) return [row];
      return [];
    });
    const service = new OrganicDefinitionService({
      configured: true,
      query,
    } as never);
    return { service, query };
  };

  it('lists organic definitions with staffing totals', async () => {
    const { service } = createService();

    const result = await service.list({ search: 'educacao' });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      code: 'ORG-EDU-ANL',
      workLocationCode: 'EDU',
      jobPositionCode: 'ANL',
      vacanciesOpen: 3,
    });
  });

  it('creates a definition and derives open vacancies', async () => {
    const { service, query } = createService();

    const result = await service.create({
      code: 'ORG-EDU-ANL',
      name: 'Analistas da Educacao',
      workLocationId: row.work_location_id,
      jobPositionId: row.job_position_id,
      vacanciesTotal: 5,
      vacanciesFilled: 2,
      effectiveFrom: '2026-01-01',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.organic_definition'),
      expect.arrayContaining([5, 2, 3]),
    );
    expect(result).toMatchObject({ id: row.id, vacanciesOpen: 3 });
  });

  it('rejects filled vacancies above the organic total', async () => {
    const { service } = createService();

    await expect(
      service.create({
        code: 'ORG-EDU-ANL',
        name: 'Analistas da Educacao',
        workLocationId: row.work_location_id,
        jobPositionId: row.job_position_id,
        vacanciesTotal: 1,
        vacanciesFilled: 2,
      }),
    ).rejects.toThrow('Filled vacancies cannot exceed total vacancies');
  });
});
