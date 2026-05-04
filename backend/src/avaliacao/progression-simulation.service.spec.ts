import { BadRequestException } from '@nestjs/common';

import { AvaliacaoProgressionSimulationService } from './progression-simulation.service';

describe('AvaliacaoProgressionSimulationService', () => {
  const progressionRow = {
    id: 'prog-1',
    employee_id: 'emp-1',
    employee_registration: '0001',
    employee_name: 'Maria Servidora',
    performance_evaluation_id: 'aval-1',
    source_salary_reference_id: 'ref-1',
    source_salary_reference_code: 'R1',
    target_salary_reference_id: 'ref-2',
    target_salary_reference_code: 'R2',
    effective_on: '2026-05-01',
    appointment_act: 'Ato 1',
    kind: 'MERIT',
    justification: 'Justificativa',
    approved_by_ref: 'usr-aprovador',
  };
  const simulationRow = {
    id: 'sim-1',
    employee_id: 'emp-1',
    employee_registration: '0001',
    employee_name: 'Maria Servidora',
    scenario: 'Cenario',
    result_json: '{"projectedAmount":"1150.00"}',
    created_by_ref: 'usr-avaliador',
    created_at: '2026-05-01T12:00:00.000Z',
    adjustments: '[{"descricao":"Reajuste"}]',
  };

  const createData = () => ({
    ensureDatabase: jest.fn(),
    query: jest.fn(async (sql: string) =>
      sql.includes('salary_simulation') ? [simulationRow] : [progressionRow],
    ),
    employeeReference: jest.fn(async () => ({
      id: 'emp-1',
      registration: '0001',
      name: 'Maria Servidora',
      branch_id: null,
      work_location_id: null,
      job_position_id: null,
      job_function_id: null,
      salary_reference_id: 'ref-1',
    })),
    salaryReference: jest.fn(async (id: string) =>
      id === 'ref-1'
        ? { id, code: 'R1', description: 'Referencia 1', amount: '1000.00' }
        : { id, code: 'R2', description: 'Referencia 2', amount: '1150.00' },
    ),
    belongsToEmployee: jest.fn(async () => true),
    asArray: (value: unknown) =>
      typeof value === 'string'
        ? (JSON.parse(value) as unknown[])
        : (value as unknown[]),
    asObject: (value: unknown) =>
      typeof value === 'string'
        ? (JSON.parse(value) as Record<string, unknown>)
        : (value as Record<string, unknown>),
    toIso: (value: Date | string) => new Date(value).toISOString(),
    toIsoDate: (value: Date | string) =>
      new Date(value).toISOString().slice(0, 10),
    toMoney: (value: number) => value.toFixed(2),
    moneyDiff: (source: string, target: string) =>
      (Number(target) - Number(source)).toFixed(2),
    toProgressionKindDb: (kind: string) =>
      ({ MERITO: 'MERIT', TITULARIDADE: 'TITLE', JUDICIAL: 'JUDICIAL' })[
        kind
      ] ?? 'CORRECTION',
    toProgressionKindInput: (kind: string) =>
      ({ MERIT: 'MERITO', TITLE: 'TITULARIDADE', JUDICIAL: 'JUDICIAL' })[
        kind
      ] ?? 'CORRECAO',
  });

  it('lists progression and simulation summaries', async () => {
    const data = createData();
    const service = new AvaliacaoProgressionSimulationService(data as never);

    await expect(service.listProgressions()).resolves.toEqual([
      expect.objectContaining({ id: 'prog-1', tipo: 'MERITO' }),
    ]);
    await expect(service.listSimulations()).resolves.toEqual([
      expect.objectContaining({
        id: 'sim-1',
        resultado: { projectedAmount: '1150.00' },
      }),
    ]);
  });

  it('creates progression records and salary simulations', async () => {
    const data = createData();
    const service = new AvaliacaoProgressionSimulationService(data as never);

    await expect(
      service.createProgression({
        funcionarioId: 'emp-1',
        avaliacaoId: 'aval-1',
        referenciaDestinoId: 'ref-2',
        dataVigencia: '2026-05-01',
        tipo: 'MERITO',
      }),
    ).resolves.toHaveProperty('referenciaDestinoCodigo', 'R2');
    await expect(
      service.createSimulation(
        {
          funcionarioId: 'emp-1',
          cenario: ' Cenario ',
          ajustes: [
            { descricao: ' Reajuste ', percentual: '10', valorFixo: '50' },
          ],
        },
        'usr-avaliador',
      ),
    ).resolves.toHaveProperty('cenario', 'Cenario');

    expect(data.belongsToEmployee).toHaveBeenCalledWith(
      'hr.performance_evaluation',
      'aval-1',
      'emp-1',
    );
  });

  it('rejects progression tied to another employee evaluation', async () => {
    const data = createData();
    data.belongsToEmployee.mockResolvedValueOnce(false);
    const service = new AvaliacaoProgressionSimulationService(data as never);

    await expect(
      service.createProgression({
        funcionarioId: 'emp-1',
        avaliacaoId: 'aval-other',
        referenciaDestinoId: 'ref-2',
        dataVigencia: '2026-05-01',
        tipo: 'MERITO',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('handles optional progression inputs and zero-base simulations', async () => {
    const data = createData();
    data.employeeReference.mockResolvedValue({
      id: 'emp-1',
      registration: '0001',
      name: 'Maria Servidora',
      branch_id: null,
      work_location_id: null,
      job_position_id: null,
      job_function_id: null,
      salary_reference_id: null,
    });
    const service = new AvaliacaoProgressionSimulationService(data as never);

    await expect(
      service.createProgression({
        funcionarioId: 'emp-1',
        referenciaDestinoId: 'ref-2',
        dataVigencia: '2026-05-01',
        tipo: 'CORRECAO',
      }),
    ).resolves.toHaveProperty('referenciaDestinoCodigo', 'R2');
    expect(data.belongsToEmployee).not.toHaveBeenCalled();
    expect(data.query.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(['', 'CORRECTION', '', '']),
    );

    await expect(
      service.createSimulation({
        funcionarioId: 'emp-1',
        cenario: ' Sem referencia ',
        ajustes: [{ descricao: ' Sem ajuste ' }],
        contexto: { modo: 'zero-base' },
      }),
    ).resolves.toHaveProperty('cenario', 'Cenario');

    const simulationValues = data.query.mock.calls[1]?.[1] as readonly string[];
    expect(JSON.parse(simulationValues[2] ?? '{}')).toMatchObject({
      cenario: 'Sem referencia',
      baseSalaryReferenceId: null,
      baseAmount: '0.00',
      projectedAmount: '0.00',
      variationAmount: '0.00',
      variationPercent: 0,
      contexto: { modo: 'zero-base' },
    });
    expect(JSON.parse(simulationValues[4] ?? '[]')).toEqual([
      {
        descricao: 'Sem ajuste',
        percentual: null,
        valor_fixo: null,
      },
    ]);
    expect(simulationValues[3]).toBe('');
  });
});
