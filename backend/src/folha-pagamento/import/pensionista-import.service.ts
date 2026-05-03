import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { parseFirstWorksheet, XlsxTableRow } from './xlsx-table.parser';
import type { UploadedXlsxFile } from './servidor-import.service';

export interface PensionistaImportAcceptedRow {
  rowNumber: number;
  payrollItemId: string;
  pensionId: string;
  pensionBeneficiaryId: string;
  pensionistaEmployeeId: string;
  pensionistaRegistration: string;
  earningDeductionId: string;
  earningDeductionCode: string;
  amount: string;
  payrollItemIdempotencyKey: string;
  pensionIdempotencyKey: string;
  operation: 'created' | 'updated';
}

export interface PensionistaImportRejectedRow {
  rowNumber: number;
  message: string;
}

export interface PensionistaImportResult {
  payrollRunId: string;
  fileName: string;
  fileHash: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  accepted: PensionistaImportAcceptedRow[];
  errors: PensionistaImportRejectedRow[];
}

interface PayrollRunRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  competence_year: number;
  competence_month: number;
  status: string;
}

interface PensionistaRow extends QueryResultRow {
  id: string;
  registration: string;
  beneficiary_id: string;
}

interface PensionRow extends QueryResultRow {
  id: string;
}

interface EarningDeductionRow extends QueryResultRow {
  id: string;
  code: string;
}

interface ImportedItemRow extends QueryResultRow {
  id: string;
  inserted: boolean;
}

interface FinancialTotalsRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

interface NormalizedImportRow {
  rowNumber: number;
  pensionId: string;
  pensionistaRegistration: string;
  pensionistaEmployeeId: string | null;
  pensionBeneficiaryId: string | null;
  earningDeductionCode: string;
  amount: string;
  quantity: string | null;
  referenceValue: string | null;
  notes: string;
}

