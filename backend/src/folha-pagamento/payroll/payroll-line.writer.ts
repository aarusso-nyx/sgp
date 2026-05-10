import { ConflictException } from '@nestjs/common';

import { roundMoney, toMoney } from '../../common/money/money';
import { DatabaseService } from '../../database/database.service';
import {
  AdvanceInsertRow,
  EligibleEmployeeRow,
  FinancialTotalsRow,
  PayrollMappingRow,
  PayrollRunDetailRow,
  PayrollRunRow,
  SoftDeletedItemRow,
  TerminatedEmployeeRow,
} from './payroll.types';

export class PayrollLineWriter {
  constructor(private readonly databaseService: DatabaseService) {}

  async updateRunStatus(id: string, status: string): Promise<PayrollRunRow[]> {
    return this.databaseService.query<PayrollRunRow>(
      `
      UPDATE payroll.payroll_run
      SET status = $2::"PayrollRunStatus",
          updated_at = now(),
          closed_at = CASE
            WHEN $2::"PayrollRunStatus" = 'CLOSED'::"PayrollRunStatus" THEN now()
            ELSE closed_at
          END
      WHERE id = $1::uuid
      RETURNING
        id,
        competence_year,
        competence_month,
        NULL::text AS processing_type,
        NULL::text AS payroll_type,
        NULL::text AS branch_name,
        NULL::date AS payment_date,
        status::text AS status,
        employee_count,
        total_net::text AS total_net,
        created_at,
        updated_at
      `,
      [id, status],
    );
  }

  async prepareRunForReprocessing(id: string, status: string): Promise<void> {
    if (['APPROVED', 'PAID', 'CLOSED'].includes(status)) {
      throw new ConflictException(
        `Payroll run in status ${status} cannot be reprocessed`,
      );
    }
    const rows = await this.databaseService.query<{ id: string }>(
      `
      UPDATE payroll.payroll_run
      SET status = 'PROCESSING'::"PayrollRunStatus",
          updated_at = now()
      WHERE id = $1::uuid
        AND status <> 'PROCESSING'::"PayrollRunStatus"
      RETURNING id::text
      `,
      [id],
    );
    if (!rows[0]) {
      throw new ConflictException(
        'Payroll run is locked by another processing operation',
      );
    }
  }

  async softDeleteCalculatedItems(
    id: string,
    reason: string,
    note: string,
  ): Promise<number> {
    const rows = await this.databaseService.query<SoftDeletedItemRow>(
      `
      UPDATE payroll.employee_payroll_item
      SET deleted_at = now(),
          deleted_reason = $2,
          updated_at = now()
      WHERE payroll_run_id = $1::uuid
        AND source = 'CALCULATED'::"PayrollEntrySource"
        AND deleted_at IS NULL
      RETURNING id::text
      `,
      [id, reason],
    );

    if (rows.length > 0) {
      await this.databaseService.query(
        `
        SELECT public.sgp_append_audit_event(
          'PROCESS',
          'payroll.run',
          $1::text,
          NULL::uuid,
          NULLIF(current_setting('app.current_user_sub', true), ''),
          NULLIF(current_setting('app.current_login', true), ''),
          'payroll.employee_payroll_item',
          NULLIF(current_setting('app.request_id', true), ''),
          $2::jsonb,
          $3,
          NULL::text,
          NULL::text
        )
        `,
        [
          id,
          JSON.stringify({
            event: reason,
            softDeletedLineCount: rows.length,
            note,
          }),
          reason,
        ],
      );
    }

    return rows.length;
  }

