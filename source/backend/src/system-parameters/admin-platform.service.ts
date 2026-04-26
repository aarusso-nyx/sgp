import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { DatabaseService } from '../database/database.service';

interface IdRow {
  id: string;
}

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

    const definitionId = await this.ensureEsocialDefinition();
    await this.databaseService.query(
      `
      UPDATE public.esocial_event
      SET
        status = 'PENDENTE'::"ESocialEventStatus",
        retry_count = retry_count + 1,
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [id],
    );
    await this.databaseService.query(
      `
      INSERT INTO public.report_request (
        definition_id,
        parameters
      )
      VALUES ($1::uuid, $2::jsonb)
      `,
      [definitionId, JSON.stringify({ eventId: id, format: 'XML' })],
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
          'esocial.certificate',
          $1::jsonb,
          'eSocial certificate configuration',
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

  private async ensureEsocialDefinition(): Promise<string> {
    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO public.report_definition (
        code,
        module_key,
        name,
        description
      )
      VALUES (
        'ESOCIAL_EVENTO_PROCESSAR',
        'FOLHA',
        'Processar evento eSocial',
        'Gera XML, simula assinatura e encaminha evento eSocial para processamento assíncrono.'
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET module_key = EXCLUDED.module_key,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = now()
      RETURNING id::text
      `,
    );
    return rows[0].id;
  }
}
