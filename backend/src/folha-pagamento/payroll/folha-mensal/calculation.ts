import { PoolClient } from 'pg';

import { FolhaMensalCompetenceDto } from '../payroll.dto';
import {
  CountRow,
  MonthlyRubricPhase,
  PayrollRunStatus,
  ValidationRow,
} from '../folha-mensal.types';

export async function softDeleteMonthlyCalculatedItems(
  client: PoolClient,
  payrollRunId: string,
): Promise<void> {
  await client.query(
    `
    UPDATE payroll.employee_payroll_item
    SET deleted_at = now(),
        deleted_reason = 'calc11.monthly.reprocessed',
        updated_at = now()
    WHERE payroll_run_id = $1::uuid
      AND source = 'CALCULATED'::"PayrollEntrySource"
      AND deleted_at IS NULL
    `,
    [payrollRunId],
  );
}

export async function deleteMonthlyFinancialRecords(
  client: PoolClient,
  payrollRunId: string,
): Promise<void> {
  await client.query(
    `
    DELETE FROM payroll.payroll_financial_record
    WHERE payroll_run_id = $1::uuid
    `,
    [payrollRunId],
  );
}

export async function insertMonthlyCalculatedItems(
  client: PoolClient,
  payrollRunId: string,
  payrollTypeId: string,
  input: FolhaMensalCompetenceDto,
): Promise<number> {
  const phases: MonthlyRubricPhase[] = [
    'earning',
    'social_security',
    'income_tax',
  ];
  let inserted = 0;
  for (const phase of phases) {
    inserted += await insertMonthlyCalculatedItemsForPhase(
      client,
      payrollRunId,
      payrollTypeId,
      input,
      phase,
    );
  }
  return inserted;
}

export async function refreshMonthlyFinancialRecords(
  client: PoolClient,
  payrollRunId: string,
  input: FolhaMensalCompetenceDto,
): Promise<void> {
  await client.query(
    'SELECT payroll.sgp_create_payroll_financial_record_partition(make_date($1::integer, $2::integer, 1))',
    [input.year, input.month],
  );
  await client.query(
    `
    INSERT INTO payroll.payroll_financial_record (
      tenant_id,
      employee_id,
      payroll_run_id,
      branch_id,
      work_location_id,
      functional_status_id,
      competence_year,
      competence_month,
      competence,
      total_earnings,
      total_deductions,
      net_amount,
      metadata
    )
    SELECT
      public.sgp_current_tenant_uuid(),
      employee.id,
      $1::uuid,
      employee.branch_id,
      employee.work_location_id,
      employee.functional_status_id,
      $2,
      $3,
      make_date($2::integer, $3::integer, 1),
      round(coalesce(sum(CASE WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0), 2)::numeric(16, 2),
      round(coalesce(sum(CASE WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0), 2)::numeric(16, 2),
      round(coalesce(sum(CASE
        WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
        WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
        ELSE 0
      END), 0), 2)::numeric(16, 2),
      jsonb_build_object('origin', 'monthly_payroll')
    FROM payroll.v_payroll_run_line_active item
    JOIN hr.employee employee ON employee.id = item.employee_id
    JOIN payroll.payroll_earning_deduction earning ON earning.id = item.earning_deduction_id
    WHERE item.payroll_run_id = $1::uuid
    GROUP BY
      employee.id,
      employee.branch_id,
      employee.work_location_id,
      employee.functional_status_id
    ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id, competence)
    DO UPDATE SET
      branch_id = EXCLUDED.branch_id,
      work_location_id = EXCLUDED.work_location_id,
      functional_status_id = EXCLUDED.functional_status_id,
      total_earnings = EXCLUDED.total_earnings,
      total_deductions = EXCLUDED.total_deductions,
      net_amount = EXCLUDED.net_amount,
      metadata = EXCLUDED.metadata,
      generated_at = now()
    `,
    [payrollRunId, input.year, input.month],
  );
}

export async function refreshMonthlyRunTotals(
  client: PoolClient,
  payrollRunId: string,
  status: PayrollRunStatus,
): Promise<void> {
  await client.query(
    `
    WITH totals AS (
      SELECT
        count(*)::integer AS employee_count,
        coalesce(sum(total_earnings), 0)::numeric(16, 2) AS total_earnings,
        coalesce(sum(total_deductions), 0)::numeric(16, 2) AS total_deductions,
        coalesce(sum(net_amount), 0)::numeric(16, 2) AS total_net
      FROM payroll.payroll_financial_record
      WHERE payroll_run_id = $1::uuid
    )
    UPDATE payroll.payroll_run run
    SET employee_count = totals.employee_count,
        total_earnings = totals.total_earnings,
        total_deductions = totals.total_deductions,
        total_net = totals.total_net,
        status = $2::"PayrollRunStatus",
        updated_at = now()
    FROM totals
    WHERE run.id = $1::uuid
    `,
    [payrollRunId, status],
  );
}

