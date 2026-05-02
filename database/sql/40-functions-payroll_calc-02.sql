CREATE FUNCTION payroll_calc.compute_rescisao(p_tenant_id uuid, p_employment_link_id uuid, p_termination_date date, p_cause text) RETURNS TABLE(item_code text, item_kind public."PayrollEntryKind", amount numeric, reference_value numeric, quantity numeric, metadata jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'payroll', 'payment', 'hr', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_employee hr.employee%ROWTYPE;
  v_link hr.employment_link%ROWTYPE;
  v_notice payment.prior_notice%ROWTYPE;
  v_base_rubrica_id uuid;
  v_base_amount numeric(14, 2);
  v_balance_salary numeric(14, 2);
  v_effective_end_date date;
  v_thirteenth_avos integer;
  v_thirteenth numeric(14, 2);
  v_service_months integer;
  v_vested_periods integer;
  v_proportional_avos integer;
  v_vested_vacation numeric(14, 2);
  v_vested_vacation_third numeric(14, 2);
  v_proportional_vacation numeric(14, 2);
  v_proportional_vacation_third numeric(14, 2);
  v_notice_amount numeric(14, 2) := 0;
  v_notice_deduction numeric(14, 2) := 0;
  v_rpps_base numeric(14, 2) := 0;
  v_rpps numeric(14, 2) := 0;
  v_irrf_base numeric(14, 2) := 0;
  v_irrf numeric(14, 2) := 0;
  v_gross numeric(14, 2) := 0;
  v_is_clt boolean;
  v_is_statutory boolean;
BEGIN
  SELECT *
  INTO v_link
  FROM hr.employment_link link
  WHERE link.id = p_employment_link_id
    AND link.tenant_id = p_tenant_id;

  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'Employment link % not found for tenant %', p_employment_link_id, p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee employee
  WHERE employee.tenant_id = p_tenant_id
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.terminated_on DESC NULLS LAST, employee.updated_at DESC
  LIMIT 1;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'No employee found for employment link %', p_employment_link_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_notice
  FROM payment.prior_notice notice
  WHERE notice.tenant_id = p_tenant_id
    AND notice.employment_link_id = p_employment_link_id;

  SELECT ped.id
  INTO v_base_rubrica_id
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.tenant_id = p_tenant_id
    AND ped.code = 'RESCISAO_BASE'
    AND ped.formula_ready = true
  LIMIT 1;

  IF v_base_rubrica_id IS NOT NULL THEN
    v_base_amount := payroll_calc.evaluate_earning_deduction(
      v_base_rubrica_id,
      v_employee.id,
      EXTRACT(MONTH FROM p_termination_date)::integer,
      EXTRACT(YEAR FROM p_termination_date)::integer
    );
  ELSE
    v_base_amount := round(payroll_calc.base_salary(v_employee.id, p_termination_date), 2)::numeric(14, 2);
  END IF;

  v_is_clt := lower(COALESCE(v_link.contract_type, '')) IN ('celetista', 'clt');
  v_is_statutory := lower(COALESCE(v_link.contract_type, '')) = 'statutory';
  v_effective_end_date := CASE
    WHEN v_is_clt
     AND v_notice.kind = 'INDEMNIFIED'::payment.prior_notice_kind
     AND upper(COALESCE(p_cause, '')) = 'SEM_JUSTA_CAUSA'
      THEN COALESCE(v_notice.projected_end_date, p_termination_date)
    ELSE p_termination_date
  END;

  v_balance_salary := round(COALESCE(v_base_amount, 0) / 30 * EXTRACT(DAY FROM p_termination_date), 2)::numeric(14, 2);
  v_thirteenth_avos := payroll_calc.termination_avos(v_employee.hired_on, v_effective_end_date, EXTRACT(YEAR FROM v_effective_end_date)::integer);
  v_thirteenth := round(COALESCE(v_base_amount, 0) * v_thirteenth_avos / 12, 2)::numeric(14, 2);
  v_service_months := GREATEST(
    (EXTRACT(YEAR FROM age(v_effective_end_date, COALESCE(v_employee.hired_on, v_effective_end_date)))::integer * 12)
      + EXTRACT(MONTH FROM age(v_effective_end_date, COALESCE(v_employee.hired_on, v_effective_end_date)))::integer,
    0
  );
  v_vested_periods := floor(v_service_months / 12)::integer;
  v_proportional_avos := LEAST(mod(v_service_months, 12) + CASE WHEN EXTRACT(DAY FROM v_effective_end_date) >= 15 THEN 1 ELSE 0 END, 12);
  v_vested_vacation := round(COALESCE(v_base_amount, 0) * v_vested_periods, 2)::numeric(14, 2);
  v_vested_vacation_third := round(v_vested_vacation / 3, 2)::numeric(14, 2);
  v_proportional_vacation := round(COALESCE(v_base_amount, 0) * v_proportional_avos / 12, 2)::numeric(14, 2);
  v_proportional_vacation_third := round(v_proportional_vacation / 3, 2)::numeric(14, 2);

  IF v_is_clt
     AND v_notice.kind = 'INDEMNIFIED'::payment.prior_notice_kind
     AND upper(COALESCE(p_cause, '')) = 'SEM_JUSTA_CAUSA' THEN
    v_notice_amount := round(COALESCE(v_notice.base_amount, v_base_amount, 0) / 30 * v_notice.notice_days, 2)::numeric(14, 2);
  ELSIF v_is_clt
     AND v_notice.kind = 'INDEMNIFIED'::payment.prior_notice_kind
     AND upper(COALESCE(p_cause, '')) = 'PEDIDO_DEMISSAO' THEN
    v_notice_deduction := round(COALESCE(v_notice.base_amount, v_base_amount, 0) / 30 * v_notice.notice_days, 2)::numeric(14, 2);
  END IF;

  v_gross := round(
    v_balance_salary
    + v_thirteenth
    + v_vested_vacation
    + v_vested_vacation_third
    + v_proportional_vacation
    + v_proportional_vacation_third
    + v_notice_amount,
    2
  )::numeric(14, 2);

  IF v_is_statutory THEN
    v_rpps_base := round(v_balance_salary + v_thirteenth, 2)::numeric(14, 2);
    v_rpps := payroll_calc.compute_rpps(p_tenant_id, p_employment_link_id, v_rpps_base, p_termination_date);
  END IF;

  v_irrf_base := round(v_gross - v_rpps, 2)::numeric(14, 2);
  v_irrf := payroll_calc.compute_irrf(
    p_tenant_id,
    v_irrf_base,
    payroll_calc.dependent_count(v_employee.id)::integer,
    p_termination_date
  );

  item_code := 'RESC_SALDO';
  item_kind := 'EARNING'::public."PayrollEntryKind";
  amount := v_balance_salary;
  reference_value := v_base_amount;
  quantity := EXTRACT(DAY FROM p_termination_date);
  metadata := jsonb_build_object('origin', 'salary_balance', 'terminationDate', p_termination_date);
  RETURN NEXT;

  item_code := 'RESC_13_PROP';
  item_kind := 'EARNING'::public."PayrollEntryKind";
  amount := v_thirteenth;
  reference_value := v_base_amount;
  quantity := v_thirteenth_avos;
  metadata := jsonb_build_object('origin', 'thirteenth_proportional', 'avos', v_thirteenth_avos, 'projectedEndDate', v_effective_end_date);
  RETURN NEXT;

  IF v_vested_vacation > 0 THEN
    item_code := 'RESC_FERIAS_VENCIDAS';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_vested_vacation;
    reference_value := v_base_amount;
    quantity := v_vested_periods;
    metadata := jsonb_build_object('origin', 'vested_vacation', 'periods', v_vested_periods);
    RETURN NEXT;

    item_code := 'RESC_FERIAS_VENCIDAS_TERCO';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_vested_vacation_third;
    reference_value := v_vested_vacation;
    quantity := v_vested_periods;
    metadata := jsonb_build_object('origin', 'vested_vacation_one_third', 'periods', v_vested_periods);
    RETURN NEXT;
  END IF;

  IF v_proportional_vacation > 0 THEN
    item_code := 'RESC_FERIAS_PROP';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_proportional_vacation;
    reference_value := v_base_amount;
    quantity := v_proportional_avos;
    metadata := jsonb_build_object('origin', 'vacation_proportional', 'avos', v_proportional_avos, 'projectedEndDate', v_effective_end_date);
    RETURN NEXT;

    item_code := 'RESC_FERIAS_TERCO';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_proportional_vacation_third;
    reference_value := v_proportional_vacation;
    quantity := v_proportional_avos;
    metadata := jsonb_build_object('origin', 'vacation_proportional_one_third', 'avos', v_proportional_avos);
    RETURN NEXT;
  END IF;

  IF v_notice_amount > 0 THEN
    item_code := 'RESC_AVISO_PREVIO';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_notice_amount;
    reference_value := COALESCE(v_notice.base_amount, v_base_amount);
    quantity := v_notice.notice_days;
    metadata := jsonb_build_object('origin', 'indemnified_notice', 'kind', v_notice.kind, 'cause', p_cause, 'fgtsBase', true, 'projectedEndDate', v_notice.projected_end_date);
    RETURN NEXT;
  END IF;

  IF v_notice_deduction > 0 THEN
    item_code := 'RESC_AVISO_PREVIO_DESCONTO';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_notice_deduction;
    reference_value := COALESCE(v_notice.base_amount, v_base_amount);
    quantity := v_notice.notice_days;
    metadata := jsonb_build_object('origin', 'unworked_notice_discount', 'kind', v_notice.kind, 'cause', p_cause);
    RETURN NEXT;
  END IF;

  IF v_rpps > 0 THEN
    item_code := 'RPPS';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_rpps;
    reference_value := v_rpps_base;
    quantity := 1;
    metadata := jsonb_build_object('origin', 'statutory_rpps', 'regime', v_link.contract_type);
    RETURN NEXT;
  END IF;

  IF v_irrf > 0 THEN
    item_code := 'IRRF_RESCISAO';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_irrf;
    reference_value := v_irrf_base;
    quantity := 1;
    metadata := jsonb_build_object('origin', 'termination_exclusive_irrf', 'exclusiveTaxation', true);
    RETURN NEXT;
  END IF;
END;
$$;

CREATE FUNCTION payroll_calc.compute_rpps(p_tenant_id uuid, p_employment_link_id uuid, p_base_amount numeric, p_competence date) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_contract_type text;
  v_effective_base numeric;
  v_ceiling numeric;
  v_effective_start date;
  v_amount numeric := 0;
  v_slice numeric;
  v_upper numeric;
  v_original_tenant text;
  v_rate record;
BEGIN
  SELECT link.contract_type
  INTO v_contract_type
  FROM hr.employment_link link
  WHERE link.id = p_employment_link_id
    AND link.tenant_id = p_tenant_id;

  IF COALESCE(v_contract_type, '') <> 'statutory' THEN
    v_original_tenant := current_setting('app.current_tenant_id', true);
    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'CREATE', 'payroll.rpps', p_employment_link_id::text, NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'payroll_calc.compute_rpps',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object(
        'event', 'payroll.rpps.bypassed',
        'employmentLinkId', p_employment_link_id,
        'contractType', v_contract_type,
        'competence', p_competence
      ),
      NULL::text, NULL::text, NULL::text
    );
    PERFORM set_config('app.current_tenant_id', COALESCE(v_original_tenant, ''), true);
    RETURN 0.00;
  END IF;

  v_ceiling := COALESCE(payroll_calc.rpps_ceiling(p_tenant_id), 0);
  v_effective_base := greatest(COALESCE(p_base_amount, 0), 0);
  IF v_ceiling > 0 THEN
    v_effective_base := least(v_effective_base, v_ceiling);
  END IF;

  IF v_effective_base <= 0 THEN
    RETURN 0.00;
  END IF;

  SELECT max(rate.competence_start)
  INTO v_effective_start
  FROM public.tax_rate rate
  WHERE rate.tenant_id = p_tenant_id
    AND rate.kind = 'RPPS'
    AND rate.status = 'ACTIVE'::public."RecordStatus"
    AND rate.competence_start <= p_competence
    AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence);

  IF v_effective_start IS NULL THEN
    RETURN 0.00;
  END IF;

  FOR v_rate IN
    SELECT bracket_min, bracket_max, rate
    FROM public.tax_rate rate
    WHERE rate.tenant_id = p_tenant_id
      AND rate.kind = 'RPPS'
      AND rate.status = 'ACTIVE'::public."RecordStatus"
      AND rate.competence_start = v_effective_start
      AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence)
      AND rate.bracket_min <= v_effective_base
    ORDER BY rate.bracket_min ASC
  LOOP
    v_upper := least(v_effective_base, COALESCE(v_rate.bracket_max, v_effective_base));
    v_slice := greatest(v_upper - v_rate.bracket_min + 0.01, 0);
    IF v_rate.bracket_min = 0 THEN
      v_slice := greatest(v_upper, 0);
    END IF;
    v_amount := v_amount + (v_slice * COALESCE(v_rate.rate, 0) / 100);
  END LOOP;

  RETURN round(v_amount, 2)::numeric(14, 2);
