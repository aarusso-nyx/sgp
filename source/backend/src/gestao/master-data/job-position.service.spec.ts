import type { PoolClient } from 'pg';

import { JobPositionService } from './job-position.service';

describe('JobPositionService', () => {
  it('creates a job position and appends before/after audit metadata', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'position-1',
            code: 'ANA',
            name: 'Analista',
            description: '',
            category: 'efetivo',
            legal_regime: 'estatutario',
            creation_law: 'Lei 1/2026',
            vacancies_count: 4,
            salary_range_id: 'range-1',
            salary_range_code: null,
            created_at: new Date('2026-01-01T00:00:00Z'),
            updated_at: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-1' }] });
    const client = { query } as unknown as PoolClient;
    const database = {
      transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
        callback(client),
      ),
    };
    const service = new JobPositionService(database as never);

    const result = await service.create({
      code: 'ANA',
      name: 'Analista',
      category: 'efetivo',
      legalRegime: 'estatutario',
      creationLaw: 'Lei 1/2026',
      vacanciesCount: 4,
      salaryRangeId: 'range-1',
    });

    expect(result).toMatchObject({ code: 'ANA', salaryRangeId: 'range-1' });
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('sgp_append_audit_event'),
      expect.arrayContaining(['gestao.cargo.created']),
    );
  });
});
