import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminPlatformService {
  private readonly importJobs = new Map<
    string,
    { tenantId: string; status: string; progress: number; startedAt: string }
  >();

  constructor(private readonly databaseService: DatabaseService) {}

  createTenant(input: Record<string, unknown>) {
    return {
      id: randomUUID(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      ...input,
    };
  }

  patchTenant(id: string, input: Record<string, unknown>) {
    return {
      id,
      updatedAt: new Date().toISOString(),
      ...input,
    };
  }

  startTenantImport(id: string, input: Record<string, unknown>) {
    const jobId = randomUUID();
    this.importJobs.set(jobId, {
      tenantId: id,
      status: 'RUNNING',
      progress: 5,
      startedAt: new Date().toISOString(),
    });
    return {
      tenantId: id,
      jobId,
      status: 'RUNNING',
      ...input,
    };
  }

  importProgress(id: string, jobId: string) {
    const job = this.importJobs.get(jobId);
    if (!job || job.tenantId !== id) {
      return {
        tenantId: id,
        jobId,
        status: 'NOT_FOUND',
        progress: 0,
      };
    }
    return {
      tenantId: id,
      jobId,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt,
    };
  }

  async reprocessEsocialEvent(id: string) {
    if (!this.databaseService.configured) {
      return {
        eventId: id,
        status: 'REPROCESS_QUEUED',
        queuedAt: new Date().toISOString(),
      };
    }

    await this.databaseService.query(
      `
      UPDATE public.esocial_spool
      SET
        status = 'PENDING'::public.esocial_spool_status,
        attempt = 0,
        error = NULL,
        tstamp_sent = NULL,
        tstamp_recv = NULL,
        tstamp_terminal = NULL
      WHERE message_id = $1::uuid
      `,
      [id],
    );
    return {
      eventId: id,
      status: 'REPROCESS_QUEUED',
      queuedAt: new Date().toISOString(),
    };
  }

  async updateEsocialCertificate(input: Record<string, unknown>) {
    if (this.databaseService.configured) {
      await this.databaseService.query(
        `
        INSERT INTO public.system_parameter (
          key,
          value,
          description,
          module_key
        )
        VALUES (
          'fiscal.icp_certificate',
          $1::jsonb,
          'Fiscal ICP-Brasil certificate configuration',
          'integracoes'
        )
        ON CONFLICT (tenant_id, key) DO UPDATE
        SET value = EXCLUDED.value,
            description = EXCLUDED.description,
            module_key = EXCLUDED.module_key,
            updated_at = now()
        `,
        [JSON.stringify(input)],
      );
    }
    return {
      updated: true,
      updatedAt: new Date().toISOString(),
      ...input,
    };
  }
}
