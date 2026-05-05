import { NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';

import {
  CompetenceRow,
  FolhaMensalResult,
  FolhaMensalReviewLine,
  ReviewRow,
  RunRow,
} from '../folha-mensal.types';

export async function buildMonthlyResult(
  client: PoolClient,
  competenceId: string,
  payrollRunId: string,
  validation?: Record<string, unknown>,
): Promise<FolhaMensalResult> {
  const runRows = await client.query<RunRow>(
    `
    SELECT
      id::text,
      competence_year,
      competence_month,
      status::text,
      employee_count,
      total_earnings::text,
      total_deductions::text,
      total_net::text
    FROM payroll.payroll_run
    WHERE id = $1::uuid
    `,
    [payrollRunId],
  );
  const competenceRows = await client.query<CompetenceRow>(
    `
    SELECT
      id::text,
      competence_year,
      competence_month,
      status,
      opened_at,
      closed_at
    FROM hr.competence_period
    WHERE id = $1::uuid
    `,
    [competenceId],
  );
  const review = await reviewRows(client, payrollRunId);
  const run = runRows.rows[0];
  const competence = competenceRows.rows[0];
  if (!run || !competence) {
    throw new NotFoundException('Monthly payroll result not found');
  }
  return {
    competenceId: competence.id,
    payrollRunId: run.id,
    competenceYear: run.competence_year,
    competenceMonth: run.competence_month,
    competenceStatus: competence.status,
    payrollStatus: run.status,
    employeeCount: run.employee_count,
    totalEarnings: run.total_earnings,
    totalDeductions: run.total_deductions,
    totalNet: run.total_net,
    validation,
    review,
  };
}

async function reviewRows(
  client: PoolClient,
  payrollRunId: string,
): Promise<FolhaMensalReviewLine[]> {
  const rows = await client.query<ReviewRow>(
    `
    SELECT
      employee.id::text AS employee_id,
      employee.registration,
      employee.name AS employee_name,
      financial.total_earnings::text,
      financial.total_deductions::text,
      financial.net_amount::text
    FROM payroll.payroll_financial_record financial
    JOIN hr.employee employee ON employee.id = financial.employee_id
    WHERE financial.payroll_run_id = $1::uuid
    ORDER BY employee.registration, employee.name
    `,
    [payrollRunId],
  );
  return rows.rows.map((row) => ({
    employeeId: row.employee_id,
    registration: row.registration,
    employeeName: row.employee_name,
    totalEarnings: row.total_earnings,
    totalDeductions: row.total_deductions,
    netAmount: row.net_amount,
  }));
}