export async function validateMonthlyRun(
  client: PoolClient,
  payrollRunId: string,
): Promise<Record<string, unknown>> {
  const rows = await client.query<ValidationRow>(
    `
    SELECT payroll_calc.validate_payroll_run(
      public.sgp_current_tenant_uuid(),
      $1::uuid
    ) AS validation
    `,
    [payrollRunId],
  );
  return rows.rows[0]?.validation ?? {};
}

async function insertMonthlyCalculatedItemsForPhase(
  client: PoolClient,
  payrollRunId: string,
  payrollTypeId: string,
  input: FolhaMensalCompetenceDto,
  phase: MonthlyRubricPhase,
): Promise<number> {
  const rows = await client.query<CountRow>(
    `
    WITH eligible_rubrics AS (
      SELECT
        earning.id,
        earning.code,
        earning.kind,
        earning.incidences,
        type_earning.default_quantity
      FROM payroll.payroll_type_earning type_earning
      JOIN payroll.payroll_earning_deduction earning
        ON earning.id = type_earning.earning_deduction_id
      WHERE type_earning.tenant_id = public.sgp_current_tenant_uuid()
        AND type_earning.payroll_type_id = $2::uuid
        AND type_earning.status = 'ACTIVE'::"RecordStatus"
        AND (type_earning.starts_on IS NULL OR type_earning.starts_on <= make_date($3, $4, 1))
        AND (type_earning.ends_on IS NULL OR type_earning.ends_on >= make_date($3, $4, 1))
        AND earning.tenant_id = public.sgp_current_tenant_uuid()
        AND earning.active = true
        AND earning.formula_ready = true
        AND (earning.starts_on IS NULL OR earning.starts_on <= make_date($3, $4, 1))
        AND (earning.ends_on IS NULL OR earning.ends_on >= make_date($3, $4, 1))
        AND CASE
          WHEN $5 = 'earning' THEN earning.kind = 'EARNING'::"PayrollEntryKind"
          WHEN $5 = 'social_security' THEN earning.kind = 'DEDUCTION'::"PayrollEntryKind"
            AND (
              earning.code IN ('INSS', 'RGPS', 'RPPS')
              OR earning.incidences ? 'official_social_security'
            )
          WHEN $5 = 'income_tax' THEN earning.kind = 'DEDUCTION'::"PayrollEntryKind"
            AND (
              earning.code = 'IRRF'
              OR earning.incidences ? 'income_tax'
            )
          ELSE false
        END
    ),
    evaluated AS (
      SELECT
        employee.id AS employee_id,
        rubric.id AS earning_deduction_id,
        rubric.code,
        CASE
          WHEN rubric.code = 'MONTHLY_BASE_SALARY'
            THEN payroll_calc.worked_days(employee.id, $4, $3)::numeric(12, 4)
          ELSE COALESCE(rubric.default_quantity, 1)::numeric(12, 4)
        END AS quantity,
        payroll_calc.base_salary(employee.id, make_date($3, $4, 1))::numeric(14, 2) AS reference_value,
        payroll_calc.evaluate_earning_deduction(rubric.id, employee.id, $4, $3) AS amount
      FROM hr.employee employee
      JOIN hr.functional_status functional_status
        ON functional_status.id = employee.functional_status_id
      CROSS JOIN eligible_rubrics rubric
      WHERE employee.tenant_id = public.sgp_current_tenant_uuid()
        AND employee.lifecycle_status IN (
          'ACTIVE'::"EmployeeLifecycleStatus",
          'ON_LEAVE'::"EmployeeLifecycleStatus"
        )
        AND functional_status.enters_payroll = true
    ),
    inserted AS (
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
      SELECT
        public.sgp_current_tenant_uuid(),
        evaluated.employee_id,
        $1::uuid,
        evaluated.earning_deduction_id,
        'CALCULATED'::"PayrollEntrySource",
        $3,
        $4,
        evaluated.quantity,
        evaluated.reference_value,
        evaluated.amount,
        'Monthly ' || evaluated.code || ' calculation'
      FROM evaluated
      WHERE evaluated.code = 'MONTHLY_BASE_SALARY'
         OR evaluated.amount <> 0
      RETURNING id
    )
    SELECT count(*)::text AS inserted_count
    FROM inserted
    `,
    [payrollRunId, payrollTypeId, input.year, input.month, phase],
  );
  return Number(rows.rows[0]?.inserted_count ?? '0');
}
