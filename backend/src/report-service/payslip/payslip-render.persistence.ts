import type { PoolClient } from 'pg';

import type { IdRow, PayslipSourceRow } from './payslip-render.types';

interface PayslipFilePersistenceInput {
  employeeId: string;
  fileName: string;
  fileHash: string;
  sizeBytes: number;
  storageKey: string;
}

export class PayslipRenderPersistence {
  async ensureGeneratedPayslipFile(
    client: PoolClient,
    row: PayslipSourceRow,
    file: PayslipFilePersistenceInput,
  ): Promise<string> {
    const definitionId = await this.ensureDefinition(client, row.tenant_id);
    const requestId = await this.ensureReportRequest(client, row, definitionId);
    const attachmentId = await this.ensureAttachment(
      client,
      row.tenant_id,
      file,
    );
    return this.ensureGeneratedFile(client, row, {
      requestId,
      attachmentId,
      fileHash: file.fileHash,
    });
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
    file: PayslipFilePersistenceInput,
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
}
