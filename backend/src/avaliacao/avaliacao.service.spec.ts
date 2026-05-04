import { AvaliacaoService } from './avaliacao.service';

describe('AvaliacaoService facade', () => {
  const performance = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const progressionSimulation = {
    listProgressions: jest.fn(),
    createProgression: jest.fn(),
    listSimulations: jest.fn(),
    createSimulation: jest.fn(),
  };
  const careerPlans = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const reports = {
    requestEvaluationSheet: jest.fn(),
    requestCycleReport: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('delegates performance evaluation methods without changing inputs', async () => {
    const service = new AvaliacaoService(
      performance as never,
      progressionSimulation as never,
      careerPlans as never,
      reports as never,
    );
    performance.list.mockResolvedValueOnce([{ id: 'aval-1' }]);
    performance.create.mockResolvedValueOnce({ id: 'aval-2' });
    performance.update.mockResolvedValueOnce({ id: 'aval-3' });

    await expect(service.listPerformanceEvaluations()).resolves.toEqual([
      { id: 'aval-1' },
    ]);
    await expect(
      service.createPerformanceEvaluation({
        funcionarioId: 'emp-1',
        periodo: '2026',
        nota: 9,
        criterios: [{ criterio: 'entrega', nota: 9 }],
        avaliadorId: 'usr-1',
        dataAvaliacao: '2026-05-01',
      }),
    ).resolves.toEqual({ id: 'aval-2' });
    await expect(
      service.updatePerformanceEvaluation('aval-1', { nota: 8 }),
    ).resolves.toEqual({ id: 'aval-3' });

    expect(performance.update).toHaveBeenCalledWith('aval-1', { nota: 8 });
  });

  it('delegates progression, simulation, career-plan, and report methods', async () => {
    const service = new AvaliacaoService(
      performance as never,
      progressionSimulation as never,
      careerPlans as never,
      reports as never,
    );
    progressionSimulation.listProgressions.mockResolvedValueOnce([
      { id: 'prog-1' },
    ]);
    progressionSimulation.createProgression.mockResolvedValueOnce({
      id: 'prog-2',
    });
    progressionSimulation.listSimulations.mockResolvedValueOnce([
      { id: 'sim-1' },
    ]);
    progressionSimulation.createSimulation.mockResolvedValueOnce({
      id: 'sim-2',
    });
    careerPlans.list.mockResolvedValueOnce([{ id: 'plan-1' }]);
    careerPlans.create.mockResolvedValueOnce({ id: 'plan-2' });
    careerPlans.update.mockResolvedValueOnce({ id: 'plan-3' });
    reports.requestEvaluationSheet.mockResolvedValueOnce({ id: 'request-1' });
    reports.requestCycleReport.mockResolvedValueOnce({ id: 'request-2' });

    await expect(service.listProgressions()).resolves.toEqual([
      { id: 'prog-1' },
    ]);
    await expect(
      service.createProgression({
        funcionarioId: 'emp-1',
        referenciaDestinoId: 'ref-2',
        dataVigencia: '2026-05-01',
        tipo: 'MERITO',
      }),
    ).resolves.toEqual({ id: 'prog-2' });
    await expect(service.listSimulations()).resolves.toEqual([{ id: 'sim-1' }]);
    await expect(
      service.createSimulation(
        { funcionarioId: 'emp-1', cenario: 'Base' },
        'u',
      ),
    ).resolves.toEqual({ id: 'sim-2' });
    await expect(service.listCareerPlans()).resolves.toEqual([
      { id: 'plan-1' },
    ]);
    await expect(
      service.createCareerPlan({
        nome: 'Plano',
        versao: '2026',
        dataVigencia: '2026-01-01',
      }),
    ).resolves.toEqual({ id: 'plan-2' });
    await expect(
      service.updateCareerPlan('plan-1', { nome: 'Plano atualizado' }),
    ).resolves.toEqual({ id: 'plan-3' });
    await expect(
      service.requestEvaluationSheet('aval-1', { formato: 'PDF' }),
    ).resolves.toEqual({ id: 'request-1' });
    await expect(
      service.requestCycleReport('2026', { lotacaoId: 'lot-1' }),
    ).resolves.toEqual({ id: 'request-2' });
  });
});
