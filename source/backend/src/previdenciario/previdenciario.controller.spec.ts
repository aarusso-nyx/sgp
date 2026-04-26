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
    const audit = { appendMutation: jest.fn(async () => undefined) };
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
    const reads = [
      ['listRules', 'listRules'],
      ['listSimulations', 'listSimulations'],
      ['listRetirementGrants', 'listRetirementGrants'],
      ['listPensions', 'listPensions'],
      ['listContributionTimeCertificates', 'listContributionTimeCertificates'],
      ['listDeclarations', 'listDeclarations'],
      ['listCompensations', 'listCompensations'],
      ['listCampaigns', 'listCampaigns'],
      ['listBeneficiaries', 'listBeneficiaries'],
      ['listPendingRecertifications', 'listPendingRecertifications'],
      ['listBeneficiaryContactHistory', 'listBeneficiaryContactHistory'],
    ];

    for (const [controllerMethod, serviceMethod] of reads) {
      await expect(
        (controller as never as Record<string, () => Promise<unknown>>)[
          controllerMethod
        ](),
      ).resolves.toEqual([]);
      expect(service[serviceMethod as keyof typeof service]).toHaveBeenCalled();
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
      expect(audit.appendMutation).toHaveBeenCalledWith(
        request,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ tableName }),
      );
    }
  });
});
