import { AvaliacaoService } from './avaliacao.service';

describe('AvaliacaoService', () => {
  const employee = {
    id: 'emp-1',
    registration: '0001',
    name: 'Maria Servidora',
    branch_id: 'fil-1',
    work_location_id: 'lot-1',
    job_position_id: 'cargo-1',
    job_function_id: 'funcao-1',
    salary_reference_id: 'ref-1',
  };
  const salaryReference = {
    id: 'ref-1',
    code: 'R1',
    description: 'Referencia 1',
    amount: '1000.00',
  };
  const evaluationRows = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(
    (status, index) => ({
      id: `aval-${index}`,
      employee_id: employee.id,
      employee_registration: employee.registration,
      employee_name: employee.name,
      branch_id: employee.branch_id,
      work_location_id: employee.work_location_id,
      job_position_id: employee.job_position_id,
      job_function_id: employee.job_function_id,
      period_label: '2026',
      score: String(7 + index),
      criteria:
        index === 0 ? '[{"criterio":"entrega"}]' : [{ criterio: 'entrega' }],
      evaluator_ref: 'usr-avaliador',
      evaluated_on: '2026-04-25',
      status,
      notes: 'Observacao',
    }),
  );
  const progressionRows = ['MERIT', 'TITLE', 'JUDICIAL', 'CORRECTION'].map(
    (kind, index) => ({
      id: `prog-${index}`,
      employee_id: employee.id,
      employee_registration: employee.registration,
      employee_name: employee.name,
      performance_evaluation_id: 'aval-1',
      source_salary_reference_id: 'ref-1',
      source_salary_reference_code: 'R1',
      target_salary_reference_id: 'ref-2',
      target_salary_reference_code: 'R2',
      effective_on: '2026-05-01',
      appointment_act: 'Ato 1',
      kind,
      justification: 'Justificativa',
      approved_by_ref: 'usr-aprovador',
    }),
  );
  const simulationRow = {
    id: 'sim-1',
    employee_id: employee.id,
    employee_registration: employee.registration,
    employee_name: employee.name,
    scenario: 'Cenario 1',
    result_json: '{"projectedAmount":"1150.00"}',
    created_by_ref: 'usr-avaliador',
    created_at: '2026-04-25T10:00:00.000Z',
    adjustments: '[{"descricao":"Reajuste","percentual":"10.0000"}]',
  };
  const careerPlanRow = {
    id: 'plan-1',
    employee_id: employee.id,
    employee_registration: employee.registration,
    employee_name: employee.name,
    name: 'Plano',
    version: '2026',
    effective_on: '2026-01-01',
    levels_json: '{"A":1}',
    references_json: { R1: 'ref-1' },
    active: true,
  };
  const requestRow = {
    id: 'request-1',
    status: 'REQUESTED',
    requested_at: '2026-04-25T10:00:00.000Z',
  };

  const createQuery = (overrides: Record<string, unknown> = {}) =>
    jest.fn(async (sql: string) => {
      const compact = sql.replace(/\s+/g, ' ');
      if (compact.includes('INSERT INTO public.report_request')) {
        return [requestRow];
      }
      if (compact.includes('FROM public.report_definition')) {
        return [{ id: 'definition-1' }];
      }
      if (compact.includes('SELECT 1 FROM hr.performance_evaluation')) {
        if (compact.includes('employee_id')) {
          return overrides.belongsToEmployee === false ? [] : [{}];
        }
        return overrides.missingEvaluation ? [] : [{}];
      }
      if (
        compact.includes('FROM hr.employee') &&
        compact.includes('WHERE id = $1::uuid')
      ) {
        return overrides.employee === null
          ? []
          : [overrides.employee ?? employee];
      }
      if (
        compact.includes('FROM hr.salary_reference') &&
        compact.includes('WHERE id = $1::uuid')
      ) {
        return overrides.salaryReference === null
          ? []
          : [overrides.salaryReference ?? salaryReference];
      }
      if (compact.includes('hr.performance_evaluation')) {
        return evaluationRows;
      }
      if (compact.includes('hr.merit_progression')) {
        return progressionRows;
      }
      if (compact.includes('hr.salary_simulation')) {
        return [simulationRow];
      }
      if (compact.includes('hr.career_plan')) {
        return [careerPlanRow];
      }
      return [];
    });

  it('creates a performance evaluation summary', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: '0001',
          name: 'Maria Servidora',
          branch_id: 'fil-1',
          work_location_id: 'lot-1',
          job_position_id: 'cargo-1',
          job_function_id: 'funcao-1',
          salary_reference_id: 'ref-1',
        },
      ])
      .mockResolvedValueOnce([
        {
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
          criteria: [{ criterio: 'entrega', nota: 9.5 }],
          evaluator_ref: 'usr-avaliador',
          evaluated_on: '2026-04-25',
          status: 'APPROVED',
          notes: 'Excelente desempenho',
        },
      ]);
    const service = new AvaliacaoService({ configured: true, query } as never);

    const result = await service.createPerformanceEvaluation({
      funcionarioId: 'emp-1',
      periodo: '2026',
      nota: 9.5,
      criterios: [{ criterio: 'entrega', nota: 9.5 }],
      avaliadorId: 'usr-avaliador',
      dataAvaliacao: '2026-04-25',
      status: 'APROVADA',
      observacao: 'Excelente desempenho',
    });

    expect(result.status).toBe('APROVADA');
    expect(result.matricula).toBe('0001');
  });

  it('lists avaliacao records with status and progression mappings', async () => {
    const service = new AvaliacaoService({
      configured: true,
      query: createQuery(),
    } as never);

    await expect(service.listPerformanceEvaluations()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'RASCUNHO' }),
        expect.objectContaining({ status: 'SUBMETIDA' }),
        expect.objectContaining({ status: 'APROVADA' }),
        expect.objectContaining({ status: 'REPROVADA' }),
      ]),
    );
    await expect(service.listProgressions()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'MERITO' }),
        expect.objectContaining({ tipo: 'TITULARIDADE' }),
        expect.objectContaining({ tipo: 'JUDICIAL' }),
        expect.objectContaining({ tipo: 'CORRECAO' }),
      ]),
    );
    await expect(service.listSimulations()).resolves.toMatchObject([
      { resultado: { projectedAmount: '1150.00' } },
    ]);
    await expect(service.listCareerPlans()).resolves.toMatchObject([
      { nome: 'Plano', niveis: { A: 1 } },
    ]);
  });

  it('creates and updates avaliacao runtime records', async () => {
    const query = createQuery();
    const service = new AvaliacaoService({
      configured: true,
      query,
    } as never);

    for (const status of [
      'RASCUNHO',
      'SUBMETIDA',
      'APROVADA',
      'REPROVADA',
    ] as const) {
      await expect(
        service.createPerformanceEvaluation({
          funcionarioId: employee.id,
          periodo: ' 2026 ',
          nota: 8.75,
          criterios: [{ criterio: 'entrega', nota: 8.75 }],
          avaliadorId: ' usr-avaliador ',
          dataAvaliacao: '2026-04-25',
          status,
          observacao: ' Observacao ',
        }),
      ).resolves.toHaveProperty('matricula', employee.registration);
      await expect(
        service.updatePerformanceEvaluation('aval-1', {
          nota: 9,
          criterios: [{ criterio: 'entrega', nota: 9 }],
          status,
          dataAvaliacao: '2026-04-26',
          observacao: 'Atualizada',
        }),
      ).resolves.toHaveProperty('status', 'RASCUNHO');
    }

    for (const tipo of [
      'MERITO',
      'TITULARIDADE',
      'JUDICIAL',
      'CORRECAO',
    ] as const) {
      await expect(
        service.createProgression({
          funcionarioId: employee.id,
          avaliacaoId: 'aval-1',
          referenciaDestinoId: 'ref-2',
          dataVigencia: '2026-05-01',
          atoNomeacao: ' Ato 1 ',
          tipo,
          justificativa: ' Justificativa ',
          aprovadoPorId: 'usr-aprovador',
        }),
      ).resolves.toHaveProperty('tipo', 'MERITO');
    }

    await expect(
      service.createSimulation(
        {
          funcionarioId: employee.id,
          cenario: ' Cenario 1 ',
          ajustes: [
            { descricao: ' Reajuste ', percentual: '10', valorFixo: '50' },
            { descricao: ' Fixo ', valorFixo: '25' },
          ],
          contexto: { origem: 'spec' },
        },
        'usr-avaliador',
      ),
    ).resolves.toHaveProperty('cenario', 'Cenario 1');
    await expect(
      service.createCareerPlan({
        funcionarioId: employee.id,
        nome: ' Plano ',
        versao: ' 2026 ',
        dataVigencia: '2026-01-01',
        niveis: { A: 1 },
        referencias: { R1: 'ref-1' },
        ativo: true,
      }),
    ).resolves.toHaveProperty('nome', 'Plano');
    await expect(
      service.updateCareerPlan('plan-1', {
        nome: 'Plano atualizado',
        versao: '2026.1',
        dataVigencia: '2026-02-01',
        niveis: { B: 2 },
        referencias: { R2: 'ref-2' },
        ativo: false,
      }),
    ).resolves.toHaveProperty('ativo', true);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.merit_progression'),
      expect.any(Array),
    );
  });

  it('applies defaults for sparse avaliacao inputs', async () => {
    const query = createQuery({
      employee: {
        ...employee,
        branch_id: null,
        work_location_id: null,
        job_position_id: null,
        job_function_id: null,
        salary_reference_id: null,
      },
    });
    const service = new AvaliacaoService({
      configured: true,
      query,
    } as never);

    await expect(
      service.createPerformanceEvaluation({
        funcionarioId: employee.id,
        periodo: '2026',
        nota: 8,
        criterios: [],
        avaliadorId: 'usr-avaliador',
        dataAvaliacao: '2026-04-25',
      }),
    ).resolves.toHaveProperty('id', evaluationRows[0].id);
    await expect(
      service.updatePerformanceEvaluation('aval-1', {}),
    ).resolves.toHaveProperty('id', evaluationRows[0].id);
    await expect(
      service.createProgression({
        funcionarioId: employee.id,
        referenciaDestinoId: 'ref-2',
        dataVigencia: '2026-05-01',
        tipo: 'MERITO',
      }),
    ).resolves.toHaveProperty('id', progressionRows[0].id);
    await expect(
      service.createSimulation({
        funcionarioId: employee.id,
        cenario: 'Base',
      }),
    ).resolves.toHaveProperty('id', simulationRow.id);
    await expect(
      service.createCareerPlan({
        nome: 'Plano geral',
        versao: '2026',
        dataVigencia: '2026-01-01',
      }),
    ).resolves.toHaveProperty('id', careerPlanRow.id);
    await expect(
      service.requestEvaluationSheet('aval-1', {}),
    ).resolves.toHaveProperty('id', requestRow.id);
    await expect(
      service.requestCycleReport('2026', {}),
    ).resolves.toHaveProperty('id', requestRow.id);
  });

  it('requests reports and handles missing avaliacao dependencies', async () => {
    await expect(
      new AvaliacaoService({
        configured: true,
        query: createQuery(),
      } as never).requestEvaluationSheet('aval-1', { formato: 'PDF' }),
    ).resolves.toHaveProperty('id', 'request-1');
    await expect(
      new AvaliacaoService({
        configured: true,
        query: createQuery(),
      } as never).requestCycleReport('2026', {
        formato: 'PDF',
        lotacaoId: 'lot-1',
      }),
    ).resolves.toHaveProperty('status', 'REQUESTED');
    await expect(
      new AvaliacaoService({
        configured: false,
      } as never).listPerformanceEvaluations(),
    ).rejects.toThrow('DATABASE_URL is not configured');
    await expect(
      new AvaliacaoService({
        configured: true,
        query: createQuery({ employee: null }),
      } as never).createPerformanceEvaluation({
        funcionarioId: 'missing',
        periodo: '2026',
        nota: 8,
        criterios: [],
        avaliadorId: 'usr-avaliador',
        dataAvaliacao: '2026-04-25',
      }),
    ).rejects.toThrow('Employee not found');
    await expect(
      new AvaliacaoService({
        configured: true,
        query: createQuery({ salaryReference: null }),
      } as never).createProgression({
        funcionarioId: employee.id,
        referenciaDestinoId: 'missing',
        dataVigencia: '2026-05-01',
        tipo: 'MERITO',
      }),
    ).rejects.toThrow('Salary reference not found');
    await expect(
      new AvaliacaoService({
        configured: true,
        query: createQuery({ belongsToEmployee: false }),
      } as never).createProgression({
        funcionarioId: employee.id,
        avaliacaoId: 'aval-other',
        referenciaDestinoId: 'ref-2',
        dataVigencia: '2026-05-01',
        tipo: 'MERITO',
      }),
    ).rejects.toThrow('Performance evaluation does not belong to employee');
    await expect(
      new AvaliacaoService({
        configured: true,
        query: createQuery({ missingEvaluation: true }),
      } as never).requestEvaluationSheet('missing', {}),
    ).rejects.toThrow('Performance evaluation not found');
    await expect(
      new AvaliacaoService({
        configured: true,
        query: jest.fn(async (sql: string) =>
          sql.includes('FROM hr.career_plan') ? [careerPlanRow] : [],
        ),
      } as never).updateCareerPlan('plan-1', { nome: 'Fallback' }),
    ).resolves.toHaveProperty('id', 'plan-1');
    await expect(
      new AvaliacaoService({
        configured: true,
        query: jest.fn(async () => []),
      } as never).updatePerformanceEvaluation('missing', {}),
    ).rejects.toThrow('Performance evaluation not found');
  });
});