END;
$$;

CREATE FUNCTION payroll_calc.compute_sexta_parte(p_tenant_id uuid, p_employment_link_id uuid, p_base_amount numeric, p_competence date) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'public', 'pg_catalog'
    AS $$
  SELECT CASE
    WHEN payroll_calc.service_time_years(p_tenant_id, p_employment_link_id, p_competence)
      >= payroll_calc.parameter_numeric(p_tenant_id, 'SEXTA_PARTE_SERVICE_YEARS', 25)
    THEN round(
      greatest(coalesce(p_base_amount, 0), 0)
      * payroll_calc.parameter_numeric(p_tenant_id, 'SEXTA_PARTE_FRACTION', 0.166666666667),
      2
    )::numeric(14, 2)
    ELSE 0.00::numeric(14, 2)
  END;
$$;

CREATE FUNCTION payroll_calc.compute_teto_redutor(p_tenant_id uuid, p_employment_link_id uuid, p_gross_subject numeric, p_competence date) RETURNS numeric
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_parameter_key text;
  v_ceiling numeric;
  v_subject numeric;
BEGIN
  v_parameter_key := payroll_calc.resolve_ceiling_parameter_key(
    p_tenant_id,
    p_employment_link_id
  );
  v_ceiling := payroll_calc.ceiling_parameter_amount(p_tenant_id, v_parameter_key);
  v_subject := greatest(coalesce(p_gross_subject, 0), 0);

  RETURN greatest(round(v_subject - v_ceiling, 2), 0)::numeric(14, 2);
