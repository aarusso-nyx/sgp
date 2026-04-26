import { RecruitmentService } from './recruitment.service';

describe('RecruitmentService', () => {
  const requestRow = (status = 'DRAFT') => ({
    id: 'req-1',
    requester_ref: 'usr-gestor-rh',
    branch_id: 'filial-1',
    work_location_id: 'lotacao-1',
    reason: 'AUMENTO_QUADRO',
    justification: 'Demanda crescente',
    request_date: new Date('2026-04-21T00:00:00.000Z'),
    due_date: status === 'CANCELED' ? null : '2026-05-30',
    status,
    completed_at: status === 'COMPLETED' ? '2026-06-01T10:00:00.000Z' : null,
    functions: JSON.stringify([
      {
        id: 'fn-1',
        funcaoId: 'funcao-1',
        tipoContratacao: 'EFETIVO',
        quantidadeVagas: 2,
        requisitos: 'Graduacao',
        turnoId: 'turno-1',
      },
      {
        id: 'fn-2',
        funcaoId: 'funcao-2',
        tipoContratacao: 'COMISSIONADO',
        quantidadeVagas: 1,
        requisitos: '',
        turnoId: null,
      },
      {
        id: 'fn-3',
        funcaoId: 'funcao-3',
        tipoContratacao: 'TERCEIRIZADO',
        quantidadeVagas: 1,
        requisitos: '',
        turnoId: null,
      },
      {
        id: 'fn-4',
        funcaoId: 'funcao-4',
        tipoContratacao: 'ESTAGIO',
        quantidadeVagas: 1,
        requisitos: '',
        turnoId: null,
      },
    ]),
  });
  const candidateRows = [
    {
      id: 'cand-1',
      requisicaoId: 'req-1',
      pessoaId: 'pessoa-1',
      curriculoS3Key: 'cv.pdf',
      situacao: 'PENDENTE',
      comentarioAnalise: '',
    },
    {
      id: 'cand-2',
      requisicaoId: 'req-1',
      pessoaId: 'pessoa-2',
      curriculoS3Key: null,
      situacao: 'APROVADO',
      comentarioAnalise: 'Aprovado',
    },
  ];

  const createQuery = (overrides: Record<string, unknown> = {}) =>
    jest.fn(async (sql: string, params?: unknown[]) => {
      const compact = sql.replace(/\s+/g, ' ');
      if (
        compact.includes('SELECT id, requester_ref, status::text AS status')
      ) {
        if (overrides.requestMissing) return [];
        return [
          {
            id: 'req-1',
            requester_ref: 'usr-gestor-rh',
            status: overrides.requestStatus ?? 'DRAFT',
          },
        ];
      }
      if (compact.includes('request_row.status::text AS request_status')) {
        if (overrides.candidateMissing) return [];
        return [
          {
            id: 'cand-1',
            request_id: 'req-1',
            request_status: overrides.requestStatus ?? 'IN_PROGRESS',
          },
        ];
      }
      if (compact.includes('count(*)::text AS total')) {
        return [{ total: overrides.approvedCount ?? '1' }];
      }
      if (compact.includes('UPDATE hr.recruitment_candidate')) {
        const statusMap: Record<string, string> = {
          PENDENTE: 'PENDING',
          APROVADO: 'APPROVED',
          REPROVADO: 'REJECTED',
        };
        return [
          {
            id: 'cand-1',
            request_id: 'req-1',
            person_ref: 'pessoa-1',
            curriculum_s3_key: 'cv.pdf',
            status: statusMap[String(params?.[1])],
            review_comment: String(params?.[2] ?? ''),
          },
        ];
      }
      if (compact.includes('inserted_candidates')) {
        return [{ candidates: JSON.stringify(candidateRows) }];
      }
      if (compact.includes("SET status = 'IN_PROGRESS'")) {
        return [requestRow('IN_PROGRESS')];
      }
      if (compact.includes("SET status = 'COMPLETED'")) {
        return [requestRow('COMPLETED')];
      }
      if (compact.includes('hr.recruitment_request')) {
        return [requestRow('DRAFT')];
      }
      return [];
    });

  it('creates a draft recruitment request summary', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'req-1',
        requester_ref: 'usr-gestor-rh',
        branch_id: 'filial-1',
        work_location_id: 'lotacao-1',
        reason: 'AUMENTO_QUADRO',
        justification: 'Demanda crescente',
        request_date: '2026-04-21',
        due_date: '2026-05-30',
        status: 'DRAFT',
        completed_at: null,
        functions: [
          {
            id: 'fn-1',
            funcaoId: 'funcao-1',
            tipoContratacao: 'EFETIVO',
            quantidadeVagas: 2,
            requisitos: 'Graduacao',
            turnoId: 'turno-1',
          },
        ],
      },
    ]);
    const service = new RecruitmentService({
      configured: true,
      query,
    } as never);

    const result = await service.createRequest({
      solicitanteId: 'usr-gestor-rh',
      filialId: 'filial-1',
      lotacaoId: 'lotacao-1',
      motivo: 'AUMENTO_QUADRO',
      justificativa: 'Demanda crescente',
      dataEntrada: '2026-04-21',
      dataLimite: '2026-05-30',
      funcoesRequisitadas: [
        {
          funcaoId: 'funcao-1',
          tipoContratacao: 'EFETIVO',
          quantidadeVagas: 2,
          requisitos: 'Graduacao',
          turnoId: 'turno-1',
        },
      ],
    });

    expect(result.situacao).toBe('RASCUNHO');
    expect(result.funcoesRequisitadas[0]?.tipoContratacao).toBe('EFETIVO');
  });

  it('runs the recruitment request lifecycle and candidate status mappings', async () => {
    const service = new RecruitmentService({
      configured: true,
      query: createQuery({ requestStatus: 'IN_PROGRESS' }),
    } as never);

    await expect(
      service.createRequest({
        solicitanteId: ' usr-gestor-rh ',
        filialId: 'filial-1',
        lotacaoId: 'lotacao-1',
        motivo: ' AUMENTO_QUADRO ',
        justificativa: ' Demanda crescente ',
        dataEntrada: '2026-04-21',
        dataLimite: '2026-05-30',
        funcoesRequisitadas: [
          { tipoContratacao: 'EFETIVO', quantidadeVagas: 2 },
          { tipoContratacao: 'COMISSIONADO', quantidadeVagas: 1 },
          { tipoContratacao: 'TERCEIRIZADO', quantidadeVagas: 1 },
          { tipoContratacao: 'ESTAGIO', quantidadeVagas: 1 },
        ],
      }),
    ).resolves.toMatchObject({ situacao: 'RASCUNHO' });
    await expect(
      new RecruitmentService({
        configured: true,
        query: createQuery({ requestStatus: 'DRAFT' }),
      } as never).forwardRequest('req-1', 'usr-gestor-rh'),
    ).resolves.toMatchObject({ situacao: 'EM_PROCESSO' });
    await expect(
      service.attachCandidates('req-1', {
        candidatos: [
          { pessoaId: ' pessoa-1 ', curriculoS3Key: 'cv.pdf' },
          { pessoaId: ' pessoa-2 ' },
        ],
      }),
    ).resolves.toHaveProperty('candidatos.1.situacao', 'APROVADO');

    for (const situacao of ['PENDENTE', 'APROVADO', 'REPROVADO'] as const) {
      await expect(
        service.updateCandidate('cand-1', {
          situacao,
          comentarioAnalise: `Status ${situacao}`,
        }),
      ).resolves.toHaveProperty('situacao', situacao);
    }

    await expect(service.concludeRequest('req-1')).resolves.toMatchObject({
      situacao: 'CONCLUIDO',
      concluidoEm: '2026-06-01T10:00:00.000Z',
    });
  });

  it('rejects invalid recruitment states and duplicate links', async () => {
    await expect(
      new RecruitmentService({ configured: false } as never).createRequest({
        solicitanteId: 'usr',
        motivo: 'motivo',
        justificativa: 'justificativa',
        dataEntrada: '2026-04-21',
        funcoesRequisitadas: [],
      }),
    ).rejects.toThrow('DATABASE_URL is required');
    await expect(
      new RecruitmentService({
        configured: true,
        query: createQuery({ requestMissing: true }),
      } as never).forwardRequest('missing'),
    ).rejects.toThrow('Recruitment request not found');
    await expect(
      new RecruitmentService({
        configured: true,
        query: createQuery({ requestStatus: 'IN_PROGRESS' }),
      } as never).forwardRequest('req-1'),
    ).rejects.toThrow('draft state');
    await expect(
      new RecruitmentService({
        configured: true,
        query: createQuery({ requestStatus: 'DRAFT' }),
      } as never).forwardRequest('req-1', 'outro-usuario'),
    ).rejects.toThrow('Only the request creator');
    await expect(
      new RecruitmentService({
        configured: true,
        query: createQuery({ requestStatus: 'DRAFT' }),
      } as never).attachCandidates('req-1', { candidatos: [] }),
    ).rejects.toThrow('in progress');
    await expect(
      new RecruitmentService({
        configured: true,
        query: createQuery({ candidateMissing: true }),
      } as never).updateCandidate('missing', { situacao: 'PENDENTE' }),
    ).rejects.toThrow('Recruitment candidate not found');
    await expect(
      new RecruitmentService({
        configured: true,
        query: createQuery({ requestStatus: 'COMPLETED' }),
      } as never).updateCandidate('cand-1', { situacao: 'PENDENTE' }),
    ).rejects.toThrow('while the request is in progress');
    await expect(
      new RecruitmentService({
        configured: true,
        query: createQuery({
          requestStatus: 'IN_PROGRESS',
          approvedCount: '0',
        }),
      } as never).concludeRequest('req-1'),
    ).rejects.toThrow('at least one approved candidate');
    await expect(
      new RecruitmentService({
        configured: true,
        query: jest.fn(async () => {
          throw { code: '23505' };
        }),
      } as never).createRequest({
        solicitanteId: 'usr',
        motivo: 'motivo',
        justificativa: 'justificativa',
        dataEntrada: '2026-04-21',
        funcoesRequisitadas: [],
      }),
    ).rejects.toThrow('already exists');
  });
});
