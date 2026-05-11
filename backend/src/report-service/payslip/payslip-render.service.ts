import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';

import type { AuthenticatedActor } from '../../auth/actor.types';
import { domainError } from '../../common/errors/domain-error';
import { LGPD_DATA_FLOWS } from '../../common/lgpd/legal-basis.registry';
import { LgpdLegalBasisService } from '../../common/lgpd/legal-basis.service';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { PdfABuilderService } from './pdf-a-builder.service';
import {
  buildPayslipFileName,
  buildPayslipStorageKey,
  PayslipDocument,
} from './payslip-template';
import { PayslipRenderMapper } from './payslip-render.mapper';
import { PayslipRenderPersistence } from './payslip-render.persistence';
import type {
  CountRow,
  EmployeeContextRow,
  FileRow,
  IdRow,
  PayslipSourceRow,
  RenderedPayslip,
} from './payslip-render.types';

export type { RenderedPayslip } from './payslip-render.types';

@Injectable()
export class PayslipRenderService {
  private readonly mapper = new PayslipRenderMapper();
  private readonly persistence = new PayslipRenderPersistence();

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
      this.mapper.sourceSql(
        'WHERE run.id = $1::uuid AND employee.id = $2::uuid',
      ),
      [payrollRunId, employeeId],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Payslip source data not found');
    }
    return this.mapper.toDocument(row);
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
      this.mapper.sourceSql(
        'WHERE run.id = $1::uuid AND employee.id = $2::uuid',
      ),
      [payrollRunId, employeeId],
    );
    const row = rows.rows[0];
    if (!row) throw new NotFoundException('Payslip source data not found');
    const document = this.mapper.toDocument(row);
    const buffer = await this.pdfBuilder.buildPayslip(document);
    const validation = this.pdfBuilder.validatePdfA1b(buffer);
    if (!validation.valid) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        `PDF/A-1b validation failed: ${validation.reasons.join(', ')}`,
      );
    }
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const fileName = buildPayslipFileName(document);
    const storageKey = buildPayslipStorageKey(row.tenant_id, document);

    const fileId = await this.persistence.ensureGeneratedPayslipFile(
      client,
      row,
      {
        employeeId,
        fileName,
        fileHash,
        sizeBytes: buffer.length,
        storageKey,
      },
    );

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

  private async assertPayslipLegalBasis(): Promise<void> {
    await this.legalBasisService?.assertPiiReadAllowed(
      LGPD_DATA_FLOWS.PAYROLL_PAYSLIP_PDF,
    );
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
