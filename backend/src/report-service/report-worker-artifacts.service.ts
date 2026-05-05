import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { DocumentsStorageService } from '../documents/documents-storage.service';
import { ReportArtifact } from './report-artifact.builder';
import { IdRow, ReportJobRow, WorkerResult } from './report-worker.types';

@Injectable()
export class ReportWorkerArtifactsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly documentsStorageService: DocumentsStorageService,
  ) {}

  async persistResult(
    job: ReportJobRow,
    artifact: ReportArtifact,
    pathSegment: string,
    metadata: Record<string, unknown>,
  ): Promise<WorkerResult> {
    const checksum = createHash('sha256')
      .update(artifact.content)
      .digest('hex');
    const storageKey = [
      job.tenant_id,
      'outputs',
      'reports',
      pathSegment,
      String(job.competence_year ?? 'unknown'),
      String(job.competence_month ?? 0).padStart(2, '0'),
      job.id,
      artifact.fileName,
    ].join('/');
    const stored = await this.documentsStorageService.storeGeneratedObject({
      storageKey,
      contentType: artifact.contentType,
      body: artifact.content,
    });
    const attachmentId = await this.persistGeneratedFile(
      job,
      artifact,
      stored.storageKind,
      stored.storageKey,
      stored.sizeBytes,
      stored.checksum || checksum,
    );

    return {
      artifact,
      storageKind: stored.storageKind,
      storageKey: stored.storageKey,
      attachmentId,
      checksum: stored.checksum || checksum,
      sizeBytes: stored.sizeBytes,
      files: [
        {
          artifact,
          storageKind: stored.storageKind,
          storageKey: stored.storageKey,
          attachmentId,
          checksum: stored.checksum || checksum,
          sizeBytes: stored.sizeBytes,
        },
      ],
      metadata,
    };
  }

  async persistGeneratedFile(
    job: ReportJobRow,
    artifact: ReportArtifact,
    storageKind: 'S3' | 'LOCAL',
    storageKey: string,
    sizeBytes: number,
    checksum: string,
  ): Promise<string> {
    const storageKindSql =
      storageKind === 'S3'
        ? `'S3'::"DocumentStorageKind"`
        : `'LOCAL'::"DocumentStorageKind"`;
    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO public.document_attachment (
        tenant_id,
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
        public.sgp_current_tenant_uuid(),
        'report_request',
        $1::uuid,
        ${storageKindSql},
        $2,
        $3,
        $4,
        $5,
        $6
      )
      RETURNING id::text
      `,
      [
        job.id,
        artifact.fileName,
        artifact.contentType,
        sizeBytes,
        checksum,
        storageKey,
      ],
    );
    const attachmentId = rows[0]?.id;
    if (!attachmentId) throw new Error('Unable to persist report attachment');

    await this.databaseService.query(
      `
      INSERT INTO public.generated_report_file (
        tenant_id,
        report_request_id,
        attachment_id,
        format,
        competence,
        payroll_run_id,
        file_hash
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3,
        CASE
          WHEN $4::integer IS NULL OR $5::integer IS NULL THEN NULL
          ELSE make_date($4::integer, $5::integer, 1)
        END,
        $6::uuid,
        $7
      )
      `,
      [
        job.id,
        attachmentId,
        artifact.format,
        job.competence_year,
        job.competence_month,
        job.payroll_run_id,
        checksum,
      ],
    );

    return attachmentId;
  }

  combineResults(
    results: WorkerResult[],
    metadata: Record<string, unknown>,
  ): WorkerResult {
    const primary = results[0];
    if (!primary) throw new Error('Report worker produced no files');
    return {
      ...primary,
      files: results.flatMap((result) => result.files),
      metadata,
    };
  }
}
