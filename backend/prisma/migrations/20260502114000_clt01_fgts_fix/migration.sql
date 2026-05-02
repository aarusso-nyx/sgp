CREATE OR REPLACE FUNCTION payment.sgp_fgts_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  tenant_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_before := OLD;
    before_json := to_jsonb(row_before);
    after_json := NULL::jsonb;
    tenant_id := row_before.tenant_id;
  ELSIF TG_OP = 'INSERT' THEN
    row_after := NEW;
    before_json := NULL::jsonb;
    after_json := to_jsonb(row_after);
    tenant_id := row_after.tenant_id;
  ELSE
    row_before := OLD;
    row_after := NEW;
    before_json := to_jsonb(row_before);
    after_json := to_jsonb(row_after);
    tenant_id := row_after.tenant_id;
  END IF;

  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(
    after_json ->> 'fgts_movement_id',
    before_json ->> 'fgts_movement_id',
    after_json ->> 'fgts_account_id',
    before_json ->> 'fgts_account_id'
  );

  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

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
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_row record;
  v_account_id uuid;
  v_movement_id uuid;
  v_base_rubrica_id uuid;
  v_base_amount numeric(14,2);
  v_amount numeric(14,2);
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

  FOR v_row IN
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
  LOOP
    INSERT INTO payment.fgts_account (
      tenant_id,
      employee_id,
      employment_link_id,
      opened_at,
      status
    )
    VALUES (
      v_run.tenant_id,
      v_row.employee_id,
      v_row.employment_link_id,
      COALESCE(v_row.hired_on, v_competence),
      'ACTIVE'
    )
    ON CONFLICT ON CONSTRAINT fgts_account_employee_link_uq DO UPDATE
    SET status = 'ACTIVE',
        closed_at = NULL,
        updated_at = now()
    RETURNING payment.fgts_account.fgts_account_id INTO v_account_id;

    IF v_base_rubrica_id IS NOT NULL THEN
      v_base_amount := payroll_calc.evaluate_earning_deduction(
        v_base_rubrica_id,
        v_row.employee_id,
        v_run.competence_month,
        v_run.competence_year
      );
    ELSE
      v_base_amount := COALESCE(v_row.total_earnings, 0)::numeric(14,2);
    END IF;

    v_base_amount := round(COALESCE(v_base_amount, 0), 2)::numeric(14,2);
    v_amount := round(v_base_amount * 0.080000, 2)::numeric(14,2);

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
      'DEPOSIT_8',
      v_base_amount,
      0.080000,
      v_amount,
      p_payroll_run_id,
      'MONTHLY'
    )
    ON CONFLICT (tenant_id, fgts_account_id, competence, kind, source_event, payroll_run_id)
      WHERE payroll_run_id IS NOT NULL
    DO UPDATE
    SET base_amount = EXCLUDED.base_amount,
        rate = EXCLUDED.rate,
        amount = EXCLUDED.amount
    RETURNING payment.fgts_movement.fgts_movement_id INTO v_movement_id;

    fgts_account_id := v_account_id;
    fgts_movement_id := v_movement_id;
    employee_id := v_row.employee_id;
    base_amount := v_base_amount;
    amount := v_amount;
    RETURN NEXT;
  END LOOP;
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
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_employee hr.employee%ROWTYPE;
  v_link hr.employment_link%ROWTYPE;
  v_account_id uuid;
  v_movement_id uuid;
  v_base_amount numeric(14,2);
  v_amount numeric(14,2);
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
  ON CONFLICT ON CONSTRAINT fgts_account_employee_link_uq DO UPDATE
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

  v_amount := round(v_base_amount * 0.400000, 2)::numeric(14,2);

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
    v_amount,
    p_payroll_run_id,
    'TERMINATION'
  )
  ON CONFLICT (tenant_id, fgts_account_id, competence, kind, source_event, payroll_run_id)
    WHERE payroll_run_id IS NOT NULL
  DO UPDATE
  SET base_amount = EXCLUDED.base_amount,
      rate = EXCLUDED.rate,
      amount = EXCLUDED.amount
  RETURNING payment.fgts_movement.fgts_movement_id INTO v_movement_id;

  UPDATE payment.fgts_account
  SET status = 'CLOSED',
      closed_at = v_competence,
      updated_at = now()
  WHERE tenant_id = v_run.tenant_id
    AND fgts_account_id = v_account_id;

  fgts_account_id := v_account_id;
  fgts_movement_id := v_movement_id;
  employee_id := v_employee.id;
  base_amount := v_base_amount;
  amount := v_amount;
  RETURN NEXT;
END;
$$;
