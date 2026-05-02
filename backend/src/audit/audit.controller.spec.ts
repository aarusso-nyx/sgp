import { AuditController } from './audit.controller';

describe('AuditController', () => {
  it('delegates event listing to service', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const controller = new AuditController({ list } as never);

    await controller.events({ page: 1, pageSize: 20, actor: 'tester' });

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'tester' }),
    );
  });

  it('creates audit report requests and appends audit event', async () => {
    const createReportRequest = jest.fn().mockResolvedValue({ id: 'report-1' });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new AuditController({
      createReportRequest,
      auditMutation,
    } as never);

    await controller.createReportRequest({ requestId: 'req-1' } as never, {
      actor: 'tester',
    });

    expect(createReportRequest).toHaveBeenCalledWith({ actor: 'tester' });
    expect(auditMutation).toHaveBeenCalledWith(
      expect.anything(),
      'GENERATE',
      'audit_report',
      expect.objectContaining({ resourceId: 'report-1' }),
    );
  });
});
