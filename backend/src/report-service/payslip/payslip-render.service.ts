import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PoolClient, QueryResultRow } from 'pg';

import type { AuthenticatedActor } from '../../auth/actor.types';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import { LGPD_DATA_FLOWS } from '../../common/lgpd/legal-basis.registry';
import { LgpdLegalBasisService } from '../../common/lgpd/legal-basis.service';
import { DatabaseService } from '../../database/database.service';
import { PdfABuilderService } from './pdf-a-builder.service';
import {
  buildPayslipFileName,
  buildPayslipStorageKey,
  PayslipDocument,
} from './payslip-template';

interface EmployeeContextRow extends QueryResultRow {
  id: string;
  tenant_id: string;
}

interface PayslipSourceRow extends QueryResultRow {
  tenant_id: string;
  tenant_name: string | null;
  employee_id: string;
  registration: string;
  employee_name: string;
  cpf: string | null;
  employment_link: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  payroll_run_id: string;
  competence_date: string;
  total_earnings: string;
  total_deductions: string;
  net_amount: string;
  irrf_base: string;
  inss_base: string;
  fgts_deposit: string;
  lines: unknown;
}

interface FileRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  competence: string;
  file_hash: string;
  payroll_run_id: string;
  generated_at?: Date | string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

export interface RenderedPayslip {
  fileId: string;
  employeeId: string;
  payrollRunId: string;
  competence: string;
  fileHash: string;
  fileName: string;
  buffer: Buffer;
}

