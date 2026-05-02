CREATE FUNCTION payment.compute_fgts_monthly(p_payroll_run_id uuid) RETURNS TABLE(fgts_account_id uuid, fgts_movement_id uuid, employee_id uuid, base_amount numeric, amount numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payment', 'payroll', 'payroll_calc', 'hr', 'public', 'pg_catalog'
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

CREATE FUNCTION payment.compute_fgts_termination_fine(p_payroll_run_id uuid, p_employment_link_id uuid, p_cause text) RETURNS TABLE(fgts_account_id uuid, fgts_movement_id uuid, employee_id uuid, base_amount numeric, amount numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payment', 'payroll', 'hr', 'public', 'pg_catalog'
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

CREATE FUNCTION payment.compute_prior_notice(p_employment_link_id uuid, p_termination_date date, p_kind payment.prior_notice_kind, p_reduction_mode payment.prior_notice_reduction_mode DEFAULT 'NONE'::payment.prior_notice_reduction_mode) RETURNS TABLE(notice_days integer, projected_end_date date, base_amount numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payment', 'payroll_calc', 'payroll', 'hr', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_tenant_id uuid := public.sgp_current_tenant_uuid();
  v_link hr.employment_link%ROWTYPE;
  v_employee hr.employee%ROWTYPE;
  v_kind payment.prior_notice_kind := COALESCE(p_kind, 'NONE'::payment.prior_notice_kind);
  v_notice_days integer := 0;
  v_projected_end date;
  v_base numeric(14,2) := 0;
BEGIN
  SELECT *
  INTO v_link
  FROM hr.employment_link link
  WHERE link.tenant_id = v_tenant_id
    AND link.id = p_employment_link_id;

  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'Employment link % not found for tenant %', p_employment_link_id, v_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee employee
  WHERE employee.tenant_id = v_tenant_id
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.updated_at DESC
  LIMIT 1;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'No employee found for employment link %', p_employment_link_id
      USING ERRCODE = 'P0002';
  END IF;

  IF lower(COALESCE(v_link.contract_type, '')) NOT IN ('celetista', 'clt') THEN
    DELETE FROM payment.prior_notice notice
    WHERE notice.tenant_id = v_tenant_id
      AND notice.employment_link_id = p_employment_link_id;
    notice_days := 0;
    projected_end_date := p_termination_date;
    base_amount := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_kind <> 'NONE'::payment.prior_notice_kind THEN
    v_notice_days := payment.compute_prior_notice_days(p_employment_link_id, p_termination_date);
    v_base := round(payroll_calc.base_salary(v_employee.id, p_termination_date), 2)::numeric(14,2);
  END IF;

  v_projected_end := CASE
    WHEN v_kind = 'INDEMNIFIED'::payment.prior_notice_kind THEN p_termination_date + GREATEST(v_notice_days - 1, 0)
    WHEN v_kind = 'WORKED'::payment.prior_notice_kind THEN p_termination_date
    ELSE p_termination_date
  END;

  INSERT INTO payment.prior_notice (
    tenant_id,
    employment_link_id,
    kind,
    notice_days,
    projected_end_date,
    base_amount,
    reduction_mode
  )
  VALUES (
    v_tenant_id,
    p_employment_link_id,
    v_kind,
    v_notice_days,
    v_projected_end,
    v_base,
    COALESCE(p_reduction_mode, 'NONE'::payment.prior_notice_reduction_mode)
  )
  ON CONFLICT (tenant_id, employment_link_id) DO UPDATE
  SET kind = EXCLUDED.kind,
      notice_days = EXCLUDED.notice_days,
      projected_end_date = EXCLUDED.projected_end_date,
      base_amount = EXCLUDED.base_amount,
      reduction_mode = EXCLUDED.reduction_mode,
      created_at = now();

  notice_days := v_notice_days;
  projected_end_date := v_projected_end;
  base_amount := v_base;
  RETURN NEXT;
END;
$$;

CREATE FUNCTION payment.compute_prior_notice_days(p_employment_link_id uuid, p_termination_date date) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'payment', 'hr', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_hired_on date;
  v_full_years integer;
BEGIN
  SELECT employee.hired_on
  INTO v_hired_on
  FROM hr.employee employee
  WHERE employee.tenant_id = public.sgp_current_tenant_uuid()
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.updated_at DESC
  LIMIT 1;

  IF v_hired_on IS NULL OR p_termination_date IS NULL THEN
    RETURN 0;
  END IF;

  v_full_years := GREATEST(EXTRACT(YEAR FROM age(p_termination_date, v_hired_on))::integer, 0);
  RETURN LEAST(90, 30 + (v_full_years * 3));
END;
$$;

CREATE FUNCTION payment.pis_pasep_includes_rubric(p_incidences jsonb, p_kind text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN lower(COALESCE(p_incidences->>'codIncPisPasep', p_incidences->>'cod_inc_pis_pasep', '')) IN ('00', '0', 'none', 'false', 'nao', 'nao_base') THEN false
    WHEN lower(COALESCE(p_incidences->>'pisPasep', p_incidences->>'pis_pasep', p_incidences->>'pis_pasep_base', '')) IN ('false', '0', 'none', 'nao', 'nao_base') THEN false
    WHEN lower(COALESCE(p_incidences->>'codIncPisPasep', p_incidences->>'cod_inc_pis_pasep', '')) IN ('11', '12', 'base', 'monthly', 'mensal') THEN true
    WHEN lower(COALESCE(p_incidences->>'pisPasep', p_incidences->>'pis_pasep', p_incidences->>'pis_pasep_base', '')) IN ('true', '1', 'base', 'monthly', 'mensal') THEN true
    ELSE p_kind IN ('EARNING', 'BASE')
  END;
$$;

CREATE FUNCTION payment.recompute_pis_pasep_base(p_tenant_id uuid, p_employee_id uuid, p_year_base integer) RETURNS payment.pis_pasep_base_year
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payment', 'payroll', 'esocial', 'hr', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_employee hr.employee%ROWTYPE;
  v_contract_type text;
  v_program payment.pis_pasep_program;
  v_monthly jsonb;
  v_total numeric(14,2);
  v_result payment.pis_pasep_base_year%ROWTYPE;
BEGIN
  IF p_year_base < 2000 OR p_year_base > 2100 THEN
    RAISE EXCEPTION 'Invalid PIS/PASEP base year %', p_year_base USING ERRCODE = '22023';
  END IF;

  IF NOT public.sgp_bypass_rls()
     AND public.sgp_current_tenant_uuid() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'PIS/PASEP recompute requires current tenant context %', p_tenant_id
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee employee
  WHERE employee.tenant_id = p_tenant_id
    AND employee.id = p_employee_id;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'Employee % not found for tenant %', p_employee_id, p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT lower(COALESCE(link.contract_type, 'statutory'))
  INTO v_contract_type
  FROM hr.employment_link link
  WHERE link.tenant_id = p_tenant_id
    AND link.id = v_employee.employment_link_id
  LIMIT 1;

  v_program := CASE
    WHEN COALESCE(v_contract_type, '') IN ('celetista', 'clt') THEN 'PIS'::payment.pis_pasep_program
    ELSE 'PASEP'::payment.pis_pasep_program
  END;

  WITH months(month_no, month_key) AS (
    SELECT generate_series(1, 12), lpad(generate_series(1, 12)::text, 2, '0')
  ),
  monthly AS (
    SELECT
      months.month_key,
      round(COALESCE(sum(
        CASE
          WHEN payment.pis_pasep_includes_rubric(earning.incidences, earning.kind::text)
            THEN abs(item.amount)
          ELSE 0
        END
      ), 0), 2)::numeric(14,2) AS amount
    FROM months
    LEFT JOIN payroll.payroll_run run
      ON run.tenant_id = p_tenant_id
     AND run.competence_year = p_year_base
     AND run.competence_month = months.month_no
    LEFT JOIN esocial.s1200_emission_state state
      ON state.tenant_id = run.tenant_id
     AND state.payroll_run_id = run.id
     AND state.employee_id = p_employee_id
    LEFT JOIN public.esocial_event event
      ON event.tenant_id = run.tenant_id
     AND event.payroll_run_id = run.id
     AND event.event_type = 'S-1200'
     AND event.payload->>'employeeId' = p_employee_id::text
     AND event.status <> 'EXCLUIDO'::public."ESocialEventStatus"
    LEFT JOIN payroll.employee_payroll_item item
      ON item.tenant_id = run.tenant_id
     AND item.payroll_run_id = run.id
     AND item.employee_id = p_employee_id
     AND item.deleted_at IS NULL
     AND state.employee_id IS NOT NULL
     AND event.id IS NOT NULL
    LEFT JOIN payroll.payroll_earning_deduction earning
      ON earning.tenant_id = item.tenant_id
     AND earning.id = item.earning_deduction_id
    GROUP BY months.month_no, months.month_key
  )
  SELECT
    jsonb_object_agg(month_key, amount ORDER BY month_key),
    COALESCE(sum(amount), 0)::numeric(14,2)
  INTO v_monthly, v_total
  FROM monthly;

  INSERT INTO payment.pis_pasep_base_year (
    tenant_id,
    employee_id,
    year_base,
    program,
    monthly_base,
    total_base,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_employee_id,
    p_year_base,
    v_program,
    v_monthly,
    v_total,
    now()
  )
  ON CONFLICT (tenant_id, employee_id, year_base) DO UPDATE
  SET program = EXCLUDED.program,
      monthly_base = EXCLUDED.monthly_base,
      total_base = EXCLUDED.total_base,
      updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE FUNCTION payment.sgp_consignment_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  audit_action text;
  resource_id text;
  after_json jsonb;
  before_json jsonb;
BEGIN
  row_after := NEW;
  row_before := OLD;
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  resource_id := COALESCE(
    after_json ->> 'loan_id',
    before_json ->> 'loan_id',
    after_json ->> 'consignment_entity_id',
    before_json ->> 'consignment_entity_id'
  );
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
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

CREATE FUNCTION payment.sgp_consignment_portability_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  audit_action text;
  resource_id text;
BEGIN
  row_after := NEW;
  row_before := OLD;
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(
    to_jsonb(row_after) ->> 'file_id',
    to_jsonb(row_before) ->> 'file_id'
  );
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', to_jsonb(row_before), 'after', to_jsonb(row_after)),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION payment.sgp_fgts_audit() RETURNS trigger
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

CREATE FUNCTION payment.sgp_fgts_remittance_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  row_tenant_id uuid;
BEGIN
  before_json := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL::jsonb END;
  after_json := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL::jsonb END;
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  row_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  resource_id := COALESCE(
    after_json ->> 'id',
    before_json ->> 'id',
    after_json ->> 'fgts_remittance_id',
    before_json ->> 'fgts_remittance_id'
  );

  PERFORM set_config('app.current_tenant_id', row_tenant_id::text, true);
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

CREATE FUNCTION payment.sgp_pis_pasep_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  tenant_id uuid;
  resource_id text;
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
  resource_id := COALESCE(after_json ->> 'employee_id', before_json ->> 'employee_id')
    || ':' || COALESCE(after_json ->> 'year_base', before_json ->> 'year_base');

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

CREATE FUNCTION payment.sgp_prior_notice_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  v_tenant_id uuid;
BEGIN
  after_json := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  before_json := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);

  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    'payment.prior_notice',
    COALESCE(after_json ->> 'employment_link_id', before_json ->> 'employment_link_id'),
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'payment.prior_notice',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION payment.sgp_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