  async insertMappedPayrollItem(
    run: PayrollRunDetailRow,
    employee: EligibleEmployeeRow,
    mapping: PayrollMappingRow,
    quantity: ReturnType<typeof toMoney>,
    amount: ReturnType<typeof roundMoney>,
  ): Promise<void> {
    await this.databaseService.query(
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
        'CALCULATED'::"PayrollEntrySource",
        $4,
        $5,
        $6::decimal,
        NULLIF($7, '')::decimal,
        $8::decimal,
        $9
      )
      `,
      [
        employee.employee_id,
        run.id,
        mapping.earning_deduction_id,
        run.competence_year,
        run.competence_month,
        quantity.toFixed(4),
        employee.salary_amount ?? '',
        amount.toFixed(2),
        `Mass population from linkage ${mapping.code}`,
      ],
    );
  }

  async createAdvanceRequest(input: {
    employeeId: string;
    payrollRunId: string;
    requestedAmount: string;
    approvedAmount: string;
    requestedOn: string;
    notes?: string | undefined;
  }): Promise<string> {
    const requestRows = await this.databaseService.query<AdvanceInsertRow>(
      `
      INSERT INTO payroll.advance_request (
        tenant_id,
        employee_id,
        payroll_run_id,
        requested_amount,
        approved_amount,
        requested_on,
        processed_on,
        status,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::decimal,
        $4::decimal,
        $5::date,
        $5::date,
        'APPROVED'::"AdvanceRequestStatus",
        $6
      )
      RETURNING id::text
      `,
      [
        input.employeeId,
        input.payrollRunId,
        input.requestedAmount,
        input.approvedAmount,
        input.requestedOn,
        input.notes?.trim() || '',
      ],
    );
    return requestRows[0]?.id ?? '';
  }

  async createAdvancePayment(input: {
    requestId: string;
    employeeId: string;
    payrollRunId: string;
    approvedAmount: string;
    requestedOn: string;
    notes?: string | undefined;
  }): Promise<string> {
    const paymentRows = await this.databaseService.query<AdvanceInsertRow>(
      `
      INSERT INTO payroll.advance_payment (
        tenant_id,
        request_id,
        employee_id,
        payroll_run_id,
        amount,
        payment_date,
        status,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::decimal,
        $5::date,
        'GENERATED'::"AdvancePaymentStatus",
        $6
      )
      RETURNING id::text
      `,
      [
        input.requestId,
        input.employeeId,
        input.payrollRunId,
        input.approvedAmount,
        input.requestedOn,
        input.notes?.trim() || '',
      ],
    );
    return paymentRows[0]?.id ?? '';
  }

  async insertAdvancePayrollItem(input: {
    employeeId: string;
    payrollRunId: string;
    earningId: string;
    competenceYear: number;
    competenceMonth: number;
    approvedAmount: string;
    paymentId: string;
  }): Promise<void> {
    await this.databaseService.query(
      `
      INSERT INTO payroll.employee_payroll_item (
        tenant_id,
        employee_id,
        payroll_run_id,
        earning_deduction_id,
        source,
        competence_year,
        competence_month,
        amount,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'ADJUSTMENT'::"PayrollEntrySource",
        $4,
        $5,
        $6::decimal,
        $7
      )
      `,
      [
        input.employeeId,
        input.payrollRunId,
        input.earningId,
        input.competenceYear,
        input.competenceMonth,
        input.approvedAmount,
        `Advance payment ${input.paymentId}`,
      ],
    );
  }

  async markAdvanceRequestProcessed(requestId: string): Promise<void> {
    await this.databaseService.query(
      `
      UPDATE payroll.advance_request
      SET status = 'PROCESSED'::"AdvanceRequestStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [requestId],
    );
  }

  async updateRunAggregates(
    id: string,
    totals: FinancialTotalsRow,
  ): Promise<void> {
    await this.databaseService.query(
      `
      UPDATE payroll.payroll_run
      SET
        employee_count = $2::int,
        total_earnings = $3::decimal,
        total_deductions = $4::decimal,
        total_net = $5::decimal,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [
        id,
        totals.employee_count,
        totals.total_earnings,
        totals.total_deductions,
        totals.total_net,
      ],
    );
  }

  async finalizeCalculation(
    id: string,
    totals: FinancialTotalsRow,
  ): Promise<PayrollRunRow> {
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      UPDATE payroll.payroll_run
      SET
        employee_count = $2::int,
        total_earnings = $3::decimal,
        total_deductions = $4::decimal,
        total_net = $5::decimal,
        status = 'GENERATED'::"PayrollRunStatus",
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        competence_year,
        competence_month,
        NULL::text AS processing_type,
        NULL::text AS payroll_type,
        NULL::text AS branch_name,
        NULL::date AS payment_date,
        status::text AS status,
        employee_count,
        total_net::text AS total_net,
        created_at,
        updated_at
      `,
      [
        id,
        totals.employee_count,
        totals.total_earnings,
        totals.total_deductions,
        totals.total_net,
      ],
    );
    return rows[0]!;
  }

  async insertCalculationHistory(input: {
    id: string;
    recalculated: boolean;
    mode: string;
    totals: FinancialTotalsRow;
  }): Promise<void> {
    await this.databaseService.query(
      `
      INSERT INTO payroll.payroll_run_status_history (
        tenant_id,
        payroll_run_id,
        status,
        note,
        metadata
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        'GENERATED'::"PayrollRunStatus",
        $2,
        $3::jsonb
      )
      `,
      [
        input.id,
        input.recalculated ? 'Payroll recalculated' : 'Payroll calculated',
        JSON.stringify({
          kind: input.recalculated ? 'RECALCULATED' : 'CALCULATED',
          mode: input.mode,
          totalNet: input.totals.total_net,
          employeeCount: input.totals.employee_count,
        }),
      ],
    );
  }

  async refreshWorkLocationRollups(id: string): Promise<void> {
    await this.databaseService.query(
      `DELETE FROM payroll.payroll_run_work_location WHERE payroll_run_id = $1::uuid`,
      [id],
    );
    await this.databaseService.query(
      `
      INSERT INTO payroll.payroll_run_work_location (
        tenant_id,
        payroll_run_id,
        work_location_id,
        employee_count,
        total_earnings,
        total_deductions,
        total_net,
        metadata
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        e.work_location_id,
        count(DISTINCT item.employee_id)::int,
        coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::decimal,
        coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::decimal,
        coalesce(sum(CASE
          WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::decimal,
        jsonb_build_object('origin', 'payroll_run')
      FROM payroll.v_payroll_run_line_active item
      JOIN hr.employee e ON e.id = item.employee_id
      JOIN payroll.payroll_earning_deduction ed
        ON ed.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      GROUP BY e.work_location_id
      `,
      [id],
    );
  }

  async insertTerminationPayrollItem(input: {
    employee: TerminatedEmployeeRow;
    run: PayrollRunDetailRow;
    earningId: string;
    amount: ReturnType<typeof roundMoney>;
    code: string;
  }): Promise<void> {
    await this.databaseService.query(
      `
      INSERT INTO payroll.employee_payroll_item (
        tenant_id,
        employee_id,
        payroll_run_id,
        earning_deduction_id,
        source,
        competence_year,
        competence_month,
        amount,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'CALCULATED'::"PayrollEntrySource",
        $4,
        $5,
        $6::decimal,
        $7
      )
      `,
      [
        input.employee.employee_id,
        input.run.id,
        input.earningId,
        input.run.competence_year,
        input.run.competence_month,
        input.amount.toFixed(2),
        `Termination calculation ${input.code}`,
      ],
    );
  }

  async upsertTerminationFinancialRecord(input: {
    employee: TerminatedEmployeeRow;
    run: PayrollRunDetailRow;
    totalEarnings: ReturnType<typeof toMoney>;
    proportionalMonths: number;
    terminationDay: number;
  }): Promise<void> {
    await this.databaseService.query(
      'SELECT payroll.sgp_create_payroll_financial_record_partition(make_date($1::integer, $2::integer, 1))',
      [input.run.competence_year, input.run.competence_month],
    );
    await this.databaseService.query(
      `
      INSERT INTO payroll.payroll_financial_record (
        tenant_id,
        employee_id,
        payroll_run_id,
        branch_id,
        functional_status_id,
        competence_year,
        competence_month,
        competence,
        total_earnings,
        total_deductions,
        net_amount,
        metadata
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        NULLIF($3, '')::uuid,
        NULLIF($4, '')::uuid,
        $5,
        $6,
        make_date($5::integer, $6::integer, 1),
        $7::decimal,
        0::decimal,
        $7::decimal,
        $8::jsonb
      )
      ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id, competence)
      DO UPDATE SET
        total_earnings = EXCLUDED.total_earnings,
        total_deductions = EXCLUDED.total_deductions,
        net_amount = EXCLUDED.net_amount,
        metadata = EXCLUDED.metadata,
        generated_at = now()
      `,
      [
        input.employee.employee_id,
        input.run.id,
        input.employee.branch_id ?? '',
        input.employee.functional_status_id ?? '',
        input.run.competence_year,
        input.run.competence_month,
        roundMoney(input.totalEarnings).toFixed(2),
        JSON.stringify({
          origin: 'termination',
          proportionalMonths: input.proportionalMonths,
          terminationDay: input.terminationDay,
        }),
      ],
    );
  }
}
