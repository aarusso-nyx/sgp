import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('delegates event listing to query service', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const service = new AuditService({ list } as never, {} as never);

    await service.list({ page: 1, pageSize: 20 });

    expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it('delegates mutation writes to writer service', async () => {
    const appendMutation = jest.fn().mockResolvedValue(undefined);
    const service = new AuditService({} as never, { appendMutation } as never);

    await service.appendMutation(
      { requestId: 'req-1' } as never,
      'UPDATE',
      'payroll_run',
      { resourceId: 'pr-1' },
    );

    expect(appendMutation).toHaveBeenCalledWith(
      expect.anything(),
      'UPDATE',
      'payroll_run',
      { resourceId: 'pr-1' },
    );
  });
});
