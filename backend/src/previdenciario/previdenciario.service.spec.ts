import {
  TEST_DATE_1960_04_20,
  TEST_DATE_1962_01_01,
  TEST_DATE_1964_01_01,
  TEST_DATE_1965_01_01,
  TEST_DATE_1972_01_01,
  TEST_DATE_1985_01_01,
  TEST_DATE_1985_03_01,
  TEST_DATE_1989_01_01,
  TEST_DATE_1990_01_01,
  TEST_DATE_1994_01_01,
  TEST_DATE_1995_01_01,
  TEST_DATE_1998_01_01,
  TEST_DATE_2000_01_01,
  TEST_DATE_2010_01_01,
  TEST_DATE_2012_01_01,
  TEST_DATE_2020_01_01,
  TEST_DATE_2023_01_01,
  TEST_DATE_2025_01_01,
  TEST_DATE_2026_01_01,
  TEST_DATE_2026_04_25,
  TEST_DATE_2026_10_25,
  TEST_DATE_2026_12_31,
  TEST_INSTANT_2026_04_25_10_00_00_000Z,
} from './../../../tests/backend/helpers/date-fixtures';
import { PrevidenciarioService } from './previdenciario.service';

describe('PrevidenciarioService', () => {
  const employee = {
    id: 'emp-1',
    registration: '0001',
    name: 'Servidor Aposentavel',
    birth_date: TEST_DATE_1960_04_20,
    hired_on: TEST_DATE_1985_03_01,
    cpf: '00011122233',
  };
  const rule = {
    id: 'regra-1',
    name: 'Voluntaria integral',
    legal_basis: 'Lei 1',
    age_criteria: { minYears: 65 },
    contribution_time_criteria: { minYears: 35 },
    grace_period_criteria: '{}',
    applicable_employment_link: null,
    active: true,
  };
  const simulation = {
    id: 'sim-1',
    employee_id: employee.id,
    registration: employee.registration,
    employee_name: employee.name,
    rule_id: rule.id,
    rule_name: rule.name,
    result: {
      elegivel: true,
      idadeAnos: 66,
      tempoContribuicao: 41,
      proventoEstimado: 4920,
    },
    details_json: '{"criteriosAtendidos":["IDADE_MINIMA"]}',
    simulated_on: TEST_INSTANT_2026_04_25_10_00_00_000Z,
    created_by_ref: 'usr-previd',
  };
  const retirementGrant = {
    id: 'grant-1',
    employee_id: employee.id,
    registration: employee.registration,
    employee_name: employee.name,
    rule_id: rule.id,
    rule_name: rule.name,
    granted_on: TEST_DATE_2026_04_25,
    legal_basis: 'Lei 1',
    appointment_act: 'Ato 1',
    status: 'CONCEDIDA',
    notes: 'Observacao',
    granted_by_ref: 'usr-previd',
  };
  const pension = {
    id: 'pension-1',
    instituting_employee_id: employee.id,
    registration: employee.registration,
    employee_name: employee.name,
    beneficiary_name: 'Beneficiario',
    beneficiary_cpf: '12345678901',
    kinship: 'CONJUGE',
    benefit_type: 'PENSAO',
    apportionment_type: 'PERCENTUAL',
    share_percent: '50.5',
    adjustment_mode: 'PARIDADE',
    nature: 'VITALICIA',
    granted_on: TEST_DATE_2026_04_25,
    ceased_on: null,
    legal_basis: 'Lei 1',
    notes: 'Observacao',
  };
  const certificate = {
    id: 'ctc-1',
    employee_id: employee.id,
    registration: employee.registration,
    employee_name: employee.name,
    period_start: TEST_DATE_2000_01_01,
    period_end: TEST_DATE_2026_01_01,
    issuing_agency: 'RPPS',
    issuance_act: 'Ato CTC',
    storage_key: 'ctc.pdf',
    issued_at: TEST_INSTANT_2026_04_25_10_00_00_000Z,
    issued_by_ref: 'usr-previd',
  };
  const declaration = {
    id: 'decl-1',
    employee_id: employee.id,
    registration: employee.registration,
    employee_name: employee.name,
    type: 'TEMPO_CONTRIBUICAO',
    issued_at: TEST_INSTANT_2026_04_25_10_00_00_000Z,
    storage_key: 'decl.pdf',
    issued_by_ref: 'usr-previd',
  };
  const compensationRows = [
    'DRAFT',
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'SETTLED',
  ].map((status, index) => ({
    id: `comp-${index}`,
    employee_id: employee.id,
    registration: employee.registration,
    employee_name: employee.name,
    certificate_ref: 'CTC-1',
    origin_regime: 'RGPS',
    amount: String(1000 + index),
    status,
    notes: 'Observacao',
  }));
  const campaignRows = ['RETIREE', 'PENSIONER', 'UNIVERSITY_PENSIONER'].map(
    (type, index) => ({
      id: `campaign-${index}`,
      type,
      cycle_start: TEST_DATE_2026_01_01,
      cycle_end: TEST_DATE_2026_12_31,
      filter_json: index === 0 ? '{"active":true}' : { active: true },
      active: true,
    }),
  );
  const beneficiaryRows = [
    'PENDING',
    'RECERTIFIED',
    'NEAR_DUE',
    'OVERDUE',
    'BLOCKED',
  ].map((status, index) => ({
    id: `beneficiary-${index}`,
    employee_id: employee.id,
    registration: employee.registration,
    employee_name: employee.name,
    campaign_id: 'campaign-1',
    type: campaignRows[index % campaignRows.length].type,
    next_due_date: TEST_DATE_2026_10_25,
    status,
  }));
  const recertificationRecord = {
    id: 'record-1',
    beneficiary_id: 'beneficiary-1',
    recertified_on: TEST_DATE_2026_04_25,
    operator_ref: 'operator-1',
    snapshot_json: { ok: true },
    receipt_storage_key: 'receipt.pdf',
  };
  const lifeProof = {
    id: 'proof-1',
    beneficiary_id: 'beneficiary-1',
    channel: 'APP',
    authentication_json: '{"score":1}',
    proven_at: TEST_INSTANT_2026_04_25_10_00_00_000Z,
  };
  const contactHistory = {
    id: 'contact-1',
    beneficiary_id: 'beneficiary-1',
    employee_id: employee.id,
    registration: employee.registration,
    employee_name: employee.name,
    contacted_on: TEST_DATE_2026_04_25,
    user_ref: 'operator-1',
    notes: 'Contato realizado',
  };
  const requestRow = {
    id: 'request-1',
    status: 'REQUESTED',
    requested_at: TEST_INSTANT_2026_04_25_10_00_00_000Z,
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
      if (compact.includes('SELECT 1 FROM hr.contribution_time_certificate')) {
        return overrides.missingOutput ? [] : [{}];
      }
      if (compact.includes('SELECT 1 FROM hr.previdentiary_declaration')) {
        return overrides.missingOutput ? [] : [{}];
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
        compact.includes('FROM hr.retirement_rule') &&
        compact.includes('WHERE id = $1::uuid')
      ) {
        return overrides.rule === null ? [] : [overrides.rule ?? rule];
      }
      if (compact.includes('SELECT id FROM hr.recertification_beneficiary')) {
        return overrides.beneficiary === null ? [] : [{ id: 'beneficiary-1' }];
      }
      if (compact.includes('hr.retirement_simulation')) {
        return [simulation];
      }
      if (compact.includes('hr.retirement_grant')) {
        return [retirementGrant];
      }
      if (compact.includes('hr.pension_grant')) {
        return [pension];
      }
      if (compact.includes('hr.contribution_time_certificate')) {
        return [certificate];
      }
      if (compact.includes('hr.previdentiary_declaration')) {
        return [declaration];
      }
      if (compact.includes('hr.pension_compensation')) {
        return compensationRows;
      }
      if (compact.includes('hr.recertification_campaign')) {
        return campaignRows;
      }
      if (compact.includes('hr.beneficiary_contact_history')) {
        return [contactHistory];
      }
      if (compact.includes('hr.external_life_proof')) {
        return [lifeProof];
      }
      if (compact.includes('hr.recertification_record')) {
        return [recertificationRecord];
      }
      if (compact.includes('hr.recertification_beneficiary')) {
        return beneficiaryRows;
      }
      if (compact.includes('hr.retirement_rule')) {
        return [rule];
      }
      return [];
    });

  it('creates an eligible retirement simulation', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: '0001',
          name: 'Servidor Aposentavel',
          birth_date: TEST_DATE_1960_04_20,
          hired_on: TEST_DATE_1985_03_01,
          cpf: '00011122233',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'regra-1',
          name: 'Voluntaria integral',
          legal_basis: 'Lei 1',
          age_criteria: { minYears: 65 },
          contribution_time_criteria: { minYears: 35 },
          grace_period_criteria: {},
          applicable_employment_link: null,
          active: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'sim-1',
          employee_id: 'emp-1',
          registration: '0001',
          employee_name: 'Servidor Aposentavel',
          rule_id: 'regra-1',
          rule_name: 'Voluntaria integral',
          result: {
            elegivel: true,
            idadeAnos: 66,
            tempoContribuicao: 41,
            proventoEstimado: 4920,
          },
          details_json: { criteriosAtendidos: ['IDADE_MINIMA'] },
          simulated_on: TEST_INSTANT_2026_04_25_10_00_00_000Z,
          created_by_ref: 'usr-previd',
        },
      ]);
    const service = new PrevidenciarioService({
      configured: true,
      query,
    } as never);

    const result = await service.createSimulation(
      {
        funcionarioId: 'emp-1',
        regraId: 'regra-1',
        dataReferencia: TEST_DATE_2026_04_25,
      },
      'usr-previd',
    );

    expect(result.resultado.elegivel).toBe(true);
    expect(result.regra).toBe('Voluntaria integral');
  });

  it('creates an eligible EC 103 Pedagio 100 retirement simulation', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: '0001',
          name: 'Servidor Aposentavel',
          birth_date: TEST_DATE_1962_01_01,
          hired_on: TEST_DATE_1985_01_01,
          cpf: '00011122233',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'regra-ec103',
          name: 'EC 103 Pedagio 100',
          legal_basis: 'EC 103/2019 art. 20',
          age_criteria: { transitionRule: 'EC103_PEDAGIO_100' },
          contribution_time_criteria: {},
          grace_period_criteria: {},
          applicable_employment_link: null,
          active: true,
        },
      ])
      .mockImplementationOnce(async (_sql: string, params: unknown[]) => [
        {
          id: 'sim-ec103',
          employee_id: 'emp-1',
          registration: '0001',
          employee_name: 'Servidor Aposentavel',
          rule_id: 'regra-ec103',
          rule_name: 'EC 103 Pedagio 100',
          result: JSON.parse(params[2] as string),
          details_json: JSON.parse(params[3] as string),
          simulated_on: TEST_INSTANT_2026_04_25_10_00_00_000Z,
          created_by_ref: 'usr-previd',
        },
      ]);
    const service = new PrevidenciarioService({
      configured: true,
      query,
    } as never);

    const result = await service.createSimulation(
      {
        funcionarioId: 'emp-1',
        regraId: 'regra-ec103',
        dataReferencia: TEST_DATE_2025_01_01,
        regraTransicao: 'EC103_PEDAGIO_100',
        sexo: 'MALE',
        dataInicioServicoPublico: TEST_DATE_1998_01_01,
        dataInicioCargoAtual: TEST_DATE_2010_01_01,
        tempoContribuicaoReformaAnos: 34,
      },
      'usr-previd',
    );

    expect(result.resultado).toMatchObject({
      elegivel: true,
      regraTransicao: 'EC103_PEDAGIO_100',
      fundamentoLegal: 'EC 103/2019 art. 20',
    });
    expect(result.detalheJson).toMatchObject({
      ec103: expect.objectContaining({
        rule: 'EC103_PEDAGIO_100',
        required: expect.objectContaining({ tollYears: 1 }),
      }),
    });
  });

  it('runs the direct EC 103 Pedagio 100 simulator', () => {
    const service = new PrevidenciarioService({
      configured: true,
      query: createQuery(),
    } as never);

    expect(
      service.simulatePedagio100({
        sexo: 'FEMALE',
        dataNascimento: TEST_DATE_1972_01_01,
        dataInicioContribuicao: TEST_DATE_1995_01_01,
        dataInicioServicoPublico: TEST_DATE_2012_01_01,
        dataInicioCargoAtual: TEST_DATE_2023_01_01,
        dataReferencia: TEST_DATE_2025_01_01,
        tempoContribuicaoReformaAnos: 27,
      }),
    ).toMatchObject({
      eligible: false,
      rule: 'EC103_PEDAGIO_100',
      required: expect.objectContaining({ tollYears: 3 }),
      blockers: expect.arrayContaining([
        'IDADE_MINIMA',
        'TEMPO_CONTRIBUICAO_COM_PEDAGIO_100',
      ]),
    });
  });

  it('creates an eligible EC 103 Pedagio 50 retirement simulation', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: '0001',
          name: 'Segurada RGPS',
          birth_date: TEST_DATE_1965_01_01,
          hired_on: TEST_DATE_1990_01_01,
          cpf: '00011122233',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'regra-ec103',
          name: 'EC 103 Pedagio 50',
          legal_basis: 'EC 103/2019 art. 17',
          age_criteria: { transitionRule: 'EC103_PEDAGIO_50' },
          contribution_time_criteria: {},
          grace_period_criteria: {},
          applicable_employment_link: null,
          active: true,
        },
      ])
      .mockImplementationOnce(async (_sql: string, params: unknown[]) => [
        {
          id: 'sim-ec103',
          employee_id: 'emp-1',
          registration: '0001',
          employee_name: 'Segurada RGPS',
          rule_id: 'regra-ec103',
          rule_name: 'EC 103 Pedagio 50',
          result: JSON.parse(params[2] as string),
          details_json: JSON.parse(params[3] as string),
          simulated_on: TEST_INSTANT_2026_04_25_10_00_00_000Z,
          created_by_ref: 'usr-previd',
        },
      ]);
    const service = new PrevidenciarioService({
      configured: true,
      query,
    } as never);

    const result = await service.createSimulation(
      {
        funcionarioId: 'emp-1',
        regraId: 'regra-ec103',
        dataReferencia: TEST_DATE_2025_01_01,
        regraTransicao: 'EC103_PEDAGIO_50',
        sexo: 'FEMALE',
        tempoContribuicaoReformaAnos: 29,
        tempoContribuicaoReferenciaAnos: 31,
      },
      'usr-previd',
    );

    expect(result.resultado).toMatchObject({
      elegivel: true,
      regraTransicao: 'EC103_PEDAGIO_50',
      fundamentoLegal: 'EC 103/2019 art. 17',
    });
    expect(result.detalheJson).toMatchObject({
      ec103: expect.objectContaining({
        rule: 'EC103_PEDAGIO_50',
        required: expect.objectContaining({ tollYears: 0.5 }),
      }),
    });
  });

  it('creates an eligible EC 103 points retirement simulation', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: '0001',
          name: 'Servidor Pontos',
          birth_date: TEST_DATE_1962_01_01,
          hired_on: TEST_DATE_1985_01_01,
          cpf: '00011122233',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'regra-ec103',
          name: 'EC 103 Pontos',
          legal_basis: 'EC 103/2019 art. 4',
          age_criteria: { transitionRule: 'EC103_PONTOS' },
          contribution_time_criteria: {},
          grace_period_criteria: {},
          applicable_employment_link: null,
          active: true,
        },
      ])
      .mockImplementationOnce(async (_sql: string, params: unknown[]) => [
        {
          id: 'sim-ec103',
          employee_id: 'emp-1',
          registration: '0001',
          employee_name: 'Servidor Pontos',
          rule_id: 'regra-ec103',
          rule_name: 'EC 103 Pontos',
          result: JSON.parse(params[2] as string),
          details_json: JSON.parse(params[3] as string),
          simulated_on: TEST_INSTANT_2026_04_25_10_00_00_000Z,
          created_by_ref: 'usr-previd',
        },
      ]);
    const service = new PrevidenciarioService({
      configured: true,
      query,
    } as never);

    const result = await service.createSimulation(
      {
        funcionarioId: 'emp-1',
        regraId: 'regra-ec103',
        dataReferencia: TEST_DATE_2025_01_01,
        regraTransicao: 'EC103_PONTOS',
        sexo: 'MALE',
        dataInicioServicoPublico: TEST_DATE_1998_01_01,
        dataInicioCargoAtual: TEST_DATE_2010_01_01,
      },
      'usr-previd',
    );

    expect(result.resultado).toMatchObject({
      elegivel: true,
      regraTransicao: 'EC103_PONTOS',
      fundamentoLegal: 'EC 103/2019 art. 4',
    });
    expect(result.detalheJson).toMatchObject({
      ec103: expect.objectContaining({
        rule: 'EC103_PONTOS',
        required: expect.objectContaining({ points: 102 }),
      }),
    });
  });

  it('creates an eligible EC 103 progressive age retirement simulation', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: '0001',
          name: 'Segurada Progressiva',
          birth_date: TEST_DATE_1965_01_01,
          hired_on: TEST_DATE_1990_01_01,
          cpf: '00011122233',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'regra-ec103',
          name: 'EC 103 Idade Progressiva',
          legal_basis: 'EC 103/2019 art. 16',
          age_criteria: { transitionRule: 'EC103_IDADE_PROGRESSIVA' },
          contribution_time_criteria: {},
          grace_period_criteria: {},
          applicable_employment_link: null,
          active: true,
        },
      ])
      .mockImplementationOnce(async (_sql: string, params: unknown[]) => [
        {
          id: 'sim-ec103',
          employee_id: 'emp-1',
          registration: '0001',
          employee_name: 'Segurada Progressiva',
          rule_id: 'regra-ec103',
          rule_name: 'EC 103 Idade Progressiva',
          result: JSON.parse(params[2] as string),
          details_json: JSON.parse(params[3] as string),
          simulated_on: TEST_INSTANT_2026_04_25_10_00_00_000Z,
          created_by_ref: 'usr-previd',
        },
      ]);
    const service = new PrevidenciarioService({
      configured: true,
      query,
    } as never);

    const result = await service.createSimulation(
      {
        funcionarioId: 'emp-1',
        regraId: 'regra-ec103',
        dataReferencia: TEST_DATE_2025_01_01,
        regraTransicao: 'EC103_IDADE_PROGRESSIVA',
        sexo: 'FEMALE',
        tempoContribuicaoReferenciaAnos: 35,
      },
      'usr-previd',
    );

    expect(result.resultado).toMatchObject({
      elegivel: true,
      regraTransicao: 'EC103_IDADE_PROGRESSIVA',
      fundamentoLegal: 'EC 103/2019 art. 16',
    });
    expect(result.detalheJson).toMatchObject({
      ec103: expect.objectContaining({
        rule: 'EC103_IDADE_PROGRESSIVA',
        required: expect.objectContaining({ ageYears: 59 }),
      }),
    });
  });

  it('creates an eligible EC 103 risk activity retirement simulation', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: '0001',
          name: 'Servidor Risco',
          birth_date: TEST_DATE_1964_01_01,
          hired_on: TEST_DATE_1989_01_01,
          cpf: '00011122233',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'regra-ec103',
          name: 'EC 103 Atividade Risco',
          legal_basis: 'EC 103/2019 art. 5',
          age_criteria: {
            transitionRule: 'EC103_ATIVIDADE_RISCO_PROFESSOR',
          },
          contribution_time_criteria: {},
          grace_period_criteria: {},
          applicable_employment_link: null,
          active: true,
        },
      ])
      .mockImplementationOnce(async (_sql: string, params: unknown[]) => [
        {
          id: 'sim-ec103',
          employee_id: 'emp-1',
          registration: '0001',
          employee_name: 'Servidor Risco',
          rule_id: 'regra-ec103',
          rule_name: 'EC 103 Atividade Risco',
          result: JSON.parse(params[2] as string),
          details_json: JSON.parse(params[3] as string),
          simulated_on: TEST_INSTANT_2026_04_25_10_00_00_000Z,
          created_by_ref: 'usr-previd',
        },
      ]);
    const service = new PrevidenciarioService({
      configured: true,
      query,
    } as never);

    const result = await service.createSimulation(
      {
        funcionarioId: 'emp-1',
        regraId: 'regra-ec103',
        dataReferencia: TEST_DATE_2025_01_01,
        regraTransicao: 'EC103_ATIVIDADE_RISCO_PROFESSOR',
        populacaoAtividadeRiscoProfessor: 'RISK_ACTIVITY',
        sexo: 'MALE',
        dataInicioCarreira: TEST_DATE_1994_01_01,
        tempoContribuicaoReformaAnos: 30,
        tempoCarreiraReformaAnos: 20,
      },
      'usr-previd',
    );

    expect(result.resultado).toMatchObject({
      elegivel: true,
      regraTransicao: 'EC103_ATIVIDADE_RISCO_PROFESSOR',
      fundamentoLegal: 'EC 103/2019 art. 5',
    });
    expect(result.detalheJson).toMatchObject({
      ec103: expect.objectContaining({
        rule: 'EC103_ATIVIDADE_RISCO_PROFESSOR',
        population: 'RISK_ACTIVITY',
      }),
    });
  });

  it('lists previdenciario runtime records with status and type mappings', async () => {
    const service = new PrevidenciarioService({
      configured: true,
      query: createQuery(),
    } as never);

    await expect(service.listRules()).resolves.toHaveLength(1);
    await expect(service.listSimulations()).resolves.toHaveLength(1);
    await expect(service.listRetirementGrants()).resolves.toHaveLength(1);
    await expect(service.listPensions()).resolves.toHaveLength(1);
    await expect(
      service.listContributionTimeCertificates(),
    ).resolves.toHaveLength(1);
    await expect(service.listDeclarations()).resolves.toHaveLength(1);
    await expect(service.listCompensations()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'RASCUNHO' }),
        expect.objectContaining({ status: 'SOLICITADA' }),
        expect.objectContaining({ status: 'APROVADA' }),
        expect.objectContaining({ status: 'REPROVADA' }),
        expect.objectContaining({ status: 'LIQUIDADA' }),
      ]),
    );
    await expect(service.listCampaigns()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'APOSENTADO' }),
        expect.objectContaining({ tipo: 'PENSIONISTA' }),
        expect.objectContaining({ tipo: 'PENSIONISTA_UNIVERSITARIO' }),
      ]),
    );
    await expect(service.listBeneficiaries()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'PENDENTE' }),
        expect.objectContaining({ status: 'RECADASTRADO' }),
        expect.objectContaining({ status: 'PROXIMO_VENCIMENTO' }),
        expect.objectContaining({ status: 'VENCIDO' }),
        expect.objectContaining({ status: 'BLOQUEADO' }),
      ]),
    );
    await expect(service.listPendingRecertifications()).resolves.toHaveLength(
      5,
    );
    await expect(service.listBeneficiaryContactHistory()).resolves.toHaveLength(
      1,
    );
  });

  it('creates and updates previdenciario runtime records', async () => {
    const query = createQuery();
    const service = new PrevidenciarioService({
      configured: true,
      query,
    } as never);

    await expect(
      service.createRule({
        nome: ' Voluntaria integral ',
        fundamentoLegal: ' Lei 1 ',
        criteriosIdade: { minYears: 65 },
        criteriosTempoContribuicao: { minYears: 35 },
        criteriosCarencia: {},
        vinculoAplicavel: 'RPPS',
        ativa: true,
      }),
    ).resolves.toMatchObject({ nome: rule.name });
    await expect(
      service.updateRule(rule.id, {
        nome: 'Voluntaria atualizada',
        ativa: false,
      }),
    ).resolves.toMatchObject({ id: rule.id });
    await expect(
      service.createRetirementGrant(
        {
          funcionarioId: employee.id,
          regraId: rule.id,
          dataConcessao: TEST_DATE_2026_04_25,
          fundamento: ' Lei 1 ',
          atoNomeacao: ' Ato 1 ',
          observacao: ' Observacao ',
        },
        'usr-previd',
      ),
    ).resolves.toMatchObject({ status: 'CONCEDIDA' });
    await expect(
      service.createPension({
        funcionarioInstituidorId: employee.id,
        nomeBeneficiario: ' Beneficiario ',
        cpfBeneficiario: '12345678901',
        parentesco: 'CONJUGE',
        tipoBeneficio: ' PENSAO ',
        tipoRateio: ' PERCENTUAL ',
        cotaParte: 50.5,
        formaReajuste: ' PARIDADE ',
        natureza: ' VITALICIA ',
        dataConcessao: TEST_DATE_2026_04_25,
        fundamento: ' Lei 1 ',
        observacao: ' Observacao ',
      }),
    ).resolves.toMatchObject({ nomeBeneficiario: 'Beneficiario' });
    await expect(
      service.createContributionTimeCertificate({
        funcionarioId: employee.id,
        periodoInicio: TEST_DATE_2000_01_01,
        periodoFim: TEST_DATE_2026_01_01,
        orgaoEmitente: ' RPPS ',
        atoEmissao: ' Ato CTC ',
        storageKey: 'ctc.pdf',
        emitidaPorId: 'usr-previd',
      }),
    ).resolves.toMatchObject({ storageKey: 'ctc.pdf' });
    await expect(
      service.createDeclaration({
        funcionarioId: employee.id,
        tipo: ' TEMPO_CONTRIBUICAO ',
        storageKey: 'decl.pdf',
        emitidaPorId: 'usr-previd',
      }),
    ).resolves.toMatchObject({ tipo: 'TEMPO_CONTRIBUICAO' });

    for (const status of [
      'RASCUNHO',
      'SOLICITADA',
      'APROVADA',
      'REPROVADA',
      'LIQUIDADA',
    ] as const) {
      await expect(
        service.createCompensation({
          funcionarioId: employee.id,
          certidaoReferencia: 'CTC-1',
          regimeOrigem: ' RGPS ',
          valor: 1000,
          status,
          observacao: ' Observacao ',
        }),
      ).resolves.toHaveProperty('valor', 1000);
      await expect(
        service.updateCompensation('comp-1', {
          status,
          observacao: `Status ${status}`,
        }),
      ).resolves.toHaveProperty('status', 'RASCUNHO');
    }

    for (const tipo of [
      'APOSENTADO',
      'PENSIONISTA',
      'PENSIONISTA_UNIVERSITARIO',
    ] as const) {
      await expect(
        service.createCampaign({
          tipo,
          cicloInicio: TEST_DATE_2026_01_01,
          cicloFim: TEST_DATE_2026_12_31,
          filtro: { tipo },
          ativa: true,
        }),
      ).resolves.toHaveProperty('ativa', true);
    }

    for (const status of [
      'PENDENTE',
      'RECADASTRADO',
      'PROXIMO_VENCIMENTO',
      'VENCIDO',
      'BLOQUEADO',
    ] as const) {
      await expect(
        service.createBeneficiary({
          funcionarioId: employee.id,
          campanhaId: 'campaign-1',
          tipo: 'APOSENTADO',
          dataProxima: TEST_DATE_2026_10_25,
          status,
        }),
      ).resolves.toHaveProperty('status', 'PENDENTE');
    }

    await expect(
      service.createRecord({
        beneficiarioId: 'beneficiary-1',
        data: TEST_DATE_2026_04_25,
        operadorId: ' operator-1 ',
        dadosSnapshot: { ok: true },
        comprovanteStorageKey: 'receipt.pdf',
      }),
    ).resolves.toHaveProperty('comprovanteStorageKey', 'receipt.pdf');
    await expect(
      service.createExternalLifeProof({
        beneficiarioId: 'beneficiary-1',
        canal: 'APP',
        autenticacao: { score: 1 },
        data: TEST_INSTANT_2026_04_25_10_00_00_000Z,
      }),
    ).resolves.toHaveProperty('canal', 'APP');
    await expect(
      service.createBeneficiaryContactHistory({
        beneficiarioId: 'beneficiary-1',
        data: TEST_DATE_2026_04_25,
        usuarioId: ' operator-1 ',
        observacao: ' Contato realizado ',
      }),
    ).resolves.toHaveProperty('usuarioId', 'operator-1');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.retirement_grant'),
      expect.any(Array),
    );
  });

  it('applies defaults for sparse previdenciario inputs', async () => {
    const query = createQuery();
    const service = new PrevidenciarioService({
      configured: true,
      query,
    } as never);

    await expect(
      service.createRule({
        nome: ' Regra ',
        fundamentoLegal: ' Lei ',
      }),
    ).resolves.toHaveProperty('id', rule.id);
    await expect(
      service.updateRule(rule.id, {
        nome: 'Regra atualizada',
      }),
    ).resolves.toHaveProperty('nome', rule.name);
    await expect(
      service.createPension({
        nomeBeneficiario: ' Beneficiario ',
        tipoBeneficio: ' PENSAO ',
        tipoRateio: ' PERCENTUAL ',
        cotaParte: 50,
        formaReajuste: ' PARIDADE ',
        natureza: ' VITALICIA ',
        dataConcessao: TEST_DATE_2026_04_25,
        fundamento: ' Lei 1 ',
      }),
    ).resolves.toHaveProperty('nomeBeneficiario', 'Beneficiario');
    await expect(
      service.createContributionTimeCertificate({
        funcionarioId: employee.id,
        periodoInicio: TEST_DATE_2000_01_01,
        periodoFim: TEST_DATE_2026_01_01,
        orgaoEmitente: ' RPPS ',
        atoEmissao: ' Ato CTC ',
      }),
    ).resolves.toHaveProperty('id', certificate.id);
    await expect(
      service.createDeclaration({
        funcionarioId: employee.id,
        tipo: ' TEMPO_CONTRIBUICAO ',
      }),
    ).resolves.toHaveProperty('id', declaration.id);
    await expect(
      service.createCompensation({
        funcionarioId: employee.id,
        regimeOrigem: ' RGPS ',
        valor: 1000,
      }),
    ).resolves.toHaveProperty('id', compensationRows[0].id);
    await expect(
      service.updateCompensation('comp-1', {}),
    ).resolves.toHaveProperty('id', compensationRows[0].id);
    await expect(
      service.createCampaign({
        tipo: 'APOSENTADO',
        cicloInicio: TEST_DATE_2026_01_01,
        cicloFim: TEST_DATE_2026_12_31,
      }),
    ).resolves.toHaveProperty('id', campaignRows[0].id);
    await expect(
      service.createBeneficiary({
        funcionarioId: employee.id,
        tipo: 'APOSENTADO',
        dataProxima: TEST_DATE_2026_10_25,
      }),
    ).resolves.toHaveProperty('id', beneficiaryRows[0].id);
    await expect(
      service.createRecord({
        beneficiarioId: 'beneficiary-1',
        data: TEST_DATE_2026_04_25,
        operadorId: 'operator-1',
      }),
    ).resolves.toHaveProperty('id', recertificationRecord.id);
    await expect(
      service.requestRecertificationNotice({}),
    ).resolves.toHaveProperty('id', requestRow.id);
    await expect(
      service.requestRecertificationPendingReport({}),
    ).resolves.toHaveProperty('id', requestRow.id);
  });

  it('requests previdenciario outputs and reports missing dependencies', async () => {
    const service = new PrevidenciarioService({
      configured: true,
      query: createQuery(),
    } as never);

    await expect(
      service.requestContributionTimeCertificateOutput('ctc-1', {
        formato: 'PDF',
      }),
    ).resolves.toMatchObject({ id: 'request-1' });
    await expect(
      service.requestDeclarationOutput('decl-1', { formato: 'PDF' }),
    ).resolves.toMatchObject({ status: 'REQUESTED' });
    await expect(
      service.requestRecertificationNotice({
        campanhaId: 'campaign-1',
        competencia: '2026-04',
      }),
    ).resolves.toHaveProperty('requestedAt');
    await expect(
      service.requestRecertificationPendingReport({
        campanhaId: 'campaign-1',
      }),
    ).resolves.toHaveProperty('id', 'request-1');
    await expect(
      service.requestSiprevExport({ competencia: '2026-04' }),
    ).resolves.toHaveProperty('status', 'REQUESTED');

    await expect(
      new PrevidenciarioService({
        configured: false,
      } as never).listRules(),
    ).rejects.toThrow('DATABASE_URL is not configured');
    await expect(
      new PrevidenciarioService({
        configured: true,
        query: createQuery({ missingOutput: true }),
      } as never).requestDeclarationOutput('decl-1', {}),
    ).rejects.toThrow('Previdentiary declaration not found');
    await expect(
      new PrevidenciarioService({
        configured: true,
        query: createQuery({ employee: null }),
      } as never).createSimulation({
        funcionarioId: employee.id,
        regraId: rule.id,
        dataReferencia: TEST_DATE_2026_04_25,
      }),
    ).rejects.toThrow('Employee not found');
    await expect(
      new PrevidenciarioService({
        configured: true,
        query: createQuery({
          employee: {
            ...employee,
            birth_date: TEST_DATE_2000_01_01,
            hired_on: TEST_DATE_2020_01_01,
          },
        }),
      } as never).createRetirementGrant({
        funcionarioId: employee.id,
        regraId: rule.id,
        dataConcessao: TEST_DATE_2026_04_25,
        fundamento: 'Lei 1',
        atoNomeacao: 'Ato 1',
      }),
    ).rejects.toThrow('Employee is not eligible');
    await expect(
      new PrevidenciarioService({
        configured: true,
        query: createQuery({ beneficiary: null }),
      } as never).createExternalLifeProof({
        beneficiarioId: 'missing',
        canal: 'APP',
        data: TEST_INSTANT_2026_04_25_10_00_00_000Z,
      }),
    ).rejects.toThrow('Recertification beneficiary not found');
  });
});
