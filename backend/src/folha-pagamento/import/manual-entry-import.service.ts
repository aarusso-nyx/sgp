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

export interface UploadedManualEntryXlsxFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

export interface ManualEntryImportAcceptedRow {
  rowNumber: number;
  payrollItemId: string;
  employeeId: string;
  employeeRegistration: string;
  earningDeductionId: string;
  earningDeductionCode: string;
  amount: string;
  idempotencyKey: string;
  operation: 'created' | 'updated';
}

export interface ManualEntryImportRejectedRow {
  rowNumber: number;
  message: string;
}

export interface ManualEntryImportResult {
  payrollRunId: string;
  folhaPagamentoId: string;
  fileName: string;
  fileHash: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  accepted: ManualEntryImportAcceptedRow[];
  errors: ManualEntryImportRejectedRow[];
}

interface PayrollRunRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  competence_year: number;
  competence_month: number;
  status: string;
}

interface EmployeeRow extends QueryResultRow {
  id: string;
  registration: string;
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

interface NormalizedManualEntryRow {
  rowNumber: number;
  employeeRegistration: string;
  employeeId: string | null;
  earningDeductionCode: string;
  amount: string;
  quantity: string | null;
  referenceValue: string | null;
  notes: string;
}

const CLOSED_STATUSES = new Set(['GENERATED', 'APPROVED', 'PAID', 'CLOSED']);
const MAX_XLSX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class ManualEntryImportService {
  constructor(private readonly databaseService: DatabaseService) {}

  async importFile(
    payrollRunId: string,
    file: UploadedManualEntryXlsxFile | undefined,
  ): Promise<ManualEntryImportResult> {
    this.ensureDatabase();
    this.ensureFile(file);

    const fileName = file.originalname ?? 'manual-entry-import.xlsx';
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
    rows: NormalizedManualEntryRow[],
  ): Promise<ManualEntryImportResult> {
    const run = await this.getPayrollRun(client, payrollRunId);
    if (CLOSED_STATUSES.has(run.status)) {
      throw new ConflictException(
        `Payroll run in status ${run.status} cannot receive manual entry imports`,
      );
    }

    const employees = await this.getEmployees(client, rows);
    const earnings = await this.getEarningDeductions(client, rows);
    const seenKeys = new Set<string>();
    const accepted: ManualEntryImportAcceptedRow[] = [];
    const errors: ManualEntryImportRejectedRow[] = [];

    for (const row of rows) {
      const employee =
        (row.employeeId ? employees.byId.get(row.employeeId) : undefined) ??
        employees.byRegistration.get(row.employeeRegistration);
      const earning = earnings.get(row.earningDeductionCode);

      if (!employee) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Employee ${row.employeeId ?? row.employeeRegistration} not found`,
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

      const idempotencyKey = this.idempotencyKey(run, employee.id, earning.id);
      if (seenKeys.has(idempotencyKey)) {
        errors.push({
          rowNumber: row.rowNumber,
          message: 'Duplicate employee/rubrica row in XLSX',
        });
        continue;
      }
      seenKeys.add(idempotencyKey);

      const imported = await this.upsertImportedItem(
        client,
        run,
        row,
        employee.id,
        earning.id,
      );
      accepted.push({
        rowNumber: row.rowNumber,
        payrollItemId: imported.id,
        employeeId: employee.id,
        employeeRegistration: employee.registration,
        earningDeductionId: earning.id,
        earningDeductionCode: earning.code,
        amount: row.amount,
        idempotencyKey,
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
      folhaPagamentoId: payrollRunId,
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
        'DATABASE_URL is required for manual entry imports',
      );
    }
  }

  private ensureFile(
    file: UploadedManualEntryXlsxFile | undefined,
  ): asserts file is UploadedManualEntryXlsxFile {
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

  private normalizeRows(rows: XlsxTableRow[]): NormalizedManualEntryRow[] {
    return rows.map((row, index) => {
      const rowNumber = index + 2;
      const employeeRegistration = this.first(row, [
        'matricula',
        'registro',
        'servidor_matricula',
        'employee_registration',
      ]);
      const employeeId =
        this.uuid(this.first(row, ['employee_id', 'servidor_id']), rowNumber) ??
        null;
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

      if (!employeeRegistration && !employeeId) {
        throw new BadRequestException(
          `Row ${rowNumber}: employee registration or employee_id is required`,
        );
      }
      if (!earningDeductionCode) {
        throw new BadRequestException(
          `Row ${rowNumber}: payroll item code is required`,
        );
      }

      return {
        rowNumber,
        employeeRegistration,
        employeeId,
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
    if (!normalized || !Number.isFinite(number) || number <= 0) {
      throw new BadRequestException(
        `Row ${rowNumber}: ${label} must be positive`,
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

  private async getEmployees(
    client: PoolClient,
    rows: NormalizedManualEntryRow[],
  ): Promise<{
    byId: Map<string, EmployeeRow>;
    byRegistration: Map<string, EmployeeRow>;
  }> {
    const ids = rows
      .map((row) => row.employeeId)
      .filter((id): id is string => Boolean(id));
    const registrations = rows
      .map((row) => row.employeeRegistration)
      .filter(Boolean);
    const result = await client.query<EmployeeRow>(
      `
      SELECT id::text, registration
      FROM hr.employee
      WHERE (cardinality($1::uuid[]) > 0 AND id = ANY($1::uuid[]))
         OR (cardinality($2::text[]) > 0 AND registration = ANY($2::text[]))
      `,
      [ids, registrations],
    );

    return {
      byId: new Map(result.rows.map((row) => [row.id, row])),
      byRegistration: new Map(
        result.rows.map((row) => [row.registration, row]),
      ),
    };
  }

  private async getEarningDeductions(
    client: PoolClient,
    rows: NormalizedManualEntryRow[],
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
    row: NormalizedManualEntryRow,
    employeeId: string,
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
        employeeId,
        run.id,
        earningDeductionId,
        run.competence_year,
        run.competence_month,
        row.quantity ?? '',
        row.referenceValue ?? '',
        row.amount,
        row.notes || `Manual entry XLSX import row ${row.rowNumber}`,
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
        'Manual entry XLSX import',
        $2::jsonb
      FROM payroll.payroll_run
      WHERE id = $1::uuid
      `,
      [
        payrollRunId,
        JSON.stringify({
          kind: 'MANUAL_ENTRY_XLSX_IMPORT',
          folhaPagamentoId: payrollRunId,
          fileName,
          fileHash,
          ...summary,
        }),
      ],
    );
  }

  private idempotencyKey(
    run: PayrollRunRow,
    employeeId: string,
    earningDeductionId: string,
  ): string {
    return [
      run.tenant_id,
      run.competence_year,
      String(run.competence_month).padStart(2, '0'),
      run.id,
      employeeId,
      earningDeductionId,
      'IMPORTED',
    ].join(':');
  }

  private uuid(value: string, rowNumber: number): string | null {
    if (!value) return null;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        value,
      )
    ) {
      throw new BadRequestException(
        `Row ${rowNumber}: employee_id is not a UUID`,
      );
    }
    return value;
  }
}
