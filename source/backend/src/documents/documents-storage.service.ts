import { createHash } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUploadResult {
  url: string;
  requiredHeaders: Record<string, string>;
  expiresAt: string;
}

export interface PresignedDownloadResult {
  url: string;
  expiresAt: string;
}

export interface StoredGeneratedObject {
  storageKind: 'S3';
  storageKey: string;
  sizeBytes: number;
  checksum: string;
}

interface StorageRuntimeConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

@Injectable()
export class DocumentsStorageService {
  private client?: S3Client;

  constructor(private readonly configService: ConfigService) {}

  get bucket(): string | undefined {
    return this.storageConfig()?.bucket;
  }

  get keyPrefix(): string {
    return (
      this.configService.get<string>('S3_DOCUMENTS_KEY_PREFIX') ?? 'documents'
    );
  }

  get uploadExpiresInSeconds(): number {
    return (
      this.configService.get<number>('S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS') ??
      900
    );
  }

  get downloadExpiresInSeconds(): number {
    return (
      this.configService.get<number>('S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS') ??
      300
    );
  }

  configured(): boolean {
    return Boolean(this.storageConfig());
  }

  async createPresignedUpload(input: {
    storageKey: string;
    contentType: string;
  }): Promise<PresignedUploadResult> {
    const bucket = this.requireBucket();
    const expiresIn = this.uploadExpiresInSeconds;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: input.storageKey,
      ContentType: input.contentType,
    });
    const url = await getSignedUrl(this.getClient(), command, { expiresIn });
    return {
      url,
      requiredHeaders: {
        'content-type': input.contentType,
      },
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  async createPresignedDownload(
    storageKey: string,
  ): Promise<PresignedDownloadResult> {
    const bucket = this.requireBucket();
    const expiresIn = this.downloadExpiresInSeconds;
    const url = await getSignedUrl(
      this.getClient(),
      new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
      { expiresIn },
    );
    return {
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  async ensureObjectExists(storageKey: string): Promise<void> {
    const bucket = this.requireBucket();
    try {
      await this.getClient().send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: storageKey,
        }),
      );
    } catch (error) {
      if (
        error instanceof NoSuchKey ||
        (error instanceof Error && error.name === 'NotFound')
      ) {
        throw new NotFoundException(
          'Upload object not found in configured S3 bucket',
        );
      }
      throw new ServiceUnavailableException(
        'Unable to validate uploaded object in S3',
      );
    }
  }

  async storeGeneratedObject(input: {
    storageKey: string;
    contentType: string;
    body: string | Buffer;
  }): Promise<StoredGeneratedObject> {
    const buffer =
      typeof input.body === 'string'
        ? Buffer.from(input.body, 'utf8')
        : input.body;
    const checksum = createHash('sha256').update(buffer).digest('hex');

    const bucket = this.requireBucket();
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.storageKey,
        Body: buffer,
        ContentType: input.contentType,
        Metadata: {
          checksum,
        },
      }),
    );

    return {
      storageKind: 'S3',
      storageKey: input.storageKey,
      sizeBytes: buffer.byteLength,
      checksum,
    };
  }

  private requireBucket(): string {
    const storage = this.storageConfig();
    if (!storage) {
      throw new ServiceUnavailableException(
        'S3_DOCUMENTS_BUCKET and S3_REGION are required for document operations outside test MiniIO mode',
      );
    }
    return storage.bucket;
  }

  private getClient(): S3Client {
    if (this.client) return this.client;
    const storage = this.storageConfig();
    if (!storage) {
      throw new ServiceUnavailableException(
        'S3_DOCUMENTS_BUCKET and S3_REGION are required for document operations outside test MiniIO mode',
      );
    }
    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: storage.region,
    };
    if (storage.endpoint) {
      clientConfig.endpoint = storage.endpoint;
      clientConfig.forcePathStyle = storage.forcePathStyle;
    }
    if (storage.credentials) {
      clientConfig.credentials = storage.credentials;
    }

    this.client = new S3Client(clientConfig);
    return this.client;
  }

  private storageConfig(): StorageRuntimeConfig | undefined {
    const bucket = this.configService.get<string>('S3_DOCUMENTS_BUCKET');
    const region = this.configService.get<string>('S3_REGION');

    if (bucket && region) {
      return {
        bucket,
        region,
        endpoint: this.configService.get<string>('S3_ENDPOINT'),
        forcePathStyle:
          this.configService.get<boolean>('S3_FORCE_PATH_STYLE') ?? false,
      };
    }

    if (!this.testMiniIOEnabled()) {
      return undefined;
    }

    return {
      bucket:
        this.configService.get<string>('MINIO_DOCUMENTS_BUCKET') ??
        'sgp-test-documents',
      region: this.configService.get<string>('MINIO_REGION') ?? 'us-east-1',
      endpoint:
        this.configService.get<string>('MINIO_ENDPOINT') ??
        'http://127.0.0.1:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId:
          this.configService.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
      },
    };
  }

  private testMiniIOEnabled(): boolean {
    return (
      this.configService.get<string>('NODE_ENV') === 'test' ||
      this.configService.get<boolean>('MINIO_TEST_STORAGE_ENABLED') === true
    );
  }
}
