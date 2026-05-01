import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import {
  IntegrationsWorkerService,
  REPORT_SERVICE_DEFINITIONS,
} from '../integrations-worker/integrations-worker.service';
import {
  ReportServicePollDto,
  RuntimeReportRequestDto,
} from './report-service.dto';

interface IdRow extends QueryResultRow {
  id: string;
}

interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  definition_code: string;
  requested_at: Date | string;
}

interface NormalizedRuntimeReportRequest {
  tenantId: string;
  definitionCode: string;
  moduleKey: string;
  name: string;
  description: string;
  branchId: string | null;
  payrollRunId: string | null;
  processingTypeId: string | null;
  competenceYear: number | null;
  competenceMonth: number | null;
  parameters: Record<string, unknown>;
  dryRun: boolean;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REPORT_SERVICE_PERMISSIONS = [
  'relatorio.read',
  'relatorio.generate',
  'documents.register',
] as const;

@Injectable()
export class ReportRuntimeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsWorkerService: IntegrationsWorkerService,
  ) {}

  health() {
    return {
      ok: true,
      service: 'sgp-report-service',
      status: 'implemented',
      databaseConfigured: this.databaseService.configured,
      supportedDefinitions: REPORT_SERVICE_DEFINITIONS,
      storageContract: {
        configuredRuntime: 'S3',
        localFallback: 'development-only',
      },
      timestamp: new Date().toISOString(),
    };
  }

  status() {
    return {
      ...this.health(),
      queues: {
        localAdapter: 'public.report_request',
        excludedDefinitions: ['ESOCIAL_EVENTO_PROCESSAR'],
      },
    };
  }

  validateRequest(
    input: RuntimeReportRequestDto,
  ): NormalizedRuntimeReportRequest {
    if (!input?.tenantId || !UUID_PATTERN.test(input.tenantId)) {
      throw new BadRequestException('tenantId must be a UUID');
    }

    const definitionCode = input.definitionCode?.trim().toUpperCase();
    if (!definitionCode) {
      throw new BadRequestException('definitionCode is required');
    }
    if (definitionCode === 'ESOCIAL_EVENTO_PROCESSAR') {
      throw new BadRequestException(
        'eSocial event XML processing belongs to sgp-esocial-worker',
      );
    }

    this.validateOptionalUuid(input.branchId, 'branchId');
    this.validateOptionalUuid(input.payrollRunId, 'payrollRunId');
    this.validateOptionalUuid(input.processingTypeId, 'processingTypeId');

    if (
      (input.competenceYear === undefined) !==
      (input.competenceMonth === undefined)
    ) {
      throw new BadRequestException(
        'competenceYear and competenceMonth must be provided together',
      );
    }

    return {
      tenantId: input.tenantId,
      definitionCode,
      moduleKey: input.moduleKey?.trim() || 'RELATORIO',
      name: input.name?.trim() || definitionCode,
      description: input.description?.trim() || 'Runtime report request.',
      branchId: input.branchId ?? null,
      payrollRunId: input.payrollRunId ?? null,
      processingTypeId: input.processingTypeId ?? null,
      competenceYear: input.competenceYear ?? null,
      competenceMonth: input.competenceMonth ?? null,
      parameters: input.parameters ?? {},
      dryRun: input.dryRun ?? false,
    };
  }

  async queueReport(input: RuntimeReportRequestDto) {
    const request = this.validateRequest(input);
    if (request.dryRun) {
      return {
        accepted: true,
        dryRun: true,
        definitionCode: request.definitionCode,
        tenantId: request.tenantId,
        status: 'VALIDATED',
      };
    }

    this.ensureDatabase();
    return this.runWithinTenant(request.tenantId, async () => {
      const definitionId = await this.ensureDefinition(request);
      const rows = await this.databaseService.query<ReportRequestRow>(
        `
        INSERT INTO public.report_request (
          tenant_id,
          definition_id,
          branch_id,
          payroll_run_id,
          processing_type_id,
          competence_year,
          competence_month,
          parameters,
          status
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          $5::uuid,
          $6::int,
          $7::int,
          $8::jsonb,
          'REQUESTED'::"ReportRequestStatus"
        )
        RETURNING
          id::text,
          status::text,
          $9::text AS definition_code,
          requested_at
        `,
        [
          request.tenantId,
          definitionId,
          request.branchId,
          request.payrollRunId,
          request.processingTypeId,
          request.competenceYear,
          request.competenceMonth,
          JSON.stringify(request.parameters),
          request.definitionCode,
        ],
      );
      const row = rows[0];
      return {
        accepted: true,
        dryRun: false,
        id: row.id,
        definitionCode: row.definition_code,
        status: row.status,
        requestedAt: this.toIso(row.requested_at),
      };
    });
  }

  async pollOnce(input: ReportServicePollDto = {}) {
    const limit = this.normalizeLimit(input.limit ?? 10);
    return this.integrationsWorkerService.pollOnce(
      limit,
      REPORT_SERVICE_DEFINITIONS,
    );
  }

  private async ensureDefinition(
    request: NormalizedRuntimeReportRequest,
  ): Promise<string> {
    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO public.report_definition (
        tenant_id,
        code,
        module_key,
        name,
        description
      )
      VALUES ($1::uuid, $2, $3, $4, $5)
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET module_key = EXCLUDED.module_key,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = now()
      RETURNING id::text
      `,
      [
        request.tenantId,
        request.definitionCode,
        request.moduleKey,
        request.name,
        request.description,
      ],
    );
    return rows[0].id;
  }

  private validateOptionalUuid(value: string | undefined, field: string): void {
    if (value !== undefined && !UUID_PATTERN.test(value)) {
      throw new BadRequestException(`${field} must be a UUID`);
    }
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1) return 10;
    return Math.min(limit, 100);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for report service operations',
      );
    }
  }

  private runWithinTenant<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return RequestContextStore.run(
      {
        tenantId,
        permissions: [...REPORT_SERVICE_PERMISSIONS],
      },
      fn,
    );
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
