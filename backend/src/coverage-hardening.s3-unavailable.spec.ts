import {
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { DocumentsStorageService } from './documents/documents-storage.service';

class S3TimeoutError extends Error {
  override name = 'TimeoutError';
}

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function injectClient(
  service: DocumentsStorageService,
  client: { send: jest.Mock },
): void {
  (service as unknown as { client: typeof client }).client = client;
}

const baseConfig = {
  S3_DOCUMENTS_BUCKET: 'sgp-documents-test',
  S3_REGION: 'us-east-1',
};

describe('S3 transport hardening when AWS S3 is unavailable', () => {
  it('translates a NoSuchKey response from HeadObjectCommand into a NotFoundException', async () => {
    const client = {
      send: jest.fn(async (command: object) => {
        if (command instanceof HeadObjectCommand) {
          throw new NoSuchKey({
            $metadata: {},
            message: 'The specified key does not exist',
          });
        }
        throw new Error('unexpected command');
      }),
    };
    const service = new DocumentsStorageService(configWith(baseConfig));
    injectClient(service, client);

    await expect(
      service.ensureObjectExists('missing.pdf'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('translates a generic transport failure on HeadObjectCommand into a ServiceUnavailableException', async () => {
    const client = {
      send: jest.fn(async (command: object) => {
        if (command instanceof HeadObjectCommand) {
          throw new S3ServiceException({
            name: 'InternalError',
            $fault: 'server',
            $metadata: {},
            message: 'Synthetic S3 outage',
          });
        }
        throw new Error('unexpected command');
      }),
    };
    const service = new DocumentsStorageService(configWith(baseConfig));
    injectClient(service, client);

    await expect(
      service.ensureObjectExists('whatever.pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('translates a TimeoutError on HeadObjectCommand into a ServiceUnavailableException', async () => {
    const client = {
      send: jest.fn(async (command: object) => {
        if (command instanceof HeadObjectCommand) {
          throw new S3TimeoutError('Synthetic S3 timeout for hardening test');
        }
        throw new Error('unexpected command');
      }),
    };
    const service = new DocumentsStorageService(configWith(baseConfig));
    injectClient(service, client);

    await expect(
      service.ensureObjectExists('whatever.pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('propagates outages on PutObjectCommand from storeGeneratedObject so the worker can schedule a retry', async () => {
    const client = {
      send: jest.fn(async (command: object) => {
        if (command instanceof PutObjectCommand) {
          throw new S3TimeoutError('Synthetic S3 PutObject timeout');
        }
        throw new Error('unexpected command');
      }),
    };
    const service = new DocumentsStorageService(configWith(baseConfig));
    injectClient(service, client);

    await expect(
      service.storeGeneratedObject({
        storageKey: 'reports/2026-05/run.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('synthetic'),
      }),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('refuses to operate without S3 configuration and returns a typed ServiceUnavailableException at the boundary', async () => {
    const service = new DocumentsStorageService(configWith({}));

    await expect(service.ensureObjectExists('any.pdf')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await expect(
      service.storeGeneratedObject({
        storageKey: 'k',
        contentType: 'text/plain',
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
