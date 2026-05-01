import type { PoolClient } from 'pg';

import { SalaryRangeService } from './salary-range.service';

describe('SalaryRangeService', () => {
  it('creates a salary range level with class and level uniqueness', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'level-1',
            salary_range_id: 'range-1',
            code: 'A-1',
            name: 'Classe A Nivel 1',
            description: '',
            class_number: 1,
            level_number: 1,
            base_salary: '4200.00',
          },
        ],
      });
    const client = { query } as unknown as PoolClient;
    const database = {
      transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
        callback(client),
      ),
    };
    const service = new SalaryRangeService(database as never);

    await expect(
      service.createLevel({
        salaryRangeId: 'range-1',
        code: 'A-1',
        name: 'Classe A Nivel 1',
        classNumber: 1,
        levelNumber: 1,
        baseSalary: '4200.00',
      }),
    ).resolves.toMatchObject({ classNumber: 1, baseSalary: '4200.00' });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('level_number_fol02 = $3'),
      ['range-1', 1, 1],
    );
  });
});