const CLOSED_STATUSES = new Set(['GENERATED', 'APPROVED', 'PAID', 'CLOSED']);
const MAX_XLSX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class PensionistaImportService {
  constructor(private readonly databaseService: DatabaseService) {}

  async importFile(
    payrollRunId: string,
    file: UploadedXlsxFile | undefined,
  ): Promise<PensionistaImportResult> {
    this.ensureDatabase();
    this.ensureFile(file);

    const fileName = file.originalname ?? 'pensionista-import.xlsx';
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');
    const tableRows = parseFirstWorksheet(file.buffer);
    const normalizedRows = this.normalizeRows(tableRows);

    return this.databaseService.transaction((client) =>
      this.persistRows(
        client,
        payrollRunId,
        fileName,
        fileHash,
        normalizedRows,
      ),
    );
  }

  private async persistRows(
    client: PoolClient,
    payrollRunId: string,
    fileName: string,
    fileHash: string,
    rows: NormalizedImportRow[],
  ): Promise<PensionistaImportResult> {
    const run = await this.getPayrollRun(client, payrollRunId);
    if (CLOSED_STATUSES.has(run.status)) {
      throw new ConflictException(
        `Payroll run in status ${run.status} cannot receive imported items`,
      );
    }

    const pensionistas = await this.getPensionistas(client, rows);
    const pensions = await this.getPensions(client, run, rows);
    const earnings = await this.getEarningDeductions(client, rows);
    const seenPayrollItemKeys = new Set<string>();
    const seenPensionKeys = new Set<string>();
    const accepted: PensionistaImportAcceptedRow[] = [];
    const errors: PensionistaImportRejectedRow[] = [];

    for (const row of rows) {
      const pensionista =
        (row.pensionistaEmployeeId
          ? pensionistas.byEmployeeId.get(row.pensionistaEmployeeId)
          : undefined) ??
        (row.pensionBeneficiaryId
          ? pensionistas.byBeneficiaryId.get(row.pensionBeneficiaryId)
          : undefined) ??
        pensionistas.byRegistration.get(row.pensionistaRegistration);
      const pension = pensions.get(row.pensionId);
      const earning = earnings.get(row.earningDeductionCode);

      if (!pensionista) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Pensionista ${
            row.pensionistaEmployeeId ??
            row.pensionBeneficiaryId ??
            row.pensionistaRegistration
          } not found`,
        });
        continue;
      }
      if (!pension) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Pension ${row.pensionId} not found or inactive`,
        });
        continue;
      }
      if (!earning) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Payroll item code ${row.earningDeductionCode} not found`,
        });
        continue;
      }

      const payrollItemIdempotencyKey = this.payrollItemIdempotencyKey(
        run,
        pensionista.id,
        earning.id,
      );
      const pensionIdempotencyKey = this.pensionIdempotencyKey(
        run,
        row.pensionId,
        pensionista.id,
        earning.id,
      );
      if (seenPayrollItemKeys.has(payrollItemIdempotencyKey)) {
        errors.push({
          rowNumber: row.rowNumber,
          message: 'Duplicate pensionista/rubrica row in XLSX',
        });
        continue;
      }
      if (seenPensionKeys.has(pensionIdempotencyKey)) {
        errors.push({
          rowNumber: row.rowNumber,
          message: 'Duplicate pensao/pensionista/rubrica row in XLSX',
        });
        continue;
      }
      seenPayrollItemKeys.add(payrollItemIdempotencyKey);
      seenPensionKeys.add(pensionIdempotencyKey);

      const imported = await this.upsertImportedItem(
        client,
        run,
        row,
        pensionista.id,
        earning.id,
      );
      accepted.push({
        rowNumber: row.rowNumber,
        payrollItemId: imported.id,
        pensionId: pension.id,
        pensionBeneficiaryId: pensionista.beneficiary_id,
        pensionistaEmployeeId: pensionista.id,
        pensionistaRegistration: pensionista.registration,
        earningDeductionId: earning.id,
        earningDeductionCode: earning.code,
        amount: row.amount,
        payrollItemIdempotencyKey,
        pensionIdempotencyKey,
        operation: imported.inserted ? 'created' : 'updated',
      });
    }

    if (accepted.length > 0) {
      await this.refreshPayrollRunAggregates(client, payrollRunId);
      await this.appendHistory(client, payrollRunId, fileName, fileHash, {
        acceptedRows: accepted.length,
        rejectedRows: errors.length,
      });
    }

    return {
      payrollRunId,
      fileName,
      fileHash,
      totalRows: rows.length,
      acceptedRows: accepted.length,
      rejectedRows: errors.length,
      accepted,
      errors,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payroll imports',
      );
    }
  }

  private ensureFile(
    file: UploadedXlsxFile | undefined,
  ): asserts file is UploadedXlsxFile {
    if (!file?.buffer?.length) {
      throw new BadRequestException('XLSX file is required');
    }
    if ((file.size ?? file.buffer.length) > MAX_XLSX_BYTES) {
      throw new BadRequestException('XLSX file exceeds the 10 MB limit');
    }
    const name = file.originalname ?? '';
    if (name && !name.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx files are accepted');
    }
  }

  private normalizeRows(rows: XlsxTableRow[]): NormalizedImportRow[] {
    return rows.map((row, index) => {
      const rowNumber = index + 2;
      const pensionId = this.requiredUuid(
        this.first(row, ['pensao_id', 'pension_grant_id', 'pension_id']),
        rowNumber,
        'pensao_id',
      );
      const pensionistaRegistration = this.first(row, [
        'matricula_pensionista',
        'pensionista_matricula',
        'beneficiario_matricula',
        'matricula',
        'registro',
        'employee_registration',
      ]);
      const pensionistaEmployeeId = this.uuid(
        this.first(row, [
          'pensionista_id',
          'employee_id',
          'beneficiario_employee_id',
        ]),
        rowNumber,
        'pensionista_id',
      );
      const pensionBeneficiaryId = this.uuid(
        this.first(row, [
          'beneficiario_id',
          'recertification_beneficiary_id',
          'pensionista_beneficiario_id',
        ]),
        rowNumber,
        'beneficiario_id',
      );
      const earningDeductionCode = this.first(row, [
        'verba',
        'rubrica',
        'codigo_verba',
        'verba_codigo',
        'codigo_rubrica',
        'rubrica_codigo',
      ]).toUpperCase();
      const amount = this.money(
        this.first(row, ['valor', 'amount']),
        rowNumber,
        'valor',
      );
      const quantity = this.optionalDecimal(
        this.first(row, ['quantidade', 'qtd', 'quantity']),
        rowNumber,
        'quantidade',
        4,
      );
      const referenceValue = this.optionalDecimal(
        this.first(row, ['referencia', 'valor_referencia', 'reference_value']),
        rowNumber,
        'referencia',
        2,
      );
      const notes = this.first(row, [
        'observacao',
        'observacoes',
        'notes',
        'comentario',
      ]);

      if (
        !pensionistaRegistration &&
        !pensionistaEmployeeId &&
        !pensionBeneficiaryId
      ) {
        throw new BadRequestException(
          `Row ${rowNumber}: pensionista registration, pensionista_id, or beneficiario_id is required`,
        );
      }
      if (!earningDeductionCode) {
        throw new BadRequestException(
          `Row ${rowNumber}: rubrica code is required`,
        );
      }

      return {
        rowNumber,
        pensionId,
        pensionistaRegistration,
        pensionistaEmployeeId,
        pensionBeneficiaryId,
        earningDeductionCode,
        amount,
        quantity,
        referenceValue,
        notes,
      };
    });
  }

  private first(row: XlsxTableRow, keys: string[]): string {
    for (const key of keys) {
      const value = row[key]?.trim();
      if (value) return value;
    }
    return '';
  }

  private money(value: string, rowNumber: number, label: string): string {
    const normalized = this.normalizeDecimal(value);
    const number = Number(normalized);
    if (!normalized || !Number.isFinite(number) || number < 0) {
      throw new BadRequestException(
        `Row ${rowNumber}: ${label} must be non-negative`,
      );
    }
    return number.toFixed(2);
  }

  private optionalDecimal(
    value: string,
    rowNumber: number,
    label: string,
    scale: number,
  ): string | null {
    if (!value) return null;
    const normalized = this.normalizeDecimal(value);
    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) {
      throw new BadRequestException(
        `Row ${rowNumber}: ${label} must be non-negative`,
      );
    }
    return number.toFixed(scale);
  }

  private normalizeDecimal(value: string): string {
    const compact = value.trim().replace(/\s+/g, '');
    if (!compact) return '';
    if (compact.includes(',')) {
      return compact.replace(/\./g, '').replace(',', '.');
    }
    return compact;
  }

  private async getPayrollRun(
    client: PoolClient,
    id: string,
  ): Promise<PayrollRunRow> {
    const result = await client.query<PayrollRunRow>(
      `
      SELECT
        id::text,
        public.sgp_current_tenant_uuid()::text AS tenant_id,
        competence_year,
        competence_month,
        status::text
      FROM payroll.payroll_run
      WHERE id = $1::uuid
      `,
      [id],
    );
    const run = result.rows[0];
    if (!run) throw new BadRequestException('Payroll run not found');
    return run;
  }

  private async getPensionistas(
    client: PoolClient,
    rows: NormalizedImportRow[],
  ): Promise<{
    byEmployeeId: Map<string, PensionistaRow>;
    byBeneficiaryId: Map<string, PensionistaRow>;
    byRegistration: Map<string, PensionistaRow>;
  }> {
    const employeeIds = rows
      .map((row) => row.pensionistaEmployeeId)
      .filter((id): id is string => Boolean(id));
    const beneficiaryIds = rows
      .map((row) => row.pensionBeneficiaryId)
      .filter((id): id is string => Boolean(id));
    const registrations = rows
      .map((row) => row.pensionistaRegistration)
      .filter(Boolean);
    const result = await client.query<PensionistaRow>(
      `
      SELECT
        employee.id::text,
        employee.registration,
        beneficiary.id::text AS beneficiary_id
      FROM hr.employee employee
      JOIN hr.recertification_beneficiary beneficiary
        ON beneficiary.employee_id = employee.id
       AND beneficiary.type IN (
          'PENSIONER'::"RecertificationBeneficiaryType",
          'UNIVERSITY_PENSIONER'::"RecertificationBeneficiaryType"
       )
      WHERE (cardinality($1::uuid[]) > 0 AND employee.id = ANY($1::uuid[]))
         OR (cardinality($2::uuid[]) > 0 AND beneficiary.id = ANY($2::uuid[]))
         OR (cardinality($3::text[]) > 0 AND employee.registration = ANY($3::text[]))
      `,
      [employeeIds, beneficiaryIds, registrations],
    );

    return {
      byEmployeeId: new Map(result.rows.map((row) => [row.id, row])),
      byBeneficiaryId: new Map(
        result.rows.map((row) => [row.beneficiary_id, row]),
      ),
      byRegistration: new Map(
        result.rows.map((row) => [row.registration, row]),
      ),
    };
  }

  private async getPensions(
    client: PoolClient,
    run: PayrollRunRow,
    rows: NormalizedImportRow[],
  ): Promise<Map<string, PensionRow>> {
    const ids = [...new Set(rows.map((row) => row.pensionId))];
    const result = await client.query<PensionRow>(
      `
      SELECT id::text
      FROM hr.pension_grant
      WHERE id = ANY($1::uuid[])
        AND (ceased_on IS NULL OR ceased_on >= make_date($2, $3, 1))
      `,
      [ids, run.competence_year, run.competence_month],
    );
    return new Map(result.rows.map((row) => [row.id, row]));
  }

  private async getEarningDeductions(
    client: PoolClient,
    rows: NormalizedImportRow[],
  ): Promise<Map<string, EarningDeductionRow>> {
    const codes = [...new Set(rows.map((row) => row.earningDeductionCode))];
    const result = await client.query<EarningDeductionRow>(
      `
      SELECT id::text, code
      FROM payroll.payroll_earning_deduction
      WHERE active = true
        AND upper(code) = ANY($1::text[])
      `,
      [codes],
    );
    return new Map(result.rows.map((row) => [row.code.toUpperCase(), row]));
  }

  private async upsertImportedItem(
    client: PoolClient,
    run: PayrollRunRow,
    row: NormalizedImportRow,
    pensionistaEmployeeId: string,
    earningDeductionId: string,
  ): Promise<ImportedItemRow> {
    const result = await client.query<ImportedItemRow>(
      `
      INSERT INTO payroll.employee_payroll_item (
        tenant_id,
        employee_id,
        payroll_run_id,
        earning_deduction_id,
        source,
        competence_year,
        competence_month,
        quantity,
        reference_value,
        amount,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'IMPORTED'::"PayrollEntrySource",
        $4,
        $5,
        NULLIF($6, '')::decimal,
        NULLIF($7, '')::decimal,
        $8::decimal,
        $9
      )
      ON CONFLICT (idempotency_key)
        WHERE deleted_at IS NULL AND idempotency_key IS NOT NULL
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        reference_value = EXCLUDED.reference_value,
        amount = EXCLUDED.amount,
        notes = EXCLUDED.notes,
        updated_at = now()
      RETURNING id::text, (xmax = 0) AS inserted
      `,
      [
        pensionistaEmployeeId,
        run.id,
        earningDeductionId,
        run.competence_year,
        run.competence_month,
        row.quantity ?? '',
        row.referenceValue ?? '',
        row.amount,
        row.notes ||
          `Pensionista XLSX import row ${row.rowNumber}; pension_grant_id=${row.pensionId}`,
      ],
    );
    return result.rows[0]!;
  }

  private async refreshPayrollRunAggregates(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<void> {
    const totals = await client.query<FinancialTotalsRow>(
      `
      SELECT
        count(DISTINCT employee_id)::text AS employee_count,
        coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_earnings,
        coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_deductions,
        coalesce(sum(CASE
          WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::text AS total_net
      FROM payroll.v_payroll_run_line_active item
      JOIN payroll.payroll_earning_deduction ed
        ON ed.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      `,
      [payrollRunId],
    );
    const summary = totals.rows[0] ?? {
      employee_count: '0',
      total_earnings: '0',
      total_deductions: '0',
      total_net: '0',
    };

    await client.query(
      `
      UPDATE payroll.payroll_run
      SET employee_count = $2::int,
          total_earnings = $3::decimal,
          total_deductions = $4::decimal,
          total_net = $5::decimal,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [
        payrollRunId,
        summary.employee_count,
        summary.total_earnings,
        summary.total_deductions,
        summary.total_net,
      ],
    );
  }

  private async appendHistory(
    client: PoolClient,
    payrollRunId: string,
    fileName: string,
    fileHash: string,
    summary: { acceptedRows: number; rejectedRows: number },
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO payroll.payroll_run_status_history (
        tenant_id,
        payroll_run_id,
        status,
        note,
        metadata
      )
      SELECT
        tenant_id,
        id,
        status,
        'Pensionista XLSX import',
        $2::jsonb
      FROM payroll.payroll_run
      WHERE id = $1::uuid
      `,
      [
        payrollRunId,
        JSON.stringify({
          kind: 'PENSIONISTA_XLSX_IMPORT',
          fileName,
          fileHash,
          ...summary,
        }),
      ],
    );
  }

  private payrollItemIdempotencyKey(
    run: PayrollRunRow,
    pensionistaEmployeeId: string,
    earningDeductionId: string,
  ): string {
    return [
      run.tenant_id,
      run.competence_year,
      String(run.competence_month).padStart(2, '0'),
      run.id,
      pensionistaEmployeeId,
      earningDeductionId,
      'IMPORTED',
    ].join(':');
  }

  private pensionIdempotencyKey(
    run: PayrollRunRow,
    pensionId: string,
    pensionistaEmployeeId: string,
    earningDeductionId: string,
  ): string {
    return [
      run.tenant_id,
      run.competence_year,
      String(run.competence_month).padStart(2, '0'),
      run.id,
      pensionId,
      pensionistaEmployeeId,
      earningDeductionId,
      'PENSIONISTA_IMPORTED',
    ].join(':');
  }

  private requiredUuid(
    value: string,
    rowNumber: number,
    label: string,
  ): string {
    const id = this.uuid(value, rowNumber, label);
    if (!id) {
      throw new BadRequestException(`Row ${rowNumber}: ${label} is required`);
    }
    return id;
  }

  private uuid(value: string, rowNumber: number, label: string): string | null {
    if (!value) return null;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        value,
      )
    ) {
      throw new BadRequestException(`Row ${rowNumber}: ${label} is not a UUID`);
    }
    return value;
  }
}
