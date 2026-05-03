import { LgpdDpoAdminController } from './dpo.controller';

describe('LgpdDpoAdminController', () => {
  it('delegates read requests to the admin service', async () => {
    const getDesignation = jest.fn().mockResolvedValue(dpoDesignation());
    const controller = new LgpdDpoAdminController(
      { getDesignation } as never,
      { auditMutation: jest.fn() } as never,
    );

    await controller.getDesignation();

    expect(getDesignation).toHaveBeenCalled();
  });

  it('audits DPO designation creation and updates', async () => {
    const createDesignation = jest.fn().mockResolvedValue(dpoDesignation());
    const updateDesignation = jest
      .fn()
      .mockResolvedValue(dpoDesignation({ status: 'UNDER_REVIEW' }));
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new LgpdDpoAdminController(
      { createDesignation, updateDesignation } as never,
      { auditMutation } as never,
    );
    const request = { requestId: 'req-1' } as never;

    await controller.createDesignation(request, {
      name: 'Maria Encarregada',
      email: 'dpo@ente.gov.br',
    });
    await controller.updateDesignation(request, { status: 'UNDER_REVIEW' });

    expect(auditMutation).toHaveBeenNthCalledWith(
      1,
      request,
      'CREATE',
      'lgpd_dpo_designation',
      expect.objectContaining({ tableName: 'public.system_parameter' }),
    );
    expect(auditMutation).toHaveBeenNthCalledWith(
      2,
      request,
      'UPDATE',
      'lgpd_dpo_designation',
      expect.objectContaining({
        metadata: expect.objectContaining({ status: 'UNDER_REVIEW' }),
      }),
    );
  });
});

function dpoDesignation(overrides: Record<string, unknown> = {}) {
  return {
    key: 'lgpd.encarregado',
    tenantId: '00000000-0000-0000-0000-000000000100',
    name: 'Maria Encarregada',
    contact: {
      email: 'dpo@ente.gov.br',
      phone: '',
      channelUrl: '/lgpd/encarregado',
      officeHours: 'Dias uteis, 9h as 17h',
      postalAddress: '',
    },
    lifecycle: {
      status: 'ACTIVE',
      designationAct: 'Portaria 123/2026',
      designatedAt: '2026-05-01',
      notes: null,
      ...overrides,
    },
    updatedAt: '2026-05-03T12:00:00.000Z',
  };
}
