import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PoolClient, QueryResultRow } from 'pg';

import type { AuthenticatedActor } from '../../auth/auth.types';
import { DatabaseService } from '../../database/database.service';
import { PdfABuilderService } from '../payslip/pdf-a-builder.service';
import {
  buildYearlyIncomeFileName,
  buildYearlyIncomeStorageKey,
  toYearlyIncomeDocument,
  YearlyIncomeAggregate,
} from './yearly-income-template';

interface AggregateRow extends QueryResultRow {
  tenant_id: string;
  tenant_name: string | null;
  tenant_document: string | null;
  employee_id: string;
  registration: string;
  employee_name: string;
  cpf: string | null;
  employment_link: string | null;
  year_base: number | string;
  taxable_total: string;
  thirteenth_salary: string;
  vacation_total: string;
  severance_total: string;
  exempt_total: string;
  inss_rpps_total: string;
  irrf_total: string;
  dependents_count: number | string;
  s1210_total: string;
  recomputed_at: Date | string;
}

interface EmployeeContextRow extends QueryResultRow {
  id: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

export interface RenderedYearlyIncome {
  fileId: string;
  employeeId: string;
  yearBase: number;
  fileHash: string;
  fileName: string;
  buffer: Buffer;
}

@Injectable()
export class YearlyIncomeRenderService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly pdfBuilder: PdfABuilderService,
  ) {}

  async listPortalFiles(actor: AuthenticatedActor | undefined) {
    this.ensureDatabase();
    const employee = await this.loadActorEmployee(actor);
    const rows = await this.databaseService.query<AggregateRow>(
      `
      SELECT *
      FROM fiscal.v_yearly_income
      WHERE employee_id = $1::uuid
      ORDER BY year_base DESC
      `,
      [employee.id],
    );
    return rows.map((row) => ({
      yearBase: Number(row.year_base),
      taxableTotal: row.taxable_total,
      exemptTotal: row.exempt_total,
      irrfTotal: row.irrf_total,
      recomputedAt: this.toIso(row.recomputed_at),
    }));
  }

  async renderPortalDownload(
    actor: AuthenticatedActor | undefined,
    yearBase: number,
  ): Promise<RenderedYearlyIncome> {
    this.ensureDatabase();
    const employee = await this.loadActorEmployee(actor);
    const rendered = await this.renderAndPersist(yearBase, employee.id);
    if (rendered.employeeId !== employee.id) {
      throw new ForbiddenException(
        'Yearly income PDF is not available for this employee',
      );
    }
    return rendered;
  }

  async renderAndPersist(
    yearBase: number,
    employeeId: string,
  ): Promise<RenderedYearlyIncome> {
    this.ensureDatabase();
    return this.databaseService.transaction((client) =>
      this.renderAndPersistWithClient(client, yearBase, employeeId),
    );
  }

  private async renderAndPersistWithClient(
    client: PoolClient,
    yearBase: number,
    employeeId: string,
  ): Promise<RenderedYearlyIncome> {
    await client.query(
      'SELECT fiscal.recompute_yearly_income(NULL, $1::uuid, $2::integer)',
      [employeeId, yearBase],
    );
    const row = await this.loadAggregateWithClient(
      client,
      yearBase,
      employeeId,
    );
    const aggregate = this.toAggregate(row);
    const document = toYearlyIncomeDocument(aggregate);
    const buffer = await this.pdfBuilder.buildYearlyIncome(document);
    const validation = this.pdfBuilder.validatePdfA1b(buffer);
    if (!validation.valid) {
      throw new Error(
        `PDF/A-1b validation failed: ${validation.reasons.join(', ')}`,
      );
    }
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const fileName = buildYearlyIncomeFileName(document);
    const storageKey = buildYearlyIncomeStorageKey(row.tenant_id, document);

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
      yearBase,
      fileHash,
      fileName,
      buffer,
    };
  }

  private async loadAggregateWithClient(
    client: PoolClient,
    yearBase: number,
    employeeId: string,
  ): Promise<AggregateRow> {
    const rows = await client.query<AggregateRow>(
      `
      SELECT *
      FROM fiscal.v_yearly_income
      WHERE year_base = $1::integer
        AND employee_id = $2::uuid
      `,
      [yearBase, employeeId],
    );
    const row = rows.rows[0];
    if (!row)
      throw new NotFoundException('Yearly income source data not found');
    return row;
  }

  private async ensureDefinition(
    client: PoolClient,
    tenantId: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO public.report_definition (
        tenant_id, code, module_key, name, description
      )
      VALUES (
        $1::uuid,
        'YEARLY_INCOME_REPORT_PDF',
        'FISCAL',
        'Comprovante de Rendimentos anual PDF/A-1b',
        'Comprovante anual de rendimentos pagos e IRRF conforme IN RFB 2.060/2021.'
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = now()
      RETURNING id::text
      `,
      [tenantId],
    );
    return rows.rows[0].id;
  }

  private async ensureReportRequest(
    client: PoolClient,
    row: AggregateRow,
    definitionId: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO public.report_request (
        tenant_id,
        definition_id,
        competence_year,
        competence_month,
        status,
        parameters,
        completed_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::integer,
        12,
        'COMPLETED'::public."ReportRequestStatus",
        jsonb_build_object('employeeId', $4::text, 'reportKind', 'YEARLY_INCOME_REPORT'),
        now()
      )
      RETURNING id::text
      `,
      [row.tenant_id, definitionId, Number(row.year_base), row.employee_id],
    );
    return rows.rows[0].id;
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
        document_type_id,
        file_name,
        mime_type,
        size_bytes,
        storage_key,
        checksum_sha256,
        uploaded_by
      )
      VALUES (
        $1::uuid,
        'hr.employee',
        $2::uuid,
        NULL,
        $3,
        'application/pdf',
        $4::bigint,
        $5,
        $6,
        NULL
      )
      RETURNING id::text
      `,
      [
        tenantId,
        file.employeeId,
        file.fileName,
        file.sizeBytes,
        file.storageKey,
        file.fileHash,
      ],
    );
    return rows.rows[0].id;
  }

  private async ensureGeneratedFile(
    client: PoolClient,
    row: AggregateRow,
    file: { requestId: string; attachmentId: string; fileHash: string },
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
        retention_until,
        file_hash
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'PDF',
        'YEARLY_INCOME_REPORT'::public."ReportKind",
        make_date($4::integer, 12, 31),
        $5::uuid,
        NULL,
        'PDF_A_1B'::public."PdfACompliance",
        'NONE'::public."SignatureKind",
        make_date($4::integer + 10, 12, 31),
        $6
      )
      RETURNING id::text
      `,
      [
        row.tenant_id,
        file.requestId,
        file.attachmentId,
        Number(row.year_base),
        row.employee_id,
        file.fileHash,
      ],
    );
    return rows.rows[0].id;
  }

  private async loadActorEmployee(
    actor: AuthenticatedActor | undefined,
  ): Promise<EmployeeContextRow> {
    const claimEmployeeId =
      typeof actor?.claims?.employee_id === 'string'
        ? actor.claims.employee_id
        : '';
    if (!actor?.tenantId || !claimEmployeeId) {
      throw new ForbiddenException(
        'Authenticated employee context is required',
      );
    }
    const rows = await this.databaseService.query<EmployeeContextRow>(
      `
      SELECT id::text
      FROM hr.employee
      WHERE tenant_id = $1::uuid
        AND id = $2::uuid
      `,
      [actor.tenantId, claimEmployeeId],
    );
    const employee = rows[0];
    if (!employee) {
      throw new ForbiddenException('Authenticated employee context not found');
    }
    return employee;
  }

  private toAggregate(row: AggregateRow): YearlyIncomeAggregate {
    return {
      tenantId: row.tenant_id,
      tenantName: row.tenant_name ?? 'Ente publico',
      tenantDocument: row.tenant_document ?? '',
      employeeId: row.employee_id,
      registration: row.registration,
      employeeName: row.employee_name,
      cpf: row.cpf ?? '',
      employmentLink: row.employment_link ?? '',
      yearBase: Number(row.year_base),
      taxableTotal: row.taxable_total,
      thirteenthSalary: row.thirteenth_salary,
      vacationTotal: row.vacation_total,
      severanceTotal: row.severance_total,
      exemptTotal: row.exempt_total,
      inssRppsTotal: row.inss_rpps_total,
      irrfTotal: row.irrf_total,
      dependentsCount: Number(row.dependents_count),
      s1210Total: row.s1210_total,
      recomputedAt: this.toIso(row.recomputed_at),
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
