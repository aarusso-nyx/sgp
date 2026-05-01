import { DocumentsController } from './documents.controller';

describe('DocumentsController', () => {
  it('delegates canonical upload/download endpoints', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const presignUpload = jest
      .fn()
      .mockResolvedValue({ uploadSessionId: 'up-1' });
    const registerUpload = jest.fn().mockResolvedValue({ id: 'doc-1' });
    const deleteAttachment = jest
      .fn()
      .mockResolvedValue({ id: 'doc-1', deleted: true });
    const presignDownload = jest
      .fn()
      .mockResolvedValue({ downloadUrl: 'https://example.com' });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new DocumentsController(
      {
        list,
        presignUpload,
        registerUpload,
        deleteAttachment,
        presignDownload,
      } as never,
      {
        auditMutation,
      } as never,
    );

    await controller.list({ page: 1, pageSize: 20 });
    await controller.presignUpload(
      {
        requestId: 'req-1',
        actor: {
          sub: 'sub-1',
          username: 'tester',
          tenantId: '00000000-0000-0000-0000-000000000100',
        },
      } as never,
      {
        ownerType: 'report_request',
        ownerId: 'report-1',
        fileName: 'file.pdf',
        contentType: 'application/pdf',
      },
    );
    await controller.registerByPath({ requestId: 'req-1' } as never, {
      anexo_id: 'up-1',
    });
    await controller.deleteAttachment({ requestId: 'req-1' } as never, 'doc-1');
    await controller.presignDownload({ requestId: 'req-1' } as never, 'doc-1');

    expect(list).toHaveBeenCalled();
    expect(presignUpload).toHaveBeenCalled();
    expect(registerUpload).toHaveBeenCalledWith('up-1');
    expect(deleteAttachment).toHaveBeenCalledWith('doc-1');
    expect(presignDownload).toHaveBeenCalledWith(expect.any(Object), 'doc-1');
    expect(auditMutation).toHaveBeenCalledTimes(4);
  });
});
