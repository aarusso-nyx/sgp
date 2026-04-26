import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import {
  CreateGfipRequestDto,
  CreateRemittanceRequestDto,
  ProcessReturnRequestDto,
} from './payroll-operations.dto';

interface CountRow extends QueryResultRow {
  total: string;
}

interface PayrollRunRow extends QueryResultRow {
  id: string;
  branch_id: string | null;
  processing_type_id: string;
  competence_year: number;
  competence_month: number;
  total_net: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface RemittanceRow extends QueryResultRow {
  id: string;
  status: string;
  competence_year: number;
  competence_month: number;
  payment_date: Date | string | null;
  file_name: string | null;
  total_amount: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

export interface RemittanceSummary {
  id: string;
  status: string;
  competenceYear: number;
  competenceMonth: number;
  paymentDate: string | null;
  fileName: string | null;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationRequestSummary {
  requestId: string;
  status: string;
  requestedAt: string;
  metadata: Record<string, unknown>;
}

const REPORT_DEFINITIONS = {
  remittance: {
    code: 'FOLHA_CNAB_REMESSA',
    name: 'Folha - Remessa CNAB',
    description: 'Solicitacao de geracao de remessa bancaria CNAB da folha.',
  },
  returnProcessing: {
    code: 'FOLHA_CNAB_RETORNO',
    name: 'Folha - Retorno CNAB',
    description: 'Solicitacao de processamento de retorno bancario CNAB.',
  },
  gfip: {
    code: 'FOLHA_GFIP_GERAR',
    name: 'Folha - Geracao GFIP/SEFIP',
    description: 'Solicitacao de geracao do arquivo GFIP/SEFIP.',
  },
} as const;

@Injectable()
export class PayrollOperationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listRemittances(
    payrollRunId: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<RemittanceSummary>> {
    this.ensureDatabase();
    await this.getPayrollRun(payrollRunId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM payroll.payment_remittance_file
      WHERE payroll_run_id = $1::uuid
      `,
      [payrollRunId],
    );

    const rows = await this.databaseService.query<RemittanceRow>(
      `
      SELECT
        id::text AS id,
        status::text AS status,
        competence_year,
        competence_month,
        payment_date,
        file_name,
        total_amount::text AS total_amount,
        created_at,
        updated_at
      FROM payroll.payment_remittance_file
      WHERE payroll_run_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [payrollRunId, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toRemittanceSummary(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async requestRemittance(
    payrollRunId: string,
    input: CreateRemittanceRequestDto,
  ): Promise<OperationRequestSummary> {
    this.ensureDatabase();
    const run = await this.getPayrollRun(payrollRunId);
    const nextNumber = await this.getNextRemittanceNumber(run);
    const fileName = `remessa_${String(nextNumber).padStart(6, '0')}.txt`;
    const paymentDate =
      input.paymentDate ??
      new Date(Date.UTC(run.competence_year, run.competence_month - 1, 25))
        .toISOString()
        .slice(0, 10);

    const remittanceRows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO payroll.payment_remittance_file (
        tenant_id,
        payroll_run_id,
        branch_id,
        processing_type_id,
        status,
        competence_year,
        competence_month,
        payment_date,
        file_name,
        total_amount
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        NULLIF($2, '')::uuid,
        $3::uuid,
        'DRAFT'::"PaymentRemittanceStatus",
        $4,
        $5,
        $6::date,
        $7,
        $8::decimal
      )
      RETURNING id::text
      `,
      [
        payrollRunId,
        run.branch_id ?? '',
        run.processing_type_id,
        run.competence_year,
        run.competence_month,
        paymentDate,
        fileName,
        run.total_net,
      ],
    );
    const remittanceId = remittanceRows[0]?.id ?? '';

    const definitionId = await this.ensureDefinition(
      REPORT_DEFINITIONS.remittance.code,
      REPORT_DEFINITIONS.remittance.name,
      REPORT_DEFINITIONS.remittance.description,
    );

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
        $3::uuid,
        $4::uuid,
        $5,
        $6,
        'REQUESTED'::"ReportRequestStatus",
        $7::jsonb
      )
      RETURNING id::text, status::text, requested_at
      `,
      [
        definitionId,
        run.branch_id ?? '',
        payrollRunId,
        run.processing_type_id,
        run.competence_year,
        run.competence_month,
        JSON.stringify({
          operation: 'remessa.gerar',
          remittanceId,
          bankId: input.bankId,
          format: input.format ?? 'CNAB240',
          paymentDate,
          launchType: input.launchType ?? 'ACCOUNT_CREDIT',
          remittanceNumber: nextNumber,
          fileName,
        }),
      ],
    );

    return this.toRequestSummary(requestRows[0], {
      remittanceId,
      remittanceNumber: nextNumber,
      fileName,
    });
  }

  async requestReturnProcessing(
    payrollRunId: string,
    input: ProcessReturnRequestDto,
  ): Promise<OperationRequestSummary> {
    this.ensureDatabase();
    const run = await this.getPayrollRun(payrollRunId);
    await this.getRemittance(payrollRunId, input.remittanceId);

    await this.databaseService.query(
      `
      UPDATE payroll.payment_remittance_file
      SET status = CASE
            WHEN status = 'DRAFT'::"PaymentRemittanceStatus"
              THEN 'SENT'::"PaymentRemittanceStatus"
            ELSE status
          END,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [input.remittanceId],
    );

    const definitionId = await this.ensureDefinition(
      REPORT_DEFINITIONS.returnProcessing.code,
      REPORT_DEFINITIONS.returnProcessing.name,
      REPORT_DEFINITIONS.returnProcessing.description,
    );

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
        $3::uuid,
        $4::uuid,
        $5,
        $6,
        'REQUESTED'::"ReportRequestStatus",
        $7::jsonb
      )
      RETURNING id::text, status::text, requested_at
      `,
      [
        definitionId,
        run.branch_id ?? '',
        payrollRunId,
        run.processing_type_id,
        run.competence_year,
        run.competence_month,
        JSON.stringify({
          operation: 'retorno.processar',
          remittanceId: input.remittanceId,
          s3Key: input.s3Key,
          format: input.format ?? 'CNAB240',
          returnFileName: input.returnFileName ?? null,
        }),
      ],
    );

    return this.toRequestSummary(requestRows[0], {
      remittanceId: input.remittanceId,
      s3Key: input.s3Key,
    });
  }

  async requestGfipGeneration(
    input: CreateGfipRequestDto,
  ): Promise<OperationRequestSummary> {
    this.ensureDatabase();

    let run: PayrollRunRow | null = null;
    if (input.payrollRunId) {
      run = await this.getPayrollRun(input.payrollRunId);
    }

    const definitionId = await this.ensureDefinition(
      REPORT_DEFINITIONS.gfip.code,
      REPORT_DEFINITIONS.gfip.name,
      REPORT_DEFINITIONS.gfip.description,
    );

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
        definitionId,
        input.branchId ?? run?.branch_id ?? '',
        input.payrollRunId ?? '',
        run?.processing_type_id ?? '',
        input.competenceYear,
        input.competenceMonth,
        JSON.stringify({
          operation: 'gfip.gerada',
          payrollRunId: input.payrollRunId ?? null,
          branchId: input.branchId ?? run?.branch_id ?? null,
          collectionCode: input.collectionCode,
          modality: input.modality,
        }),
      ],
    );

    return this.toRequestSummary(requestRows[0], {
      payrollRunId: input.payrollRunId ?? null,
      branchId: input.branchId ?? run?.branch_id ?? null,
      collectionCode: input.collectionCode,
      modality: input.modality,
    });
  }

  private async getPayrollRun(id: string): Promise<PayrollRunRow> {
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      SELECT
        id::text,
        branch_id::text,
        processing_type_id::text,
        competence_year,
        competence_month,
        total_net::text
      FROM payroll.payroll_run
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll run not found');
    }
    return rows[0];
  }

  private async getRemittance(
    payrollRunId: string,
    remittanceId: string,
  ): Promise<void> {
    const rows = await this.databaseService.query<IdRow>(
      `
      SELECT id::text
      FROM payroll.payment_remittance_file
      WHERE id = $1::uuid
        AND payroll_run_id = $2::uuid
      `,
      [remittanceId, payrollRunId],
    );
    if (!rows[0]) {
      throw new NotFoundException('Remittance file not found');
    }
  }

  private async getNextRemittanceNumber(run: PayrollRunRow): Promise<number> {
    const rows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM payroll.payment_remittance_file
      WHERE competence_year = $1
        AND competence_month = $2
      `,
      [run.competence_year, run.competence_month],
    );
    return Number(rows[0]?.total ?? 0) + 1;
  }

  private async ensureDefinition(
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

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payroll export operations',
      );
    }
  }

  private toRemittanceSummary(row: RemittanceRow): RemittanceSummary {
    return {
      id: row.id,
      status: row.status,
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      paymentDate: row.payment_date ? this.toIso(row.payment_date) : null,
      fileName: row.file_name,
      totalAmount: row.total_amount,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toRequestSummary(
    row: ReportRequestRow,
    metadata: Record<string, unknown>,
  ): OperationRequestSummary {
    return {
      requestId: row.id,
      status: row.status,
      requestedAt: this.toIso(row.requested_at),
      metadata,
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