@Injectable()
export class PayslipRenderService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly pdfBuilder: PdfABuilderService,
    @Optional()
    private readonly legalBasisService?: LgpdLegalBasisService,
  ) {}

  async renderAndPersist(
    payrollRunId: string,
    employeeId: string,
  ): Promise<RenderedPayslip> {
    this.ensureDatabase();
    return this.databaseService.transaction((client) =>
      this.renderAndPersistWithClient(client, payrollRunId, employeeId),
    );
  }

  async renderPortalDownload(
    actor: AuthenticatedActor | undefined,
    fileId: string,
  ): Promise<RenderedPayslip> {
    this.ensureDatabase();
    const employee = await this.loadActorEmployee(actor);
    const files = await this.databaseService.query<FileRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        employee_id::text,
        competence::text,
        file_hash,
        payroll_run_id::text
      FROM public.generated_report_file
      WHERE id = $1::uuid
        AND report_kind = 'PAYSLIP'
        AND employee_id = $2::uuid
      `,
      [fileId, employee.id],
    );
    const file = files[0];
    if (!file) {
      throw new ForbiddenException(
        'Payslip PDF is not available for this employee',
      );
    }
    const document = await this.loadPayslipDocument(
      file.payroll_run_id,
      file.employee_id,
    );
    const buffer = await this.pdfBuilder.buildPayslip(document);
    return {
      fileId: file.id,
      employeeId: file.employee_id,
      payrollRunId: file.payroll_run_id,
      competence: file.competence,
      fileHash: file.file_hash,
      fileName: buildPayslipFileName(document),
      buffer,
    };
  }

  async listPortalFiles(actor: AuthenticatedActor | undefined): Promise<
    {
      id: string;
      competence: string;
      fileHash: string;
      generatedAt: string;
    }[]
  > {
    this.ensureDatabase();
    const employee = await this.loadActorEmployee(actor);
    const rows = await this.databaseService.query<FileRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        employee_id::text,
        competence::text,
        file_hash,
        payroll_run_id::text,
        generated_at
      FROM public.generated_report_file
      WHERE report_kind = 'PAYSLIP'
        AND employee_id = $1::uuid
      ORDER BY competence DESC, generated_at DESC
      `,
      [employee.id],
    );
    return rows.map((row) => ({
      id: row.id,
      competence: row.competence,
      fileHash: row.file_hash,
      generatedAt: this.toIso(row.generated_at ?? row.competence),
    }));
  }

  async loadPayslipDocument(
    payrollRunId: string,
    employeeId: string,
  ): Promise<PayslipDocument> {
    await this.assertPayslipLegalBasis();
    const rows = await this.databaseService.query<PayslipSourceRow>(
      this.sourceSql('WHERE run.id = $1::uuid AND employee.id = $2::uuid'),
      [payrollRunId, employeeId],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Payslip source data not found');
    }
    return this.toDocument(row);
  }

  async renderBatch(
    payrollRunId: string,
    competence: string,
  ): Promise<{
    batchId: string;
    status: string;
    fileCount: number;
    errorCount: number;
  }> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const runRows = await client.query<QueryResultRow>(
        `
        SELECT tenant_id::text
        FROM payroll.payroll_run
        WHERE id = $1::uuid
          AND make_date(competence_year, competence_month, 1) = $2::date
        `,
        [payrollRunId, competence],
      );
      const tenantId = runRows.rows[0]?.tenant_id as string | undefined;
      if (!tenantId)
        throw new NotFoundException('Payroll run not found for competence');

      const batchRows = await client.query<IdRow>(
        `
        INSERT INTO public.payslip_batch (
          tenant_id,
          competence,
          payroll_run_id,
          status
        )
        VALUES ($1::uuid, $2::date, $3::uuid, 'RUNNING'::public."PayslipBatchStatus")
        RETURNING batch_id::text AS id
        `,
        [tenantId, competence, payrollRunId],
      );
      const batchId = batchRows.rows[0]!.id;

      const employees = await client.query<IdRow>(
        `
        SELECT DISTINCT employee_id::text AS id
        FROM payroll.payroll_financial_record
        WHERE payroll_run_id = $1::uuid
          AND tenant_id = $2::uuid
        ORDER BY employee_id::text
        `,
        [payrollRunId, tenantId],
      );

      let fileCount = 0;
      let errorCount = 0;
      for (const employee of employees.rows) {
        try {
          await this.renderAndPersistWithClient(
            client,
            payrollRunId,
            employee.id,
          );
          fileCount += 1;
        } catch {
          errorCount += 1;
        }
      }

      const status = errorCount === 0 ? 'DONE' : 'FAILED';
      await client.query(
        `
        UPDATE public.payslip_batch
        SET status = $2::public."PayslipBatchStatus",
            file_count = $3,
            error_count = $4,
            error_message = CASE WHEN $4 = 0 THEN NULL ELSE 'Some payslips failed to render' END,
            updated_at = now()
        WHERE batch_id = $1::uuid
        `,
        [batchId, status, fileCount, errorCount],
      );
      return { batchId, status, fileCount, errorCount };
    });
  }

  async countFilesForRun(payrollRunId: string): Promise<number> {
    const rows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM public.generated_report_file
      WHERE payroll_run_id = $1::uuid
        AND report_kind = 'PAYSLIP'
      `,
      [payrollRunId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  private async renderAndPersistWithClient(
    client: PoolClient,
    payrollRunId: string,
    employeeId: string,
  ): Promise<RenderedPayslip> {
    await this.assertPayslipLegalBasis();
    const rows = await client.query<PayslipSourceRow>(
      this.sourceSql('WHERE run.id = $1::uuid AND employee.id = $2::uuid'),
      [payrollRunId, employeeId],
    );
    const row = rows.rows[0];
    if (!row) throw new NotFoundException('Payslip source data not found');
    const document = this.toDocument(row);
    const buffer = await this.pdfBuilder.buildPayslip(document);
    const validation = this.pdfBuilder.validatePdfA1b(buffer);
    if (!validation.valid) {
      throw new Error(
        `PDF/A-1b validation failed: ${validation.reasons.join(', ')}`,
      );
    }
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const fileName = buildPayslipFileName(document);
    const storageKey = buildPayslipStorageKey(row.tenant_id, document);

    const definitionId = await this.ensureDefinition(client, row.tenant_id);
    const requestId = await this.ensureReportRequest(client, row, definitionId);
    const attachmentId = await this.ensureAttachment(client, row.tenant_id, {
      employeeId,
      fileName,
      fileHash,
      sizeBytes: buffer.length,
      storageKey,
    });
    const fileId = await this.ensureGeneratedFile(client, row, {
      requestId,
      attachmentId,
      fileHash,
    });

    return {
      fileId,
      employeeId,
      payrollRunId,
      competence: row.competence_date,
      fileHash,
      fileName,
      buffer,
    };
  }

  private sourceSql(whereClause: string): string {
    return `
      SELECT
        run.tenant_id::text,
        coalesce(company.legal_name, branch.name, 'Ente publico') AS tenant_name,
        employee.id::text AS employee_id,
        employee.registration,
        employee.name AS employee_name,
        employee.cpf,
        coalesce(link.name, link.code, '') AS employment_link,
        employee.bank_agency,
        employee.bank_account,
        run.id::text AS payroll_run_id,
        make_date(run.competence_year, run.competence_month, 1)::text AS competence_date,
        financial.total_earnings::text,
        financial.total_deductions::text,
        financial.net_amount::text,
        coalesce(sum(CASE WHEN earning.taxable THEN item.amount ELSE 0 END), 0)::numeric(14,2)::text AS irrf_base,
        coalesce(sum(CASE WHEN earning.kind IN ('EARNING'::public."PayrollEntryKind", 'BASE'::public."PayrollEntryKind") THEN item.amount ELSE 0 END), 0)::numeric(14,2)::text AS inss_base,
        '0.00'::text AS fgts_deposit,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'code', earning.code,
              'description', earning.description,
              'reference', coalesce(item.quantity::text, item.reference_value::text, ''),
              'kind', earning.kind::text,
              'amount', item.amount::text
            )
            ORDER BY earning.kind::text, earning.code
          ) FILTER (WHERE item.id IS NOT NULL),
          '[]'::jsonb
        ) AS lines
      FROM payroll.payroll_run run
      JOIN payroll.payroll_financial_record financial
        ON financial.tenant_id = run.tenant_id
       AND financial.payroll_run_id = run.id
      JOIN hr.v_employee_pii_decrypted employee
        ON employee.tenant_id = run.tenant_id
       AND employee.id = financial.employee_id
      LEFT JOIN hr.branch branch ON branch.id = employee.branch_id
      LEFT JOIN hr.company company ON company.id = branch.company_id
      LEFT JOIN hr.employment_link link ON link.id = employee.employment_link_id
      LEFT JOIN payroll.v_payroll_run_line_active item
        ON item.tenant_id = run.tenant_id
       AND item.payroll_run_id = run.id
       AND item.employee_id = employee.id
      LEFT JOIN payroll.payroll_earning_deduction earning
        ON earning.id = item.earning_deduction_id
      ${whereClause}
      GROUP BY
        run.tenant_id,
        company.legal_name,
        branch.name,
        employee.id,
        employee.registration,
        employee.name,
        employee.cpf,
        link.name,
        link.code,
        employee.bank_agency,
        employee.bank_account,
        run.id,
        run.competence_year,
        run.competence_month,
        financial.total_earnings,
        financial.total_deductions,
        financial.net_amount
    `;
  }

  private async assertPayslipLegalBasis(): Promise<void> {
    await this.legalBasisService?.assertPiiReadAllowed(
      LGPD_DATA_FLOWS.PAYROLL_PAYSLIP_PDF,
    );
  }

  private toDocument(row: PayslipSourceRow): PayslipDocument {
    const lines = Array.isArray(row.lines) ? row.lines : [];
    return {
      tenantName: row.tenant_name ?? 'Ente publico',
      legalReference:
        'Demonstrativo remuneratorio oficial conforme catalogo de saidas oficiais SGP.',
      employee: {
        id: row.employee_id,
        registration: row.registration,
        name: row.employee_name,
        cpf: row.cpf ?? '',
        employmentLink: row.employment_link ?? '',
        bankAgency: row.bank_agency ?? '',
        bankAccount: row.bank_account ?? '',
      },
      payrollRunId: row.payroll_run_id,
      competence: row.competence_date,
      totals: {
        earnings: row.total_earnings,
        deductions: row.total_deductions,
        net: row.net_amount,
        irrfBase: row.irrf_base,
        inssBase: row.inss_base,
        fgtsDeposit: row.fgts_deposit,
      },
      lines: lines.map((line) => {
        const item = line as Record<string, string | undefined>;
        const isDeduction = item.kind === 'DEDUCTION';
        return {
          code: item.code ?? '',
          description: item.description ?? '',
          reference: item.reference ?? '',
          earning: isDeduction ? '' : (item.amount ?? ''),
          deduction: isDeduction ? (item.amount ?? '') : '',
        };
      }),
    };
  }

  private async ensureDefinition(
    client: PoolClient,
    tenantId: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO public.report_definition (
        tenant_id,
        code,
        module_key,
        name,
        description
      )
      VALUES (
        $1::uuid,
        'PAYSLIP_OFFICIAL_PDF',
        'RELATORIO',
        'Contracheque oficial PDF/A-1b',
        'Contracheque oficial gerado por biblioteca PDF dedicada.'
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = now()
      RETURNING id::text
      `,
      [tenantId],
    );
    return rows.rows[0]!.id;
  }

  private async ensureReportRequest(
    client: PoolClient,
    row: PayslipSourceRow,
    definitionId: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO public.report_request (
        tenant_id,
        definition_id,
        payroll_run_id,
        competence_year,
        competence_month,
        status,
        parameters,
        completed_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        extract(year from $4::date)::int,
        extract(month from $4::date)::int,
        'COMPLETED'::public."ReportRequestStatus",
        jsonb_build_object('employeeId', $5::text, 'reportKind', 'PAYSLIP'),
        now()
      )
      RETURNING id::text
      `,
      [
        row.tenant_id,
        definitionId,
        row.payroll_run_id,
        row.competence_date,
        row.employee_id,
      ],
    );
    return rows.rows[0]!.id;
  }

  private async ensureAttachment(
    client: PoolClient,
    tenantId: string,
    file: {
      employeeId: string;
      fileName: string;
      fileHash: string;
      sizeBytes: number;
      storageKey: string;
    },
  ): Promise<string> {
    const rows = await client.query<IdRow>(
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
        storage_key,
        public
      )
      VALUES (
        $1::uuid,
        'payslip',
        $2::uuid,
        'LOCAL'::public."DocumentStorageKind",
        $3,
        'application/pdf',
        $4,
        $5,
        $6,
        false
      )
      RETURNING id::text
      `,
      [
        tenantId,
        file.employeeId,
        file.fileName,
        file.sizeBytes,
        file.fileHash,
        file.storageKey,
      ],
    );
    return rows.rows[0]!.id;
  }

  private async ensureGeneratedFile(
    client: PoolClient,
    row: PayslipSourceRow,
    file: {
      requestId: string;
      attachmentId: string;
      fileHash: string;
    },
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO public.generated_report_file (
        tenant_id,
        report_request_id,
        attachment_id,
        format,
        report_kind,
        competence,
        employee_id,
        payroll_run_id,
        pdf_a_compliance,
        signature_kind,
        signed_at,
        retention_until,
        file_hash
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'PDF',
        'PAYSLIP'::public."ReportKind",
        $4::date,
        $5::uuid,
        $6::uuid,
        'PDF_A_1B'::public."PdfACompliance",
        'ICP_BRASIL_A1'::public."SignatureKind",
        $4::date::timestamptz,
        ($4::date + interval '10 years')::date,
        $7
      )
      RETURNING id::text
      `,
      [
        row.tenant_id,
        file.requestId,
        file.attachmentId,
        row.competence_date,
        row.employee_id,
        row.payroll_run_id,
        file.fileHash,
      ],
    );
    return rows.rows[0]!.id;
  }

  private async loadActorEmployee(
    actor: AuthenticatedActor | undefined,
  ): Promise<EmployeeContextRow> {
    const claimEmployeeId =
      typeof actor?.claims?.employee_id === 'string'
        ? actor.claims.employee_id
        : null;
    const rows = await this.databaseService.query<EmployeeContextRow>(
      `
      SELECT employee.id::text, employee.tenant_id::text
      FROM hr.employee employee
      LEFT JOIN public.user_account account
        ON account.tenant_id = employee.tenant_id
       AND account.cpf = employee.cpf
      WHERE employee.tenant_id = $1::uuid
        AND (
          employee.id = $2::uuid
          OR ($2::uuid IS NULL AND account.cognito_sub = $3)
        )
      LIMIT 1
      `,
      [actor?.tenantId ?? '', claimEmployeeId, actor?.sub ?? ''],
    );
    const row = rows[0];
    if (!row) throw new ForbiddenException('Authenticated employee not found');
    return row;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payslip PDF operations',
      );
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  runWithReportPermissions<T>(
    tenantId: string,
    actor: AuthenticatedActor | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    return RequestContextStore.run(
      {
        tenantId,
        actor,
        permissions: [
          'report.payslip.read',
          'report.payslip.write',
          'relatorio.generate',
        ],
      },
      fn,
    );
  }
}
