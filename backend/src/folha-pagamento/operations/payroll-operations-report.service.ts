import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  IdRow,
  OperationRequestSummary,
  ReportRequestInput,
  ReportRequestRow,
  toIso,
} from './payroll-operations.types';

@Injectable()
export class PayrollOperationsReportService {
  constructor(private readonly databaseService: DatabaseService) {}

  async ensureDefinition(
    code: string,
    name: string,
    description: string,
  ): Promise<string> {
    const rows = await this.databaseService.query<IdRow>(
      `
      WITH inserted AS (
        INSERT INTO public.report_definition (
          tenant_id,
          code,
          name,
          description,
          module_key,
          status
        )
        SELECT
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          $3,
          'folha',
          'ACTIVE'::"RecordStatus"
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.report_definition
          WHERE code = $1
            AND tenant_id = public.sgp_current_tenant_uuid()
        )
        RETURNING id::text
      )
      SELECT id::text FROM inserted
      UNION ALL
      SELECT id::text
      FROM public.report_definition
      WHERE code = $1
        AND tenant_id = public.sgp_current_tenant_uuid()
      LIMIT 1
      `,
      [code, name, description],
    );
    return rows[0]?.id ?? '';
  }

  async createRequest(input: ReportRequestInput): Promise<ReportRequestRow> {
    const requestRows = await this.databaseService.query<ReportRequestRow>(
      `
      INSERT INTO public.report_request (
        tenant_id,
        definition_id,
        branch_id,
        payroll_run_id,
        processing_type_id,
        competence_year,
        competence_month,
        status,
        parameters
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        NULLIF($2, '')::uuid,
        NULLIF($3, '')::uuid,
        NULLIF($4, '')::uuid,
        $5,
        $6,
        'REQUESTED'::"ReportRequestStatus",
        $7::jsonb
      )
      RETURNING id::text, status::text, requested_at
      `,
      [
        input.definitionId,
        input.branchId ?? '',
        input.payrollRunId ?? '',
        input.processingTypeId ?? '',
        input.competenceYear,
        input.competenceMonth,
        JSON.stringify(input.parameters),
      ],
    );

    return requestRows[0]!;
  }

  toRequestSummary(
    row: ReportRequestRow,
    metadata: Record<string, unknown>,
  ): OperationRequestSummary {
    return {
      requestId: row.id,
      status: row.status,
      requestedAt: toIso(row.requested_at),
      metadata,
    };
  }
}
