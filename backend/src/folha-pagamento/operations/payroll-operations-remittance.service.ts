import { Injectable, NotFoundException } from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import {
  CountRow,
  IdRow,
  PayrollRunRow,
  RemittanceRow,
  RemittanceSummary,
  toIso,
} from './payroll-operations.types';

@Injectable()
export class PayrollOperationsRemittanceService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listByPayrollRun(
    payrollRunId: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<RemittanceSummary>> {
    const { page, pageSize, offset } = this.getPage(query);
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
        file_hash,
        bank_code,
        layout_version,
        record_count,
        total_amount::text AS total_amount,
        generated_at,
        (
          SELECT grf.attachment_id::text
          FROM public.report_request request
          JOIN public.generated_report_file grf ON grf.report_request_id = request.id
          WHERE request.parameters->>'remittanceId' = payroll.payment_remittance_file.id::text
          ORDER BY grf.created_at DESC
          LIMIT 1
        ) AS attachment_id,
        created_at,
        updated_at
      FROM payroll.payment_remittance_file
      WHERE payroll_run_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [payrollRunId, pageSize, offset],
    );

    return this.toPagedResponse(rows, count[0]?.total, page, pageSize);
  }

  async listByCompetence(
    competenceYear: number,
    competenceMonth: number,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<RemittanceSummary>> {
    const { page, pageSize, offset } = this.getPage(query);
    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM payroll.payment_remittance_file
      WHERE competence_year = $1
        AND competence_month = $2
      `,
      [competenceYear, competenceMonth],
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
        file_hash,
        bank_code,
        layout_version,
        record_count,
        total_amount::text AS total_amount,
        generated_at,
        (
          SELECT grf.attachment_id::text
          FROM public.report_request request
          JOIN public.generated_report_file grf ON grf.report_request_id = request.id
          WHERE request.parameters->>'remittanceId' = payroll.payment_remittance_file.id::text
          ORDER BY grf.created_at DESC
          LIMIT 1
        ) AS attachment_id,
        created_at,
        updated_at
      FROM payroll.payment_remittance_file
      WHERE competence_year = $1
        AND competence_month = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
      `,
      [competenceYear, competenceMonth, pageSize, offset],
    );

    return this.toPagedResponse(rows, count[0]?.total, page, pageSize);
  }

  async ensureValidBankAccountsForRemittance(
    bankIdOrCode: string,
  ): Promise<void> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bankIdOrCode,
      );
    const rows = await this.databaseService.query<CountRow>(
      isUuid
        ? `
          SELECT count(*)::text AS total
          FROM hr.v_employee_bank_account_pii_decrypted account
          JOIN hr.bank bank ON bank.id = account.bank_id
          WHERE account.validation_status = 'VALID'::hr.employee_bank_account_validation_status
            AND bank.id = $1::uuid
          `
        : `
          SELECT count(*)::text AS total
          FROM hr.v_employee_bank_account_pii_decrypted account
          JOIN hr.bank bank ON bank.id = account.bank_id
          WHERE account.validation_status = 'VALID'::hr.employee_bank_account_validation_status
            AND bank.code = lpad(regexp_replace($1, '\\D', '', 'g'), 3, '0')
          `,
      [bankIdOrCode],
    );
    if (Number(rows[0]?.total ?? 0) === 0) {
      throw new NotFoundException(
        'No valid employee bank account is eligible for CNAB remittance',
      );
    }
  }

  async createRemittanceFile(
    payrollRunId: string,
    run: PayrollRunRow,
    paymentDate: string,
    fileName: string,
  ): Promise<string> {
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

    return remittanceRows[0]?.id ?? '';
  }

  async getRemittance(
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

  async getNextRemittanceNumber(run: PayrollRunRow): Promise<number> {
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

  async markDraftAsSent(remittanceId: string): Promise<void> {
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
      [remittanceId],
    );
  }

  private getPage(query: DomainListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return {
      page,
      pageSize,
      offset: (page - 1) * pageSize,
    };
  }

  private toPagedResponse(
    rows: RemittanceRow[],
    rawTotal: string | undefined,
    page: number,
    pageSize: number,
  ): PagedResponse<RemittanceSummary> {
    const total = Number(rawTotal ?? 0);
    return {
      items: rows.map((row) => this.toRemittanceSummary(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  private toRemittanceSummary(row: RemittanceRow): RemittanceSummary {
    return {
      id: row.id,
      status: row.status,
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      paymentDate: row.payment_date ? toIso(row.payment_date) : null,
      fileName: row.file_name,
      fileHash: row.file_hash,
      bankCode: row.bank_code,
      layoutVersion: row.layout_version,
      recordCount: row.record_count,
      totalAmount: row.total_amount,
      generatedAt: row.generated_at ? toIso(row.generated_at) : null,
      attachmentId: row.attachment_id,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    };
  }
}
