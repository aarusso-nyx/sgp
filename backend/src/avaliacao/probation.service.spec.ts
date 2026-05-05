import { BadRequestException } from '@nestjs/common';

import { ProbationService } from './probation.service';
import { TEST_INSTANT_2026_05_01T00_00_00Z } from '../../../tests/backend/helpers/date-fixtures';

describe('ProbationService', () => {
  it('creates a statutory probation evaluation for a 36 month period', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'prob-1',
        employee_id: 'emp-1',
        employee_registration: '0001',
        employee_name: 'Maria Servidora',
        period_start: '2023-05-01',
        period_end: '2026-05-01',
        score: '9.00',
        decision: 'approved',
        evaluator_id: '00000000-0000-4000-8000-000000000001',
        notes: 'Apta',
      },
    ]);
    const service = new ProbationService({ configured: true, query } as never);

    await expect(
      service.createEvaluation({
        funcionarioId: 'emp-1',
        periodoInicio: '2023-05-01',
        periodoFim: '2026-05-01',
        nota: 9,
        decisao: 'approved',
        avaliadorId: '00000000-0000-4000-8000-000000000001',
        observacao: 'Apta',
      }),
    ).resolves.toMatchObject({
      id: 'prob-1',
      funcionarioId: 'emp-1',
      decisao: 'approved',
    });
    expect(query.mock.calls[0]?.[0]).toContain(
      "link.contract_type = 'statutory'",
    );
  });

  it('rejects probation evaluations outside 12, 24, or 36 month periods', async () => {
    const service = new ProbationService({ configured: true } as never);

    await expect(
      service.createEvaluation({
        funcionarioId: 'emp-1',
        periodoInicio: '2026-01-01',
        periodoFim: '2026-07-01',
        nota: 7,
        decisao: 'pending',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finds statutory employees completing 36 months within the cron window', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        employee_id: 'emp-1',
        registration: '0001',
        name: 'Maria Servidora',
        exercise_on: '2023-05-01',
        completes_on: '2026-05-01',
        days_until_completion: 0,
      },
    ]);
    const service = new ProbationService({ configured: true, query } as never);

    await expect(
      service.listDueForCompletion(new Date(TEST_INSTANT_2026_05_01T00_00_00Z)),
    ).resolves.toEqual([
      expect.objectContaining({
        funcionarioId: 'emp-1',
        completaEm: '2026-05-01',
        diasParaConclusao: 0,
      }),
    ]);
  });
});
