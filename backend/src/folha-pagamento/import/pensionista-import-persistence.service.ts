import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

import type {
  PensionistaImportedItemRow,
  PensionistaImportAcceptedRow,
  PensionistaImportResult,
  PensionistaImportValidation,
  PensionistaNormalizedImportRow,
  PensionistaPayrollRunRow,
} from './pensionista-import.types';
import { refreshImportedPayrollRunAggregates } from './payroll-import-aggregates';

@Injectable()
export class PensionistaImportPersistenceService {
  async persist(
    client: PoolClient,
    payrollRunId: string,
    fileName: string,
    fileHash: string,
    rows: PensionistaNormalizedImportRow[],
    validation: PensionistaImportValidation,
  ): Promise<PensionistaImportResult> {
    const accepted: PensionistaImportAcceptedRow[] = [];

    for (const validRow of validation.acceptedRows) {
      const imported = await this.upsertImportedItem(
        client,
        validation.run,
        validRow.row,
        validRow.pensionista.id,
        validRow.earning.id,
      );
      accepted.push({
        rowNumber: validRow.row.rowNumber,
        payrollItemId: imported.id,
        pensionId: validRow.pension.id,
        pensionBeneficiaryId: validRow.pensionista.beneficiary_id,
        pensionistaEmployeeId: validRow.pensionista.id,
        pensionistaRegistration: validRow.pensionista.registration,
        earningDeductionId: validRow.earning.id,
        earningDeductionCode: validRow.earning.code,
        amount: validRow.row.amount,
        payrollItemIdempotencyKey: validRow.payrollItemIdempotencyKey,
        pensionIdempotencyKey: validRow.pensionIdempotencyKey,
        operation: imported.inserted ? 'created' : 'updated',
      });
    }

    if (accepted.length > 0) {
      await refreshImportedPayrollRunAggregates(client, payrollRunId);
      await this.appendHistory(client, payrollRunId, fileName, fileHash, {
        acceptedRows: accepted.length,
        rejectedRows: validation.errors.length,
      });
    }

    return {
      payrollRunId,
      fileName,
      fileHash,
      totalRows: rows.length,
      acceptedRows: accepted.length,
      rejectedRows: validation.errors.length,
      accepted,
      errors: validation.errors,
    };
  }

  private async upsertImportedItem(
    client: PoolClient,
    run: PensionistaPayrollRunRow,
    row: PensionistaNormalizedImportRow,
    pensionistaEmployeeId: string,
    earningDeductionId: string,
  ): Promise<PensionistaImportedItemRow> {
    const result = await client.query<PensionistaImportedItemRow>(
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
}
