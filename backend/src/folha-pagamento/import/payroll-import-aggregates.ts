import type { PoolClient, QueryResultRow } from 'pg';

interface PayrollImportFinancialTotalsRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

export async function refreshImportedPayrollRunAggregates(
  client: PoolClient,
  payrollRunId: string,
): Promise<void> {
  const totals = await client.query<PayrollImportFinancialTotalsRow>(
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
