CREATE FUNCTION payroll_calc.validate_payroll_run(p_tenant_id uuid, p_payroll_run_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'payroll', 'hr', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_employee_count integer := 0;
  v_total_earnings numeric(16, 2) := 0;
  v_total_deductions numeric(16, 2) := 0;
  v_total_net numeric(16, 2) := 0;
  v_mismatched_records integer := 0;
  v_negative_net integer := 0;
  v_allow_negative_net boolean := false;
BEGIN
  SELECT *
  INTO v_run
  FROM payroll.payroll_run run
  WHERE run.id = p_payroll_run_id
    AND run.tenant_id = p_tenant_id;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Payroll run % was not found for tenant %', p_payroll_run_id, p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  WITH employee_totals AS (
    SELECT
      item.employee_id,
      round(coalesce(sum(CASE WHEN earning.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount ELSE 0 END), 0), 2)::numeric(16, 2) AS earnings,
      round(coalesce(sum(CASE WHEN earning.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN item.amount ELSE 0 END), 0), 2)::numeric(16, 2) AS deductions,
      round(coalesce(sum(CASE
        WHEN earning.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount
        WHEN earning.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN -item.amount
        ELSE 0
      END), 0), 2)::numeric(16, 2) AS net
    FROM payroll.v_payroll_run_line_active item
    JOIN payroll.payroll_earning_deduction earning
      ON earning.id = item.earning_deduction_id
    WHERE item.tenant_id = p_tenant_id
      AND item.payroll_run_id = p_payroll_run_id
    GROUP BY item.employee_id
  ),
  aggregate_totals AS (
    SELECT
      count(*)::integer AS employee_count,
      coalesce(sum(earnings), 0)::numeric(16, 2) AS total_earnings,
      coalesce(sum(deductions), 0)::numeric(16, 2) AS total_deductions,
      coalesce(sum(net), 0)::numeric(16, 2) AS total_net,
      count(*) FILTER (WHERE net < 0)::integer AS negative_net_count
    FROM employee_totals
  ),
  record_mismatches AS (
    SELECT count(*)::integer AS mismatch_count
    FROM employee_totals totals
    LEFT JOIN payroll.payroll_financial_record financial
      ON financial.tenant_id = p_tenant_id
     AND financial.payroll_run_id = p_payroll_run_id
     AND financial.employee_id = totals.employee_id
    WHERE financial.id IS NULL
       OR financial.total_earnings::numeric(16, 2) <> totals.earnings
       OR financial.total_deductions::numeric(16, 2) <> totals.deductions
       OR financial.net_amount::numeric(16, 2) <> totals.net
  )
  SELECT
    aggregate_totals.employee_count,
    aggregate_totals.total_earnings,
    aggregate_totals.total_deductions,
    aggregate_totals.total_net,
    aggregate_totals.negative_net_count,
    record_mismatches.mismatch_count
  INTO
    v_employee_count,
    v_total_earnings,
    v_total_deductions,
    v_total_net,
    v_negative_net,
    v_mismatched_records
  FROM aggregate_totals
  CROSS JOIN record_mismatches;

  v_allow_negative_net := payroll_calc.allow_negative_net(p_tenant_id);

  IF NOT v_allow_negative_net AND v_negative_net > 0 THEN
    RAISE EXCEPTION 'Payroll run % has % employee(s) with negative net pay', p_payroll_run_id, v_negative_net
      USING ERRCODE = '23514';
  END IF;

  IF v_mismatched_records > 0 THEN
    RAISE EXCEPTION 'Payroll run % has % employee financial record mismatch(es)', p_payroll_run_id, v_mismatched_records
      USING ERRCODE = '23514';
  END IF;

  IF v_employee_count <> v_run.employee_count
    OR v_total_earnings <> v_run.total_earnings
    OR v_total_deductions <> v_run.total_deductions
    OR v_total_net <> v_run.total_net
  THEN
    RAISE EXCEPTION 'Payroll run % aggregate totals are inconsistent: employees %, earnings %, deductions %, net %; stored employees %, earnings %, deductions %, net %',
      p_payroll_run_id,
      v_employee_count,
      v_total_earnings,
      v_total_deductions,
      v_total_net,
      v_run.employee_count,
      v_run.total_earnings,
      v_run.total_deductions,
      v_run.total_net
      USING ERRCODE = '23514';
  END IF;

  RETURN jsonb_build_object(
    'payrollRunId', p_payroll_run_id,
    'employeeCount', v_employee_count,
    'totalEarnings', v_total_earnings,
    'totalDeductions', v_total_deductions,
    'totalNet', v_total_net,
    'allowNegativeNet', v_allow_negative_net
  );
END;
$$;

CREATE FUNCTION payroll_calc.worked_days(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE((
    SELECT ef.worked_days
    FROM hr.employee_frequency ef
    WHERE ef.employee_id = p_employee_id
      AND ef.month = p_month
      AND ef.year = p_year
  ), payroll_calc.days_in_month(p_year, p_month) - payroll_calc.absence_days(p_employee_id, p_month, p_year));
$$;

CREATE FUNCTION payroll_calc.workload_hours(p_employee_id uuid) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(shift.daily_hours, 0)
  FROM hr.employee employee
  LEFT JOIN hr.shift shift ON shift.id = employee.shift_id
  WHERE employee.id = p_employee_id;
$$;
