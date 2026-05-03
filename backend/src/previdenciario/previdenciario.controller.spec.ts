import {
  TEST_DATE_1962_01_01,
  TEST_DATE_1964_01_01,
  TEST_DATE_1965_01_01,
  TEST_DATE_1985_01_01,
  TEST_DATE_1989_01_01,
  TEST_DATE_1990_01_01,
  TEST_DATE_1994_01_01,
  TEST_DATE_2025_01_01,
} from './../../../tests/backend/helpers/date-fixtures';
import { PrevidenciarioController } from './previdenciario.controller';

describe('PrevidenciarioController', () => {
  const request = { actor: { username: 'previd-user' } } as never;
  const payload = { funcionarioId: 'emp-1' };

  const createController = () => {
    const service = {
      listRules: jest.fn(async () => []),
      createRule: jest.fn(async () => ({ id: 'rule-1' })),
      updateRule: jest.fn(async () => ({ id: 'rule-1' })),
      listSimulations: jest.fn(async () => []),
      createSimulation: jest.fn(async () => ({ id: 'simulation-1' })),
      simulatePedagio100: jest.fn(async () => ({
        rule: 'EC103_PEDAGIO_100',
      })),
      simulatePedagio50: jest.fn(async () => ({
        rule: 'EC103_PEDAGIO_50',
      })),
      simulatePontos: jest.fn(async () => ({
        rule: 'EC103_PONTOS',
      })),
      simulateIdadeProgressiva: jest.fn(async () => ({
        rule: 'EC103_IDADE_PROGRESSIVA',
      })),
      simulateAtividadeRiscoProfessor: jest.fn(async () => ({
        rule: 'EC103_ATIVIDADE_RISCO_PROFESSOR',
      })),
      listRetirementGrants: jest.fn(async () => []),
      createRetirementGrant: jest.fn(async () => ({ id: 'grant-1' })),
      listPensions: jest.fn(async () => []),
      createPension: jest.fn(async () => ({ id: 'pension-1' })),
      listContributionTimeCertificates: jest.fn(async () => []),
      createContributionTimeCertificate: jest.fn(async () => ({ id: 'ctc-1' })),
      requestContributionTimeCertificateOutput: jest.fn(async () => ({
        id: 'ctc-request-1',
      })),
      listDeclarations: jest.fn(async () => []),
      createDeclaration: jest.fn(async () => ({ id: 'decl-1' })),
      requestDeclarationOutput: jest.fn(async () => ({ id: 'decl-request-1' })),
      listCompensations: jest.fn(async () => []),
      createCompensation: jest.fn(async () => ({ id: 'comp-1' })),
      updateCompensation: jest.fn(async () => ({ id: 'comp-1' })),
      listCampaigns: jest.fn(async () => []),
      createCampaign: jest.fn(async () => ({ id: 'campaign-1' })),
      listBeneficiaries: jest.fn(async () => []),
      listPendingRecertifications: jest.fn(async () => []),
      listBeneficiaryContactHistory: jest.fn(async () => []),
      createBeneficiary: jest.fn(async () => ({ id: 'beneficiary-1' })),
      createRecord: jest.fn(async () => ({ id: 'record-1' })),
      createBeneficiaryContactHistory: jest.fn(async () => ({
        id: 'contact-1',
      })),
      createExternalLifeProof: jest.fn(async () => ({ id: 'proof-1' })),
      requestRecertificationNotice: jest.fn(async () => ({ id: 'notice-1' })),
      requestRecertificationPendingReport: jest.fn(async () => ({
        id: 'pending-1',
      })),
      requestSiprevExport: jest.fn(async () => ({ id: 'siprev-1' })),
    };
    const audit = { auditMutation: jest.fn(async () => undefined) };
    return {
      service,
      audit,
      controller: new PrevidenciarioController(
        service as never,
        audit as never,
      ),
    };
  };

  it('is defined', () => {
    const controller = new PrevidenciarioController({} as never, {} as never);
    expect(controller).toBeDefined();
  });

  it('delegates read endpoints to the previdenciario service', async () => {
    const { controller, service } = createController();
    const reads: Array<[() => Promise<unknown>, jest.Mock]> = [
      [() => controller.listRules(), service.listRules],
      [() => controller.listSimulations(), service.listSimulations],
      [() => controller.listRetirementGrants(), service.listRetirementGrants],
      [() => controller.listPensions(), service.listPensions],
      [
        () => controller.listContributionTimeCertificates(),
        service.listContributionTimeCertificates,
      ],
      [() => controller.listDeclarations(), service.listDeclarations],
      [() => controller.listCompensations(), service.listCompensations],
      [() => controller.listCampaigns(), service.listCampaigns],
      [() => controller.listBeneficiaries(), service.listBeneficiaries],
      [
        () => controller.listPendingRecertifications(),
        service.listPendingRecertifications,
      ],
      [
        () => controller.listBeneficiaryContactHistory(),
        service.listBeneficiaryContactHistory,
      ],
    ];

    for (const [callController, serviceMock] of reads) {
      await expect(callController()).resolves.toEqual([]);
      expect(serviceMock).toHaveBeenCalled();
    }
  });

  it('audits previdenciario mutations and report requests', async () => {
    const { controller, service, audit } = createController();
    const writes: Array<[string, unknown[], string, string]> = [
      ['createRule', [request, payload], 'createRule', 'retirement_rule'],
      [
        'updateRule',
        [request, 'rule-1', payload],
        'updateRule',
        'retirement_rule',
      ],
      [
        'createSimulation',
        [request, payload],
        'createSimulation',
        'retirement_simulation',
      ],
      [
        'createRetirementGrant',
        [request, payload],
        'createRetirementGrant',
        'retirement_grant',
      ],
      ['createPension', [request, payload], 'createPension', 'pension_grant'],
      [
        'createContributionTimeCertificate',
        [request, payload],
        'createContributionTimeCertificate',
        'contribution_time_certificate',
      ],
      [
        'requestContributionTimeCertificateOutput',
        [request, 'ctc-1', payload],
        'requestContributionTimeCertificateOutput',
        'report_request',
      ],
      [
        'createDeclaration',
        [request, payload],
        'createDeclaration',
        'previdentiary_declaration',
      ],
      [
        'requestDeclarationOutput',
        [request, 'decl-1', payload],
        'requestDeclarationOutput',
        'report_request',
      ],
      [
        'createCompensation',
        [request, payload],
        'createCompensation',
        'pension_compensation',
      ],
      [
        'updateCompensation',
        [request, 'comp-1', payload],
        'updateCompensation',
        'pension_compensation',
      ],
      [
        'createCampaign',
        [request, payload],
        'createCampaign',
        'recertification_campaign',
      ],
      [
        'createBeneficiary',
        [request, payload],
        'createBeneficiary',
        'recertification_beneficiary',
      ],
      [
        'createRecord',
        [request, payload],
        'createRecord',
        'recertification_record',
      ],
      [
        'createBeneficiaryContactHistory',
        [request, payload],
        'createBeneficiaryContactHistory',
        'beneficiary_contact_history',
      ],
      [
        'createExternalLifeProof',
        [request, payload],
        'createExternalLifeProof',
        'external_life_proof',
      ],
      [
        'requestRecertificationNotice',
        [request, payload],
        'requestRecertificationNotice',
        'report_request',
      ],
      [
        'requestRecertificationPendingReport',
        [request, payload],
        'requestRecertificationPendingReport',
        'report_request',
      ],
      [
        'requestSiprevExport',
        [request, payload],
        'requestSiprevExport',
        'report_request',
      ],
    ];

    for (const [controllerMethod, args, serviceMethod, tableName] of writes) {
      await expect(
        (
          controller as never as Record<
            string,
            (...input: unknown[]) => unknown
          >
        )[controllerMethod](...args),
      ).resolves.toEqual(expect.objectContaining({ id: expect.any(String) }));
      expect(service[serviceMethod as keyof typeof service]).toHaveBeenCalled();
      expect(audit.auditMutation).toHaveBeenCalledWith(
        request,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ tableName }),
      );
    }
  });

  it('delegates and audits the EC 103 Pedagio 100 simulator', async () => {
    const { controller, service, audit } = createController();

    await expect(
      controller.simulateEc103Pedagio100(request, {
        sexo: 'MALE',
        dataNascimento: TEST_DATE_1962_01_01,
        dataInicioContribuicao: TEST_DATE_1985_01_01,
        dataReferencia: TEST_DATE_2025_01_01,
      }),
    ).resolves.toEqual({ rule: 'EC103_PEDAGIO_100' });

    expect(service.simulatePedagio100).toHaveBeenCalledWith({
      sexo: 'MALE',
      dataNascimento: TEST_DATE_1962_01_01,
      dataInicioContribuicao: TEST_DATE_1985_01_01,
      dataReferencia: TEST_DATE_2025_01_01,
    });
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'GENERATE',
      'retirement_simulation',
      expect.objectContaining({
        resourceId: 'EC103_PEDAGIO_100',
        tableName: 'retirement_simulation',
      }),
    );
  });

  it('delegates and audits the EC 103 Pedagio 50 simulator', async () => {
    const { controller, service, audit } = createController();

    await expect(
      controller.simulateEc103Pedagio50(request, {
        sexo: 'FEMALE',
        dataInicioContribuicao: TEST_DATE_1990_01_01,
        dataReferencia: TEST_DATE_2025_01_01,
        tempoContribuicaoReformaAnos: 29,
      }),
    ).resolves.toEqual({ rule: 'EC103_PEDAGIO_50' });

    expect(service.simulatePedagio50).toHaveBeenCalledWith({
      sexo: 'FEMALE',
      dataInicioContribuicao: TEST_DATE_1990_01_01,
      dataReferencia: TEST_DATE_2025_01_01,
      tempoContribuicaoReformaAnos: 29,
    });
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'GENERATE',
      'retirement_simulation',
      expect.objectContaining({
        resourceId: 'EC103_PEDAGIO_50',
        tableName: 'retirement_simulation',
      }),
    );
  });

  it('delegates and audits the EC 103 points simulator', async () => {
    const { controller, service, audit } = createController();

    await expect(
      controller.simulateEc103Pontos(request, {
        sexo: 'MALE',
        dataNascimento: TEST_DATE_1962_01_01,
        dataInicioContribuicao: TEST_DATE_1985_01_01,
        dataReferencia: TEST_DATE_2025_01_01,
      }),
    ).resolves.toEqual({ rule: 'EC103_PONTOS' });

    expect(service.simulatePontos).toHaveBeenCalledWith({
      sexo: 'MALE',
      dataNascimento: TEST_DATE_1962_01_01,
      dataInicioContribuicao: TEST_DATE_1985_01_01,
      dataReferencia: TEST_DATE_2025_01_01,
    });
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'GENERATE',
      'retirement_simulation',
      expect.objectContaining({
        resourceId: 'EC103_PONTOS',
        tableName: 'retirement_simulation',
      }),
    );
  });

  it('delegates and audits the EC 103 progressive age simulator', async () => {
    const { controller, service, audit } = createController();

    await expect(
      controller.simulateEc103IdadeProgressiva(request, {
        sexo: 'FEMALE',
        dataNascimento: TEST_DATE_1965_01_01,
        dataInicioContribuicao: TEST_DATE_1990_01_01,
        dataReferencia: TEST_DATE_2025_01_01,
      }),
    ).resolves.toEqual({ rule: 'EC103_IDADE_PROGRESSIVA' });

    expect(service.simulateIdadeProgressiva).toHaveBeenCalledWith({
      sexo: 'FEMALE',
      dataNascimento: TEST_DATE_1965_01_01,
      dataInicioContribuicao: TEST_DATE_1990_01_01,
      dataReferencia: TEST_DATE_2025_01_01,
    });
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'GENERATE',
      'retirement_simulation',
      expect.objectContaining({
        resourceId: 'EC103_IDADE_PROGRESSIVA',
        tableName: 'retirement_simulation',
      }),
    );
  });

  it('delegates and audits the EC 103 risk activity or teacher simulator', async () => {
    const { controller, service, audit } = createController();

    await expect(
      controller.simulateEc103AtividadeRiscoProfessor(request, {
        populacao: 'RISK_ACTIVITY',
        sexo: 'MALE',
        dataNascimento: TEST_DATE_1964_01_01,
        dataInicioContribuicao: TEST_DATE_1989_01_01,
        dataInicioCarreira: TEST_DATE_1994_01_01,
        dataReferencia: TEST_DATE_2025_01_01,
      }),
    ).resolves.toEqual({ rule: 'EC103_ATIVIDADE_RISCO_PROFESSOR' });

    expect(service.simulateAtividadeRiscoProfessor).toHaveBeenCalledWith({
      populacao: 'RISK_ACTIVITY',
      sexo: 'MALE',
      dataNascimento: TEST_DATE_1964_01_01,
      dataInicioContribuicao: TEST_DATE_1989_01_01,
      dataInicioCarreira: TEST_DATE_1994_01_01,
      dataReferencia: TEST_DATE_2025_01_01,
    });
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'GENERATE',
      'retirement_simulation',
      expect.objectContaining({
        resourceId: 'EC103_ATIVIDADE_RISCO_PROFESSOR',
        tableName: 'retirement_simulation',
      }),
    );
  });
});
