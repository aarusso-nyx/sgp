import { NotFoundException } from '@nestjs/common';

import { CareerPlanRuntimeService } from './career-plan-runtime.service';

describe('CareerPlanRuntimeService', () => {
  const planRow = {
    id: 'plan-1',
    employee_id: 'emp-1',
    employee_registration: '0001',
    employee_name: 'Maria Servidora',
    name: 'Plano',
    version: '2026',
    effective_on: '2026-01-01',
    levels_json: '{"A":1}',
    references_json: { R1: 'ref-1' },
    active: true,
  };

  const createData = () => ({
    ensureDatabase: jest.fn(),
    query: jest.fn(async () => [planRow]),
    employeeReference: jest.fn(async () => ({
      id: 'emp-1',
      registration: '0001',
      name: 'Maria Servidora',
      branch_id: null,
      work_location_id: null,
      job_position_id: null,
      job_function_id: null,
      salary_reference_id: null,
    })),
    asObject: (value: unknown) =>
      typeof value === 'string'
        ? (JSON.parse(value) as Record<string, unknown>)
        : (value as Record<string, unknown>),
    toIsoDate: (value: Date | string) =>
      new Date(value).toISOString().slice(0, 10),
  });

  it('lists and creates career-plan runtime summaries', async () => {
    const data = createData();
    const service = new CareerPlanRuntimeService(data as never);

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        id: 'plan-1',
        funcionarioId: 'emp-1',
        niveis: { A: 1 },
        referencias: { R1: 'ref-1' },
      }),
    ]);
    await expect(
      service.create({
        funcionarioId: 'emp-1',
        nome: ' Plano ',
        versao: ' 2026 ',
        dataVigencia: '2026-01-01',
        niveis: { A: 1 },
        referencias: { R1: 'ref-1' },
      }),
    ).resolves.toHaveProperty('nome', 'Plano');

    expect(data.employeeReference).toHaveBeenCalledWith('emp-1');
    expect(data.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.career_plan'),
      expect.arrayContaining(['Plano', '2026']),
    );
  });

  it('falls back to read-only lookup when update row is not returned', async () => {
    const data = createData();
    data.query.mockResolvedValueOnce([]).mockResolvedValueOnce([planRow]);
    const service = new CareerPlanRuntimeService(data as never);

    await expect(
      service.update('plan-1', { nome: 'Plano atualizado' }),
    ).resolves.toHaveProperty('id', 'plan-1');
  });

  it('throws when update cannot find the career plan', async () => {
    const data = createData();
    data.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const service = new CareerPlanRuntimeService(data as never);

    await expect(service.update('missing', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates global career plans with defaulted maps and explicit inactive state', async () => {
    const data = createData();
    const service = new CareerPlanRuntimeService(data as never);

    await expect(
      service.create({
        nome: ' Plano geral ',
        versao: ' 2026 ',
        dataVigencia: '2026-01-01',
        ativo: false,
      }),
    ).resolves.toHaveProperty('id', 'plan-1');

    expect(data.employeeReference).not.toHaveBeenCalled();
    expect(data.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.career_plan'),
      ['', 'Plano geral', '2026', '2026-01-01', '{}', '{}', false, null, null],
    );
  });
});
