import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../common/pagination/paged-response';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { DatabaseService } from '../database/database.service';
import {
  PresignUploadRequestDto,
  PresignedDownloadDto,
  PresignedUploadDto,
  RegisteredDocumentDto,
} from './documents.dto';
import { DocumentsStorageService } from './documents-storage.service';

interface DocumentRow extends QueryResultRow {
  id: string;
  owner_type: string | null;
  owner_id: string | null;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  storage_kind: string;
  storage_key: string;
  created_at: Date | string;
}

interface AuditRow extends QueryResultRow {
  id: string;
  downloaded_at: Date | string;
  user_id: string | null;
  request_id: string | null;
}

interface CountRow extends QueryResultRow {
  total: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface UploadSessionRow extends QueryResultRow {
  id: string;
  document_id: string;
  status: string;
  expires_at: Date | string;
  owner_type: string;
  owner_id: string | null;
  file_name: string;
  content_type: string;
  size_bytes: number | null;
  storage_key: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: DocumentsStorageService,
  ) {}

  async list(query: DomainListQueryDto): Promise<PagedResponse<unknown>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.document_attachment d
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', d.file_name, d.content_type, d.owner_type, d.storage_kind::text)) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<DocumentRow>(
      `
      SELECT id, owner_type, owner_id::text, file_name, content_type, size_bytes, storage_kind::text, storage_key, created_at
      FROM public.document_attachment d
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', d.file_name, d.content_type, d.owner_type, d.storage_kind::text)) LIKE $1
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => ({
        id: row.id,
        ownerType: row.owner_type,
        ownerId: row.owner_id,
        fileName: row.file_name,
        contentType: row.content_type,
        sizeBytes: row.size_bytes,
        storageKind: row.storage_kind,
        storageKey: row.storage_key,
        createdAt: this.toIso(row.created_at),
      })),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async downloadAudit(
    documentId: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<unknown>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.document_download_audit
      WHERE attachment_id = $1::uuid
      `,
      [documentId],
    );

    const rows = await this.databaseService.query<AuditRow>(
      `
      SELECT id, downloaded_at, user_id::text, request_id
      FROM public.document_download_audit
      WHERE attachment_id = $1::uuid
      ORDER BY downloaded_at DESC
      LIMIT $2 OFFSET $3
      `,
      [documentId, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => ({
        id: row.id,
        downloadedAt: this.toIso(row.downloaded_at),
        userId: row.user_id,
        requestId: row.request_id,
      })),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async presignUpload(
    request: RequestWithContext,
    body: PresignUploadRequestDto,
  ): Promise<PresignedUploadDto> {
    this.ensureDatabase();
    this.ensureStorage();

    const documentRows = await this.databaseService.query<IdRow>(
      'SELECT gen_random_uuid()::text AS id',
    );
    const documentId = documentRows[0].id;
    const storageKey = this.buildStorageKey(
      this.requireTenantId(request),
      documentId,
      body.ownerType,
      body.fileName,
    );
    const presigned = await this.storageService.createPresignedUpload({
      storageKey,
      contentType: body.contentType,
    });

    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO public.document_upload_session (
        document_id,
        requested_by_sub,
        requested_by_login,
        request_id,
        owner_type,
        owner_id,
        file_name,
        content_type,
        size_bytes,
        storage_bucket,
        storage_key,
        required_headers,
        status,
        expires_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        NULLIF($6, ''),
        $7,
        $8,
        $9,
        $10,
        $11,
        $12::jsonb,
        'PENDING'::"DocumentUploadStatus",
        $13::timestamptz
      )
      RETURNING id::text
      `,
      [
        documentId,
        request.actor?.sub ?? null,
        request.actor?.username ?? null,
        request.requestId ?? null,
        body.ownerType,
        body.ownerId ?? '',
        body.fileName,
        body.contentType,
        body.sizeBytes ?? null,
        this.storageService.bucket,
        storageKey,
        JSON.stringify(presigned.requiredHeaders),
        presigned.expiresAt,
      ],
    );

    return {
      uploadSessionId: rows[0].id,
      documentId,
      uploadUrl: presigned.url,
      bucket: this.storageService.bucket ?? '',
      storageKey,
      requiredHeaders: presigned.requiredHeaders,
      expiresAt: presigned.expiresAt,
    };
  }

  async registerUpload(
    uploadSessionId: string,
  ): Promise<RegisteredDocumentDto> {
    this.ensureDatabase();
    this.ensureStorage();

    const sessions = await this.databaseService.query<UploadSessionRow>(
      `
      SELECT
        id::text,
        document_id::text,
        status::text,
        expires_at,
        owner_type,
        owner_id,
        file_name,
        content_type,
        size_bytes,
        storage_key
      FROM public.document_upload_session
      WHERE id = $1::uuid
      `,
      [uploadSessionId],
    );
    const session = sessions[0];
    if (!session) {
      throw new NotFoundException('Document upload session not found');
    }
    if (session.status !== 'PENDING') {
      throw new ConflictException('Document upload session is not pending');
    }
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await this.databaseService.query(
        `
        UPDATE public.document_upload_session
        SET status = 'EXPIRED'::"DocumentUploadStatus",
            updated_at = now()
        WHERE id = $1::uuid
        `,
        [uploadSessionId],
      );
      throw new ConflictException('Document upload session expired');
    }

    await this.storageService.ensureObjectExists(session.storage_key);
    const rows = await this.databaseService.query<DocumentRow>(
      `
      INSERT INTO public.document_attachment (
        id,
        owner_type,
        owner_id,
        storage_kind,
        file_name,
        content_type,
        size_bytes,
        checksum,
        storage_key
      )
      VALUES (
        $1::uuid,
        $2,
        NULLIF($3, ''),
        'S3'::"DocumentStorageKind",
        $4,
        $5,
        $6,
        $7,
        $8
      )
      ON CONFLICT (id) DO UPDATE
      SET
        owner_type = EXCLUDED.owner_type,
        owner_id = EXCLUDED.owner_id,
        storage_kind = EXCLUDED.storage_kind,
        file_name = EXCLUDED.file_name,
        content_type = EXCLUDED.content_type,
        size_bytes = EXCLUDED.size_bytes,
        checksum = EXCLUDED.checksum,
        storage_key = EXCLUDED.storage_key,
        updated_at = now()
      RETURNING
        id::text,
        owner_type,
        owner_id::text,
        file_name,
        content_type,
        size_bytes,
        storage_kind::text,
        storage_key,
        created_at
      `,
      [
        session.document_id,
        session.owner_type,
        session.owner_id ?? '',
        session.file_name,
        session.content_type,
        session.size_bytes ?? null,
        this.checksumForRegisteredObject(session.storage_key),
        session.storage_key,
      ],
    );
    await this.databaseService.query(
      `
      UPDATE public.document_upload_session
      SET
        status = 'REGISTERED'::"DocumentUploadStatus",
        registered_attachment_id = $2::uuid,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [uploadSessionId, session.document_id],
    );

    const row = rows[0];
    return {
      id: row.id,
      ownerType: row.owner_type ?? '',
      ownerId: row.owner_id,
      fileName: row.file_name,
      contentType: row.content_type ?? '',
      sizeBytes: row.size_bytes,
      storageKind: row.storage_kind,
      storageKey: row.storage_key,
      createdAt: this.toIso(row.created_at),
    };
  }

  async presignDownload(
    request: RequestWithContext,
    documentId: string,
  ): Promise<PresignedDownloadDto> {
    this.ensureDatabase();
    this.ensureStorage();

    const documents = await this.databaseService.query<DocumentRow>(
      `
      SELECT
        id::text,
        owner_type,
        owner_id::text,
        file_name,
        content_type,
        size_bytes,
        storage_kind::text,
        storage_key,
        created_at
      FROM public.document_attachment
      WHERE id = $1::uuid
      `,
      [documentId],
    );
    const document = documents[0];
    if (!document) {
      throw new NotFoundException('Document attachment not found');
    }

    const presigned = await this.storageService.createPresignedDownload(
      document.storage_key,
    );
    await this.databaseService.query(
      `
      INSERT INTO public.document_download_audit (
        attachment_id,
        user_id,
        request_id,
        ip_address
      )
      VALUES ($1::uuid, NULL, $2, NULL)
      `,
      [documentId, request.requestId ?? null],
    );

    return {
      documentId,
      downloadUrl: presigned.url,
      expiresAt: presigned.expiresAt,
    };
  }

  async deleteAttachment(id: string): Promise<{ id: string; deleted: true }> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<IdRow>(
      `
      DELETE FROM public.document_attachment
      WHERE id = $1::uuid
      RETURNING id::text
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Document attachment not found');
    }
    return { id: rows[0].id, deleted: true };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for document operations',
      );
    }
  }

  private ensureStorage(): void {
    if (!this.storageService.configured()) {
      throw new ServiceUnavailableException(
        'S3_DOCUMENTS_BUCKET and S3_REGION are required for document upload/download operations outside test MiniIO mode',
      );
    }
  }

  private buildStorageKey(
    tenantId: string,
    documentId: string,
    ownerType: string,
    fileName: string,
  ): string {
    const safeName = fileName
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '/');
    return `${tenantId}/${this.storageService.keyPrefix}/${ownerType}/${stamp}/${documentId}-${safeName}`;
  }

  private requireTenantId(request: RequestWithContext): string {
    const tenantId = request.actor?.tenantId ?? request.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is missing');
    }
    return tenantId;
  }

  private checksumForRegisteredObject(storageKey: string): string {
    return `sha256:${createHash('sha256').update(storageKey).digest('hex')}`;
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
