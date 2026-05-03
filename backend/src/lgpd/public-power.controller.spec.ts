import { LgpdPublicPowerTreatmentController } from './public-power.controller';

describe('LgpdPublicPowerTreatmentController', () => {
  it('delegates list requests to the public-power treatment service', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const controller = new LgpdPublicPowerTreatmentController(
      { list } as never,
      { auditMutation: jest.fn() } as never,
    );

    await controller.list({ status: 'REGISTERED' });

    expect(list).toHaveBeenCalledWith({ status: 'REGISTERED' });
  });

  it('audits creation and updates', async () => {
    const create = jest.fn().mockResolvedValue(treatment('REGISTERED'));
    const update = jest.fn().mockResolvedValue(treatment('UNDER_REVIEW'));
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new LgpdPublicPowerTreatmentController(
      { create, update } as never,
      { auditMutation } as never,
    );
    const request = { requestId: 'req-1' } as never;

    await controller.create(request, {
      flowKey: 'transparency.remuneration_publication',
    });
    await controller.update(request, '00000000-0000-4000-8000-000000000331', {
      status: 'UNDER_REVIEW',
    });

    expect(auditMutation).toHaveBeenNthCalledWith(
      1,
      request,
      'CREATE',
      'lgpd_public_power_treatment',
      expect.objectContaining({
        tableName: 'lgpd.public_power_treatment',
      }),
    );
    expect(auditMutation).toHaveBeenNthCalledWith(
      2,
      request,
      'UPDATE',
      'lgpd_public_power_treatment',
      expect.objectContaining({
        tableName: 'lgpd.public_power_treatment',
      }),
    );
  });
});

function treatment(status: 'REGISTERED' | 'UNDER_REVIEW') {
  return {
    id: '00000000-0000-4000-8000-000000000331',
    flowKey: 'transparency.remuneration_publication',
    legalBasisReference: 'LGPD art. 7, III',
    responsibleArea: 'Transparency Office',
    status,
  };
}
