import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { DocumentsStorageService } from './documents-storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example/signed'),
}));

describe('DocumentsStorageService', () => {
  const createConfig = (values: Record<string, unknown>) => ({
    get: jest.fn((key: string) => values[key]),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses Docker MiniIO defaults in tests when S3 is not configured', async () => {
    const send = jest.fn().mockResolvedValue({});
    const service = new DocumentsStorageService(
      createConfig({ NODE_ENV: 'test' }) as never,
    );
    (service as unknown as { client: { send: jest.Mock } }).client = {
      send,
    };

    expect(service.configured()).toBe(true);
    expect(service.bucket).toBe('sgp-test-documents');
    expect(service.keyPrefix).toBe('documents');
    expect(service.uploadExpiresInSeconds).toBe(900);
    expect(service.downloadExpiresInSeconds).toBe(300);

    const result = await service.storeGeneratedObject({
      storageKey: 'reports/output.txt',
      contentType: 'text/plain',
      body: 'report body',
    });

    expect(result).toMatchObject({
      storageKind: 'S3',
      storageKey: 'reports/output.txt',
      sizeBytes: Buffer.byteLength('report body'),
    });
    expect(result.checksum).toHaveLength(64);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('uses configured S3 for presigned urls, object checks, and generated documents', async () => {
    const send = jest.fn().mockResolvedValue({});
    const service = new DocumentsStorageService(
      createConfig({
        S3_DOCUMENTS_BUCKET: 'sgp-documents',
        S3_REGION: 'sa-east-1',
        S3_DOCUMENTS_KEY_PREFIX: 'tenant-documents',
        S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS: 120,
        S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS: 60,
      }) as never,
    );
    (service as unknown as { client: { send: jest.Mock } }).client = {
      send,
    };

    await expect(
      service.createPresignedUpload({
        storageKey: 'documents/a.pdf',
        contentType: 'application/pdf',
      }),
    ).resolves.toMatchObject({
      url: 'https://s3.example/signed',
      requiredHeaders: { 'content-type': 'application/pdf' },
    });
    await expect(
      service.createPresignedDownload('documents/a.pdf'),
    ).resolves.toMatchObject({ url: 'https://s3.example/signed' });
    await expect(
      service.ensureObjectExists('documents/a.pdf'),
    ).resolves.toBeUndefined();
    await expect(
      service.storeGeneratedObject({
        storageKey: 'documents/generated.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('pdf'),
      }),
    ).resolves.toMatchObject({
      storageKind: 'S3',
      storageKey: 'documents/generated.pdf',
      sizeBytes: 3,
    });

    expect(service.configured()).toBe(true);
    expect(service.keyPrefix).toBe('tenant-documents');
    expect(service.uploadExpiresInSeconds).toBe(120);
    expect(service.downloadExpiresInSeconds).toBe(60);
    expect(getSignedUrl).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('maps S3 validation failures to public storage exceptions', async () => {
    const notFound = new Error('missing');
    notFound.name = 'NotFound';
    const send = jest
      .fn()
      .mockRejectedValueOnce(notFound)
      .mockRejectedValueOnce(new Error('network'));
    const service = new DocumentsStorageService(
      createConfig({
        S3_DOCUMENTS_BUCKET: 'sgp-documents',
        S3_REGION: 'sa-east-1',
      }) as never,
    );
    (service as unknown as { client: { send: jest.Mock } }).client = { send };

    await expect(
      service.ensureObjectExists('missing.pdf'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.ensureObjectExists('network.pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('requires bucket and region for S3-only operations', async () => {
    const noBucket = new DocumentsStorageService(createConfig({}) as never);
    await expect(
      noBucket.createPresignedDownload('a.pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      noBucket.storeGeneratedObject({
        storageKey: 'a.pdf',
        contentType: 'application/pdf',
        body: 'pdf',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    const noRegion = new DocumentsStorageService(
      createConfig({ S3_DOCUMENTS_BUCKET: 'sgp-documents' }) as never,
    );
    await expect(noRegion.ensureObjectExists('a.pdf')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
