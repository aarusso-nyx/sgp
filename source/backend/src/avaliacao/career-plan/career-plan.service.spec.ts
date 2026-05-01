import { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { CareerPlanService } from './career-plan.service';

const planRow = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'PCCS Municipal',
  instituting_law: 'Lei 1/2026',
  starts_on: '2026-01-01',
  ends_on: null,
  class_count: 3,
  reference_count: 5,
  progression_rule: '# Regra',
  job_position_ids: ['22222222-2222-4222-8222-222222222222'],
  salary_range_ids: ['33333333-3333-4333-8333-333333333333'],
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
};

describe('CareerPlanService', () => {
  const query = jest.fn();
  const client = { query } as unknown as PoolClient;
  const database = {
    query: jest.fn(),
    transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
      callback(client),
    ),
  } as unknown as jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a PCCS plan, links job positions and salary range, and appends audit', async () => {
    query
      .mockResolvedValueOnce({ rows: [planRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [planRow] })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-1' }] });

    const service = new CareerPlanService(database);
    const created = await service.create({
      name: 'PCCS Municipal',
      institutingLaw: 'Lei 1/2026',
      startsOn: '2026-01-01',
      classCount: 3,
      referenceCount: 5,
      progressionRule: '# Regra',
      jobPositionIds: ['22222222-2222-4222-8222-222222222222'],
      salaryRangeId: '33333333-3333-4333-8333-333333333333',
    });

    expect(created).toMatchObject({ id: planRow.id, classCount: 3 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('avaliacao.career_plan_job_position'),
      expect.arrayContaining([planRow.id]),
    );
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('sgp_append_audit_event'),
      expect.arrayContaining(['avaliacao.pccs.created']),
    );
  });

  it('returns a progression trail with the current employee step highlighted', async () => {
    (database.query as jest.Mock).mockResolvedValueOnce([
      {
        career_plan_id: planRow.id,
        career_plan_name: 'PCCS Municipal',
        progression_rule: '# Regra',
        job_position_id: '22222222-2222-4222-8222-222222222222',
        job_position_code: 'ANA',
        job_position_name: 'Analista',
        level_id: '44444444-4444-4444-8444-444444444444',
        class_number: 1,
        level_number: 1,
        base_salary: '2500.00',
        is_current: true,
      },
    ]);

    const service = new CareerPlanService(database);
    await expect(
      service.trail(planRow.id, '55555555-5555-4555-8555-555555555555'),
    ).resolves.toMatchObject({
      current: { classNumber: 1, referenceNumber: 1, current: true },
    });
  });
});
