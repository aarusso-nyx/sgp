import { PortalService } from './portal.service';

describe('PortalService', () => {
  const actor = {
    sub: 'sub-1',
    username: 'portal.user',
    tenantId: '00000000-0000-0000-0000-000000000100',
    groups: [],
    permissions: [],
    claims: { cpf: '00011122233', email: 'portal@example.test' },
  };

  it('returns current session and Gov.br status', () => {
    const service = new PortalService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    expect(service.currentSession(undefined)).toEqual({
      actor: undefined,
      authenticated: false,
    });
    expect(service.currentSession(actor).authenticated).toBe(true);
    expect(service.govBrStatus()).toMatchObject({
      provider: 'govbr',
      status: 'available',
    });
  });

  it('fans out portal calls to collaborator services', async () => {
    const meusDadosService = {
      getPersonalData: jest.fn().mockResolvedValue({ id: 'employee-1' }),
      getAddress: jest.fn().mockResolvedValue({ street: 'Rua A' }),
      getContact: jest.fn().mockResolvedValue({ email: 'portal@example.test' }),
      getDependents: jest.fn().mockResolvedValue([{ id: 'dep-1' }]),
      getMyJob: jest.fn().mockResolvedValue({ cargo: 'Analista' }),
      getMyCareer: jest.fn().mockResolvedValue({ trail: 'ok' }),
      requestProfileChange: jest.fn().mockResolvedValue({ id: 'change-1' }),
    };
    const documentosService = {
      getDocuments: jest.fn().mockResolvedValue([{ id: 'doc-1' }]),
      listDocumentRequests: jest.fn().mockResolvedValue([{ id: 'req-1' }]),
      createDocumentRequest: jest.fn().mockResolvedValue({ id: 'req-2' }),
    };
    const contrachequeService = {
      vacationPayslips: jest.fn().mockResolvedValue([{ id: 'vac-1' }]),
      terminationTerms: jest.fn().mockResolvedValue([{ id: 'term-1' }]),
      getPaystub: jest.fn().mockResolvedValue({ payrollRunId: 'run-1' }),
      payrollSummary: jest.fn().mockResolvedValue({ items: [] }),
    };
    const minhaEquipeService = {
      approvalQueue: jest.fn().mockResolvedValue([{ id: 'approval-1' }]),
      transitionApproval: jest.fn().mockResolvedValue({ id: 'approval-1' }),
    };
    const service = new PortalService(
      meusDadosService as never,
      documentosService as never,
      contrachequeService as never,
      minhaEquipeService as never,
    );

    await expect(service.getPersonalData(actor)).resolves.toEqual({
      id: 'employee-1',
    });
    await expect(service.getDocuments(actor)).resolves.toEqual([
      { id: 'doc-1' },
    ]);
    await expect(service.getPaystub(actor, '2026-05')).resolves.toEqual({
      payrollRunId: 'run-1',
    });
    await expect(
      service.transitionApproval(actor, 'leave', 'leave-1', 'approve'),
    ).resolves.toEqual({ id: 'approval-1' });

    expect(meusDadosService.getPersonalData).toHaveBeenCalledWith(actor);
    expect(documentosService.getDocuments).toHaveBeenCalledWith(actor);
    expect(contrachequeService.getPaystub).toHaveBeenCalledWith(
      actor,
      '2026-05',
    );
    expect(minhaEquipeService.transitionApproval).toHaveBeenCalledWith(
      actor,
      'leave',
      'leave-1',
      'approve',
    );
  });
});
