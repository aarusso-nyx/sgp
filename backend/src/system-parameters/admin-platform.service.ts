import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AdminPlatformService {
  private readonly importJobs = new Map<
    string,
    { tenantId: string; status: string; progress: number; startedAt: string }
  >();
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
}
