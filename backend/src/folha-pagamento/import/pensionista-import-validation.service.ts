import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { PoolClient } from 'pg';

import type {
  PensionistaEarningDeductionRow,
  PensionistaImportValidation,
  PensionistaNormalizedImportRow,
  PensionistaPayrollRunRow,
  PensionistaRow,
  PensionRow,
} from './pensionista-import.types';

const CLOSED_STATUSES = new Set(['GENERATED', 'APPROVED', 'PAID', 'CLOSED']);

@Injectable()
export class PensionistaImportValidationService {
  async validate(
    client: PoolClient,
    payrollRunId: string,
    rows: PensionistaNormalizedImportRow[],
  ): Promise<PensionistaImportValidation> {
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
    const acceptedRows: PensionistaImportValidation['acceptedRows'] = [];
    const errors: PensionistaImportValidation['errors'] = [];

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
      acceptedRows.push({
        row,
        pensionista,
        pension,
        earning,
        payrollItemIdempotencyKey,
        pensionIdempotencyKey,
      });
    }

    return { run, acceptedRows, errors };
  }

  private async getPayrollRun(
    client: PoolClient,
    id: string,
  ): Promise<PensionistaPayrollRunRow> {
    const result = await client.query<PensionistaPayrollRunRow>(
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
    rows: PensionistaNormalizedImportRow[],
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
    run: PensionistaPayrollRunRow,
    rows: PensionistaNormalizedImportRow[],
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
    rows: PensionistaNormalizedImportRow[],
  ): Promise<Map<string, PensionistaEarningDeductionRow>> {
    const codes = [...new Set(rows.map((row) => row.earningDeductionCode))];
    const result = await client.query<PensionistaEarningDeductionRow>(
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

  private payrollItemIdempotencyKey(
    run: PensionistaPayrollRunRow,
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
    run: PensionistaPayrollRunRow,
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
}