END;
$$;

CREATE FUNCTION payroll_calc.compute_trienio(p_tenant_id uuid, p_employment_link_id uuid, p_base_amount numeric, p_competence date) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'public', 'pg_catalog'
    AS $$
  SELECT round(
    greatest(coalesce(p_base_amount, 0), 0)
    * floor(payroll_calc.service_time_years(p_tenant_id, p_employment_link_id, p_competence) / 3.0)
    * payroll_calc.parameter_numeric(p_tenant_id, 'TRIENIO_PERCENT_PER_PERIOD', 3.000000)
    / 100,
    2
  )::numeric(14, 2);
$$;

CREATE FUNCTION payroll_calc.days_in_month(p_year integer, p_month integer) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT EXTRACT(DAY FROM (date_trunc('month', make_date(p_year, p_month, 1)) + INTERVAL '1 month - 1 day'))::integer;
$$;

CREATE FUNCTION payroll_calc.dependent_count(p_employee_id uuid) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT count(*)::numeric
  FROM hr.employee_dependent dependent
  WHERE dependent.employee_id = p_employee_id
    AND dependent.income_tax_dependent = true;
$$;

CREATE FUNCTION payroll_calc.evaluate_earning_deduction(p_earning_deduction_id uuid, p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_function_name text;
  v_amount numeric;
BEGIN
  SELECT ped.formula_function_name
  INTO v_function_name
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.id = p_earning_deduction_id
    AND ped.formula_ready = true;

  IF v_function_name IS NULL THEN
    RAISE EXCEPTION 'Formula not ready for earning_deduction_id %', p_earning_deduction_id;
  END IF;

  EXECUTE format('SELECT %I.%I($1, $2, $3)', 'payroll_calc', v_function_name)
    USING p_employee_id, p_month, p_year
    INTO v_amount;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Formula % returned NULL for earning_deduction_id %', v_function_name, p_earning_deduction_id;
  END IF;

  RETURN round(v_amount, 2)::numeric(14, 2);
END;
$_$;

CREATE FUNCTION payroll_calc.f_abono_permanencia(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
  SELECT payroll_calc.compute_abono_permanencia(
    employee.tenant_id,
    employee.employment_link_id,
    payroll_calc.base_rpps(employee.id, make_date(p_year, p_month, 1)),
    make_date(p_year, p_month, 1)
  )
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.f_ats(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
  SELECT payroll_calc.compute_ats(
    employee.tenant_id,
    employee.employment_link_id,
    payroll_calc.base_salary(employee.id, make_date(p_year, p_month, 1)),
    make_date(p_year, p_month, 1)
  )
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.f_decimo_terceiro_base(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
      SELECT payroll_calc.base_salary(p_employee_id, make_date(p_year, p_month, 1));
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_00b42f14(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_0373e1f8(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_0bbafa09(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_0e20910d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_17be3a2a(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_19895adb(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_1de2d1bb(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_1dfe75d9(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_1e70c40d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_1e794847(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_1e8640f2(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2035e5b3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_22127514(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_22513607(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_247b1777(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2623c9b6(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2676b1ff(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2822d383(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_29631135(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2b7d7a3e(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2b84dfd5(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2b970af0(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2bec73a6(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2c23fce5(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2de6a7ff(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2e6bcb3d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_2f6b979d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_304a85db(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_30b6b74c(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;
