import { BadRequestException } from '@nestjs/common';
import type { PoolClient } from 'pg';

import { SalaryHistoryService } from './salary-history.service';

describe('SalaryHistoryService', () => {
  it('closes previous salary validity before inserting a mass adjustment', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              salary_range_id: '22222222-2222-4222-8222-222222222222',
              current_salary: '1000.00',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              salary_range_level_id: '11111111-1111-4111-8111-111111111111',
              vencimento_basico: '1100.00',
            },
          ],
        })
        .mockResolvedValue({ rows: [] }),
    };
    const database = {
      transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
        callback(client as unknown as PoolClient),
      ),
    };
    const service = new SalaryHistoryService(database as never);

    const result = await service.applyMassAdjustment({
      percentual: '10.000000',
      vigenciaInicio: '2025-03-01',
      leiReferencia: 'LC 001/2025',
      escopo: { salaryRangeId: '22222222-2222-4222-8222-222222222222' },
    });

    expect(result).toMatchObject({
      affectedCount: 1,
      affectedLevels: [{ baseSalary: '1100.00' }],
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "vigencia_fim = ($2::date - INTERVAL '1 day')::date",
      ),
      ['11111111-1111-4111-8111-111111111111', '2025-03-01'],
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('sgp_append_audit_event'),
      expect.arrayContaining([
        '33333333-3333-4333-8333-333333333333',
        '11111111-1111-4111-8111-111111111111',
      ]),
    );
  });

  it('requires a career plan or salary range scope', async () => {
    const service = new SalaryHistoryService({} as never);

    await expect(
      service.applyMassAdjustment({
        percentual: '10',
        vigenciaInicio: '2025-03-01',
        leiReferencia: 'LC 001/2025',
        escopo: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
