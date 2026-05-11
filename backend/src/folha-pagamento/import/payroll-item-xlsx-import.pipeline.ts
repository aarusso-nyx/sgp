import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { refreshImportedPayrollRunAggregates } from './payroll-import-aggregates';
import { parseFirstWorksheet, XlsxTableRow } from './xlsx-table.parser';

export interface UploadedPayrollItemXlsxFile {
  buffer: Buffer;
  originalname?: string | undefined;
  mimetype?: string | undefined;
  size?: number | undefined;
}

export interface PayrollItemImportAcceptedRow {
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

export interface PayrollItemImportRejectedRow {
  rowNumber: number;
  message: string;
}

export interface PayrollItemImportResult {
  payrollRunId: string;
  fileName: string;
  fileHash: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  accepted: PayrollItemImportAcceptedRow[];
  errors: PayrollItemImportRejectedRow[];
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

interface NormalizedPayrollItemImportRow {
  rowNumber: number;
  employeeRegistration: string;
  employeeId: string | null;
  earningDeductionCode: string;
  amount: string;
  quantity: string | null;
  referenceValue: string | null;
  notes: string;
}

export interface PayrollItemXlsxImportOptions {
  defaultFileName: string;
  databaseRequiredMessage: string;
  closedStatusMessage: string;
  missingRubricaMessage: string;
  historyNote: string;
  historyKind: string;
  defaultRowNote: (rowNumber: number) => string;
  amountValidation: 'positive' | 'non-negative';
}

const CLOSED_STATUSES = new Set(['GENERATED', 'APPROVED', 'PAID', 'CLOSED']);
const MAX_XLSX_BYTES = 10 * 1024 * 1024;

export class PayrollItemXlsxImportService {
  constructor(private readonly databaseService: DatabaseService) {}

  async importFile(
    payrollRunId: string,
    file: UploadedPayrollItemXlsxFile | undefined,
    options: PayrollItemXlsxImportOptions,
  ): Promise<PayrollItemImportResult> {
    this.ensureDatabase(options.databaseRequiredMessage);
    this.ensureFile(file);

    const fileName = file.originalname ?? options.defaultFileName;
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');
    const tableRows = parseFirstWorksheet(file.buffer);
    const normalizedRows = this.normalizeRows(tableRows, options);

    return this.databaseService.transaction((client) =>
      this.persistRows(
        client,
        payrollRunId,
        fileName,
        fileHash,
        normalizedRows,
        options,
      ),
    );
  }

  private async persistRows(
    client: PoolClient,
    payrollRunId: string,
    fileName: string,
    fileHash: string,
    rows: NormalizedPayrollItemImportRow[],
    options: PayrollItemXlsxImportOptions,
  ): Promise<PayrollItemImportResult> {
    const run = await this.getPayrollRun(client, payrollRunId);
    if (CLOSED_STATUSES.has(run.status)) {
      throw new ConflictException(
        `Payroll run in status ${run.status} ${options.closedStatusMessage}`,
      );
    }

    const employees = await this.getEmployees(client, rows);
    const earnings = await this.getEarningDeductions(client, rows);
    const seenKeys = new Set<string>();
    const accepted: PayrollItemImportAcceptedRow[] = [];
    const errors: PayrollItemImportRejectedRow[] = [];

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
        options,
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
      await refreshImportedPayrollRunAggregates(client, payrollRunId);
      await this.appendHistory(client, payrollRunId, fileName, fileHash, {
        acceptedRows: accepted.length,
        rejectedRows: errors.length,
        historyKind: options.historyKind,
        historyNote: options.historyNote,
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

  private ensureDatabase(message: string): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(message);
    }
  }

  private ensureFile(
    file: UploadedPayrollItemXlsxFile | undefined,
  ): asserts file is UploadedPayrollItemXlsxFile {
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

  private normalizeRows(
    rows: XlsxTableRow[],
    options: PayrollItemXlsxImportOptions,
  ): NormalizedPayrollItemImportRow[] {
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
        options.amountValidation,
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
          `Row ${rowNumber}: ${options.missingRubricaMessage}`,
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

  private money(
    value: string,
    rowNumber: number,
    label: string,
    validation: PayrollItemXlsxImportOptions['amountValidation'],
  ): string {
    const normalized = this.normalizeDecimal(value);
    const number = Number(normalized);
    const invalid =
      !normalized ||
      !Number.isFinite(number) ||
      (validation === 'positive' ? number <= 0 : number < 0);
    if (invalid) {
      const expectation =
        validation === 'positive' ? 'must be positive' : 'must be non-negative';
      throw new BadRequestException(
        `Row ${rowNumber}: ${label} ${expectation}`,
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
    rows: NormalizedPayrollItemImportRow[],
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
    rows: NormalizedPayrollItemImportRow[],
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
    row: NormalizedPayrollItemImportRow,
    employeeId: string,
    earningDeductionId: string,
    options: PayrollItemXlsxImportOptions,
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
        row.notes || options.defaultRowNote(row.rowNumber),
      ],
    );
    return result.rows[0]!;
  }

  private async appendHistory(
    client: PoolClient,
    payrollRunId: string,
    fileName: string,
    fileHash: string,
    summary: {
      acceptedRows: number;
      rejectedRows: number;
      historyKind: string;
      historyNote: string;
    },
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
        $3,
        $2::jsonb
      FROM payroll.payroll_run
      WHERE id = $1::uuid
      `,
      [
        payrollRunId,
        JSON.stringify({
          kind: summary.historyKind,
          fileName,
          fileHash,
          acceptedRows: summary.acceptedRows,
          rejectedRows: summary.rejectedRows,
        }),
        summary.historyNote,
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
