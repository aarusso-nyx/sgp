import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const documentRow = {
    id: 'doc-1',
    owner_type: 'report_request',
    owner_id: 'report-1',
    file_name: 'file.pdf',
    content_type: 'application/pdf',
    size_bytes: 42,
    storage_kind: 'S3',
    storage_key: 'documents/report/doc-1-file.pdf',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('returns paged document metadata', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          owner_type: 'report_request',
          owner_id: 'req-1',
          file_name: 'a.pdf',
          content_type: 'application/pdf',
          size_bytes: 20,
          storage_kind: 'S3',
          storage_key: 'documents/report/doc-1-a.pdf',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    const service = new DocumentsService(
      { configured: true, query } as never,
      { configured: () => true } as never,
    );

    const result = await service.list({ page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'doc-1',
        fileName: 'a.pdf',
        storageKind: 'S3',
      }),
    );
  });

  it('creates upload session and presigned url', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'doc-1' }])
      .mockResolvedValueOnce([{ id: 'session-1' }]);
    const createPresignedUpload = jest.fn().mockResolvedValue({
      url: 'https://s3.example/upload',
      requiredHeaders: { 'content-type': 'application/pdf' },
      expiresAt: '2026-01-01T00:05:00.000Z',
    });
    const service = new DocumentsService(
      { configured: true, query } as never,
      {
        configured: () => true,
        bucket: 'sgp-bucket',
        keyPrefix: 'documents',
        createPresignedUpload,
      } as never,
    );

    const result = await service.presignUpload(
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
        sizeBytes: 42,
      },
    );

    expect(createPresignedUpload).toHaveBeenCalled();
    expect(result.uploadSessionId).toBe('session-1');
    expect(result.documentId).toBe('doc-1');
  });

  it('uses tenant fallback and optional upload defaults when presigning', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'doc-2' }])
      .mockResolvedValueOnce([{ id: 'session-2' }]);
    const service = new DocumentsService(
      { configured: true, query } as never,
      {
        configured: () => true,
        bucket: undefined,
        keyPrefix: 'docs',
        createPresignedUpload: jest.fn().mockResolvedValue({
          url: 'https://s3.example/upload',
          requiredHeaders: {},
          expiresAt: '2026-01-01T00:05:00.000Z',
        }),
      } as never,
    );

    const result = await service.presignUpload(
      {
        tenantId: 'tenant-only',
      } as never,
      {
        ownerType: 'payroll',
        fileName: 'file with spaces.pdf',
        contentType: 'application/pdf',
      },
    );

    expect(result.bucket).toBe('');
    expect(result.storageKey).toContain('tenant-only/docs/payroll/');
    expect(result.storageKey).toContain('doc-2-file-with-spaces.pdf');
    expect(query.mock.calls[1][1]).toEqual([
      'doc-2',
      null,
      null,
      null,
      'payroll',
      '',
      'file with spaces.pdf',
      'application/pdf',
      null,
      undefined,
      expect.stringContaining('doc-2-file-with-spaces.pdf'),
      '{}',
      '2026-01-01T00:05:00.000Z',
    ]);
  });

  it('registers pending upload and persists attachment metadata', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          document_id: 'doc-1',
          status: 'PENDING',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          owner_type: 'report_request',
          owner_id: 'report-1',
          file_name: 'file.pdf',
          content_type: 'application/pdf',
          size_bytes: 42,
          storage_key: 'documents/report/doc-1-file.pdf',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          owner_type: 'report_request',
          owner_id: 'report-1',
          file_name: 'file.pdf',
          content_type: 'application/pdf',
          size_bytes: 42,
          storage_kind: 'S3',
          storage_key: 'documents/report/doc-1-file.pdf',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);
    const ensureObjectExists = jest.fn().mockResolvedValue(undefined);
    const service = new DocumentsService(
      { configured: true, query } as never,
      { configured: () => true, ensureObjectExists } as never,
    );

    const result = await service.registerUpload('session-1');
    expect(ensureObjectExists).toHaveBeenCalledWith(
      'documents/report/doc-1-file.pdf',
    );
    expect(result.id).toBe('doc-1');
  });

  it('rejects missing, non-pending, and expired upload sessions', async () => {
    await expect(
      new DocumentsService(
        {
          configured: true,
          query: jest.fn().mockResolvedValueOnce([]),
        } as never,
        { configured: () => true } as never,
      ).registerUpload('missing'),
    ).rejects.toThrow('Document upload session not found');

    await expect(
      new DocumentsService(
        {
          configured: true,
          query: jest.fn().mockResolvedValueOnce([
            {
              id: 'session-1',
              document_id: 'doc-1',
              status: 'REGISTERED',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              owner_type: 'report_request',
              owner_id: null,
              file_name: 'file.pdf',
              content_type: 'application/pdf',
              size_bytes: null,
              storage_key: 'documents/report/doc-1-file.pdf',
            },
          ]),
        } as never,
        { configured: () => true } as never,
      ).registerUpload('session-1'),
    ).rejects.toThrow('Document upload session is not pending');

    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          document_id: 'doc-1',
          status: 'PENDING',
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          owner_type: 'report_request',
          owner_id: null,
          file_name: 'file.pdf',
          content_type: 'application/pdf',
          size_bytes: null,
          storage_key: 'documents/report/doc-1-file.pdf',
        },
      ])
      .mockResolvedValueOnce([]);
    await expect(
      new DocumentsService(
        { configured: true, query } as never,
        { configured: () => true } as never,
      ).registerUpload('session-1'),
    ).rejects.toThrow('Document upload session expired');
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SET status = 'EXPIRED'"),
      ['session-1'],
    );
  });

  it('creates a presigned download url and records download audit', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          owner_type: 'report_request',
          owner_id: 'report-1',
          file_name: 'file.pdf',
          content_type: 'application/pdf',
          size_bytes: 42,
          storage_kind: 'S3',
          storage_key: 'documents/report/doc-1-file.pdf',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);
    const createPresignedDownload = jest.fn().mockResolvedValue({
      url: 'https://s3.example/download',
      expiresAt: '2026-01-01T00:05:00.000Z',
    });
    const service = new DocumentsService(
      { configured: true, query } as never,
      {
        configured: () => true,
        createPresignedDownload,
      } as never,
    );

    const result = await service.presignDownload(
      { requestId: 'req-1' } as never,
      'doc-1',
    );
    expect(createPresignedDownload).toHaveBeenCalledWith(
      'documents/report/doc-1-file.pdf',
    );
    expect(result.documentId).toBe('doc-1');
  });

  it('returns download audit pages and deletes attachments', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'audit-1',
          downloaded_at: '2026-01-01T00:00:00.000Z',
          user_id: null,
          request_id: null,
        },
      ])
      .mockResolvedValueOnce([{ id: 'doc-1' }])
      .mockResolvedValueOnce([]);
    const service = new DocumentsService(
      { configured: true, query } as never,
      { configured: () => true } as never,
    );

    await expect(
      service.downloadAudit('doc-1', { page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({
      total: 1,
      totalPages: 1,
      items: [{ id: 'audit-1', userId: null, requestId: null }],
    });
    await expect(service.deleteAttachment('doc-1')).resolves.toEqual({
      id: 'doc-1',
      deleted: true,
    });
    await expect(service.deleteAttachment('missing')).rejects.toThrow(
      'Document attachment not found',
    );
  });

  it('rejects downloads for missing documents and unavailable runtime dependencies', async () => {
    await expect(
      new DocumentsService(
        {
          configured: true,
          query: jest.fn().mockResolvedValueOnce([]),
        } as never,
        { configured: () => true } as never,
      ).presignDownload({} as never, 'missing'),
    ).rejects.toThrow('Document attachment not found');

    await expect(
      new DocumentsService(
        { configured: false } as never,
        { configured: () => true } as never,
      ).list({}),
    ).rejects.toThrow('DATABASE_URL is required');

    await expect(
      new DocumentsService(
        { configured: true } as never,
        { configured: () => false } as never,
      ).presignUpload({ tenantId: 'tenant-1' } as never, {
        ownerType: 'report_request',
        fileName: 'file.pdf',
        contentType: 'application/pdf',
      }),
    ).rejects.toThrow('S3_DOCUMENTS_BUCKET and S3_REGION are required');

    await expect(
      new DocumentsService(
        {
          configured: true,
          query: jest.fn().mockResolvedValueOnce([{ id: 'doc-tenant' }]),
        } as never,
        { configured: () => true } as never,
      ).presignUpload({} as never, {
        ownerType: 'report_request',
        fileName: 'file.pdf',
        contentType: 'application/pdf',
      }),
    ).rejects.toThrow('Tenant context is missing');
  });

  it('returns not found when uploaded object is missing during register', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'session-1',
        document_id: 'doc-1',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        owner_type: 'report_request',
        owner_id: 'report-1',
        file_name: 'file.pdf',
        content_type: 'application/pdf',
        size_bytes: 42,
        storage_key: 'documents/report/doc-1-file.pdf',
      },
    ]);
    const ensureObjectExists = jest
      .fn()
      .mockRejectedValue(new NotFoundException('Upload object not found'));
    const service = new DocumentsService(
      { configured: true, query } as never,
      { configured: () => true, ensureObjectExists } as never,
    );

    await expect(service.registerUpload('session-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
