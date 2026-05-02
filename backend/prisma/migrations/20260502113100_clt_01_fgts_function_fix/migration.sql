CREATE OR REPLACE FUNCTION payment.compute_fgts_monthly(p_payroll_run_id uuid)
RETURNS TABLE (
  fgts_account_id uuid,
  fgts_movement_id uuid,
  employee_id uuid,
  base_amount numeric(14,2),
  amount numeric(14,2)
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payment, payroll, payroll_calc, hr, public, pg_catalog
AS $$
#variable_conflict use_column
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_base_rubrica_id uuid;
  v_competence date;
BEGIN
  SELECT *
  INTO v_run
  FROM payroll.payroll_run
  WHERE id = p_payroll_run_id;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Payroll run % not found', p_payroll_run_id USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.sgp_bypass_rls()
     AND public.sgp_current_tenant_uuid() IS DISTINCT FROM v_run.tenant_id THEN
    RAISE EXCEPTION 'FGTS monthly calculation requires current tenant context %', v_run.tenant_id
      USING ERRCODE = '42501';
  END IF;

  v_competence := make_date(v_run.competence_year, v_run.competence_month, 1);

  SELECT ped.id
  INTO v_base_rubrica_id
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.tenant_id = v_run.tenant_id
    AND ped.code = 'FGTS_MONTHLY_BASE'
    AND ped.formula_ready = true
  LIMIT 1;

  RETURN QUERY
  WITH eligible AS (
    SELECT
      record.employee_id,
      employee.employment_link_id,
      employee.hired_on,
      record.total_earnings
    FROM payroll.payroll_financial_record record
    JOIN hr.employee employee
      ON employee.id = record.employee_id
     AND employee.tenant_id = record.tenant_id
    JOIN hr.employment_link link
      ON link.id = employee.employment_link_id
     AND link.tenant_id = employee.tenant_id
    WHERE record.tenant_id = v_run.tenant_id
      AND record.payroll_run_id = p_payroll_run_id
      AND lower(COALESCE(link.contract_type, '')) IN ('celetista', 'clt')
  ),
  accounts AS (
    INSERT INTO payment.fgts_account (
      tenant_id,
      employee_id,
      employment_link_id,
      opened_at,
      status
    )
    SELECT
      v_run.tenant_id,
      eligible.employee_id,
      eligible.employment_link_id,
      COALESCE(eligible.hired_on, v_competence),
      'ACTIVE'
    FROM eligible
    ON CONFLICT (tenant_id, employee_id, employment_link_id) DO UPDATE
    SET status = 'ACTIVE',
        closed_at = NULL,
        updated_at = now()
    RETURNING
      payment.fgts_account.fgts_account_id,
      payment.fgts_account.employee_id
  ),
  bases AS (
    SELECT
      accounts.fgts_account_id,
      accounts.employee_id,
      round(
        COALESCE(
          CASE
            WHEN v_base_rubrica_id IS NULL THEN eligible.total_earnings
            ELSE payroll_calc.evaluate_earning_deduction(
              v_base_rubrica_id,
              eligible.employee_id,
              v_run.competence_month,
              v_run.competence_year
            )
          END,
          0
        ),
        2
      )::numeric(14,2) AS base_amount
    FROM accounts
    JOIN eligible
      ON eligible.employee_id = accounts.employee_id
  ),
  upserted AS (
    INSERT INTO payment.fgts_movement (
      tenant_id,
      fgts_account_id,
      competence,
      kind,
      base_amount,
      rate,
      amount,
      payroll_run_id,
      source_event
    )
    SELECT
      v_run.tenant_id,
      bases.fgts_account_id,
      v_competence,
      'DEPOSIT_8',
      bases.base_amount,
      0.080000,
      round(bases.base_amount * 0.080000, 2)::numeric(14,2),
      p_payroll_run_id,
      'MONTHLY'
    FROM bases
    ON CONFLICT (tenant_id, fgts_account_id, competence, kind, source_event, payroll_run_id)
      WHERE payroll_run_id IS NOT NULL
    DO UPDATE
    SET base_amount = EXCLUDED.base_amount,
        rate = EXCLUDED.rate,
        amount = EXCLUDED.amount
    RETURNING
      payment.fgts_movement.fgts_account_id,
      payment.fgts_movement.fgts_movement_id,
      payment.fgts_movement.base_amount,
      payment.fgts_movement.amount
  )
  SELECT
    upserted.fgts_account_id,
    upserted.fgts_movement_id,
    bases.employee_id,
    upserted.base_amount,
    upserted.amount
  FROM upserted
  JOIN bases
    ON bases.fgts_account_id = upserted.fgts_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION payment.compute_fgts_termination_fine(
  p_payroll_run_id uuid,
  p_employment_link_id uuid,
  p_cause text
)
RETURNS TABLE (
  fgts_account_id uuid,
  fgts_movement_id uuid,
  employee_id uuid,
  base_amount numeric(14,2),
  amount numeric(14,2)
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payment, payroll, hr, public, pg_catalog
AS $$
#variable_conflict use_column
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_employee hr.employee%ROWTYPE;
  v_link hr.employment_link%ROWTYPE;
  v_account_id uuid;
  v_base_amount numeric(14,2);
  v_competence date;
  v_cause text;
BEGIN
  SELECT *
  INTO v_run
  FROM payroll.payroll_run
  WHERE id = p_payroll_run_id;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Payroll run % not found', p_payroll_run_id USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.sgp_bypass_rls()
     AND public.sgp_current_tenant_uuid() IS DISTINCT FROM v_run.tenant_id THEN
    RAISE EXCEPTION 'FGTS termination calculation requires current tenant context %', v_run.tenant_id
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_link
  FROM hr.employment_link link
  WHERE link.id = p_employment_link_id
    AND link.tenant_id = v_run.tenant_id;

  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'Employment link % not found for tenant %', p_employment_link_id, v_run.tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee employee
  WHERE employee.tenant_id = v_run.tenant_id
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.terminated_on DESC NULLS LAST, employee.updated_at DESC
  LIMIT 1;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'No employee found for employment link %', p_employment_link_id
      USING ERRCODE = 'P0002';
  END IF;

  v_cause := upper(COALESCE(p_cause, ''));
  IF lower(COALESCE(v_link.contract_type, '')) NOT IN ('celetista', 'clt')
     OR v_cause NOT IN ('WITHOUT_CAUSE', 'SEM_JUSTA_CAUSA', 'EMPLOYER_EXTINCTION', 'EXTINCAO_EMPREGADOR') THEN
    RETURN;
  END IF;

  v_competence := make_date(v_run.competence_year, v_run.competence_month, 1);

  INSERT INTO payment.fgts_account (
    tenant_id,
    employee_id,
    employment_link_id,
    opened_at,
    status
  )
  VALUES (
    v_run.tenant_id,
    v_employee.id,
    p_employment_link_id,
    COALESCE(v_employee.hired_on, v_competence),
    'ACTIVE'
  )
  ON CONFLICT (tenant_id, employee_id, employment_link_id) DO UPDATE
  SET status = 'ACTIVE',
      closed_at = NULL,
      updated_at = now()
  RETURNING payment.fgts_account.fgts_account_id INTO v_account_id;

  SELECT COALESCE(balance.deposit_balance, 0)::numeric(14,2)
  INTO v_base_amount
  FROM payment.v_fgts_balance balance
  WHERE balance.tenant_id = v_run.tenant_id
    AND balance.fgts_account_id = v_account_id;

  v_base_amount := round(COALESCE(v_base_amount, 0), 2)::numeric(14,2);
  IF v_base_amount <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH upserted AS (
    INSERT INTO payment.fgts_movement (
      tenant_id,
      fgts_account_id,
      competence,
      kind,
      base_amount,
      rate,
      amount,
      payroll_run_id,
      source_event
    )
    VALUES (
      v_run.tenant_id,
      v_account_id,
      v_competence,
      'RESCISION_FINE_40',
      v_base_amount,
      0.400000,
      round(v_base_amount * 0.400000, 2)::numeric(14,2),
      p_payroll_run_id,
      'TERMINATION'
    )
    ON CONFLICT (tenant_id, fgts_account_id, competence, kind, source_event, payroll_run_id)
      WHERE payroll_run_id IS NOT NULL
    DO UPDATE
    SET base_amount = EXCLUDED.base_amount,
        rate = EXCLUDED.rate,
        amount = EXCLUDED.amount
    RETURNING
      payment.fgts_movement.fgts_account_id,
      payment.fgts_movement.fgts_movement_id,
      payment.fgts_movement.base_amount,
      payment.fgts_movement.amount
  ),
  closed_account AS (
    UPDATE payment.fgts_account
    SET status = 'CLOSED',
        closed_at = v_competence,
        updated_at = now()
    WHERE payment.fgts_account.tenant_id = v_run.tenant_id
      AND payment.fgts_account.fgts_account_id = v_account_id
    RETURNING payment.fgts_account.fgts_account_id
  )
  SELECT
    upserted.fgts_account_id,
    upserted.fgts_movement_id,
    v_employee.id,
    upserted.base_amount,
    upserted.amount
  FROM upserted
  JOIN closed_account
    ON closed_account.fgts_account_id = upserted.fgts_account_id;
END;
$$;
