import { NotFoundException } from '@nestjs/common';

import { PerformanceEvaluationService } from './performance-evaluation.service';

describe('PerformanceEvaluationService', () => {
  const evaluationRow = {
    id: 'aval-1',
    employee_id: 'emp-1',
    employee_registration: '0001',
    employee_name: 'Maria Servidora',
    branch_id: 'fil-1',
    work_location_id: 'lot-1',
    job_position_id: 'cargo-1',
    job_function_id: 'funcao-1',
    period_label: '2026',
    score: '9.50',
    criteria: '[{"criterio":"entrega","nota":9.5}]',
    evaluator_ref: 'usr-avaliador',
    evaluated_on: '2026-05-01',
    status: 'APPROVED',
    notes: 'Excelente',
  };

  const createData = () => ({
    ensureDatabase: jest.fn(),
    query: jest.fn(async () => [evaluationRow]),
    employeeReference: jest.fn(async () => ({
      id: 'emp-1',
      registration: '0001',
      name: 'Maria Servidora',
      branch_id: 'fil-1',
      work_location_id: 'lot-1',
      job_position_id: 'cargo-1',
      job_function_id: 'funcao-1',
      salary_reference_id: 'ref-1',
    })),
    asArray: (value: unknown) =>
      typeof value === 'string' ? (JSON.parse(value) as unknown[]) : [],
    toIsoDate: (value: Date | string) =>
      new Date(value).toISOString().slice(0, 10),
    toEvaluationStatusDb: (status: string) =>
      ({ RASCUNHO: 'DRAFT', SUBMETIDA: 'SUBMITTED', APROVADA: 'APPROVED' })[
        status
      ] ?? 'REJECTED',
    toEvaluationStatusInput: (status: string) =>
      ({ DRAFT: 'RASCUNHO', SUBMITTED: 'SUBMETIDA', APPROVED: 'APROVADA' })[
        status
      ] ?? 'REPROVADA',
  });

  it('lists rows as public performance evaluation summaries', async () => {
    const data = createData();
    const service = new PerformanceEvaluationService(data as never);

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        id: 'aval-1',
        funcionarioId: 'emp-1',
        matricula: '0001',
        nota: 9.5,
        status: 'APROVADA',
        criterios: [{ criterio: 'entrega', nota: 9.5 }],
      }),
    ]);
  });

  it('creates performance evaluations using employee context', async () => {
    const data = createData();
    const service = new PerformanceEvaluationService(data as never);

    await expect(
      service.create({
        funcionarioId: 'emp-1',
        periodo: ' 2026 ',
        nota: 9.5,
        criterios: [{ criterio: 'entrega', nota: 9.5 }],
        avaliadorId: ' usr-avaliador ',
        dataAvaliacao: '2026-05-01',
        status: 'APROVADA',
        observacao: ' Excelente ',
      }),
    ).resolves.toHaveProperty('status', 'APROVADA');

    expect(data.employeeReference).toHaveBeenCalledWith('emp-1');
    expect(data.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.performance_evaluation'),
      expect.arrayContaining(['2026', '9.50', 'usr-avaliador', 'APPROVED']),
    );
  });

  it('throws when an update target does not exist', async () => {
    const data = createData();
    data.query.mockResolvedValueOnce([]);
    const service = new PerformanceEvaluationService(data as never);

    await expect(service.update('missing', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
