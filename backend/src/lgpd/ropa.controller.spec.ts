import { LgpdRopaController } from './ropa.controller';

describe('LgpdRopaController', () => {
  it('delegates list requests to the ROPA service', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const controller = new LgpdRopaController(
      { list } as never,
      { auditMutation: jest.fn() } as never,
    );

    await controller.list({ status: 'ACTIVE' });

    expect(list).toHaveBeenCalledWith({ status: 'ACTIVE' });
  });

  it('audits ROPA creation and updates', async () => {
    const create = jest.fn().mockResolvedValue(ropaEntry('created'));
    const update = jest.fn().mockResolvedValue(ropaEntry('updated'));
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new LgpdRopaController(
      { create, update } as never,
      { auditMutation } as never,
    );
    const request = { requestId: 'req-1' } as never;

    await controller.create(request, {
      flowKey: 'payroll.payslip_pdf',
      operationName: 'created',
      controllerArea: 'Payroll',
    });
    await controller.update(request, '00000000-0000-4000-8000-000000000239', {
      operationName: 'updated',
    });

    expect(auditMutation).toHaveBeenNthCalledWith(
      1,
      request,
      'CREATE',
      'lgpd_ropa_entry',
      expect.objectContaining({ tableName: 'lgpd.ropa_entry' }),
    );
    expect(auditMutation).toHaveBeenNthCalledWith(
      2,
      request,
      'UPDATE',
      'lgpd_ropa_entry',
      expect.objectContaining({ tableName: 'lgpd.ropa_entry' }),
    );
  });
});

function ropaEntry(operationName: string) {
  return {
    id: '00000000-0000-4000-8000-000000000239',
    flowKey: 'payroll.payslip_pdf',
    operationName,
  };
}
