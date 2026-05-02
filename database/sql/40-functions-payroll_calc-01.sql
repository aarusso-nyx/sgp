CREATE FUNCTION payroll_calc.absence_days(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE((
    SELECT ef.absence_days
    FROM hr.employee_frequency ef
    WHERE ef.employee_id = p_employee_id
      AND ef.month = p_month
      AND ef.year = p_year
  ), 0);
$$;

CREATE FUNCTION payroll_calc.allow_negative_net(p_tenant_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN jsonb_typeof(parameter.value) = 'boolean'
        THEN (parameter.value #>> '{}')::boolean
      WHEN lower(COALESCE(parameter.value->>'value', parameter.value#>>'{}')) IN ('true', 't', 'yes', 'y', '1')
        THEN true
      ELSE false
    END
    FROM public.system_parameter parameter
    WHERE parameter.tenant_id = p_tenant_id
      AND parameter.key = 'ALLOW_NEGATIVE_NET'
    ORDER BY parameter.updated_at DESC
    LIMIT 1
  ), false);
$$;

CREATE FUNCTION payroll_calc.base_irrf(p_employee_id uuid, p_competence date) RETURNS numeric
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
  v_override numeric;
  v_amount numeric;
BEGIN
  IF to_regclass('pg_temp.payroll_simulation_employee_override') IS NOT NULL THEN
    EXECUTE
      'SELECT base_salary FROM pg_temp.payroll_simulation_employee_override WHERE employee_id = $1 AND base_salary IS NOT NULL'
      USING p_employee_id
      INTO v_override;
    IF v_override IS NOT NULL THEN
      RETURN v_override;
    END IF;
  END IF;

  SELECT
    COALESCE(sum(CASE WHEN ped.kind = 'EARNING'::public."PayrollEntryKind" AND ped.taxable THEN item.amount ELSE 0 END), 0)
    - COALESCE(sum(CASE WHEN ped.kind = 'DEDUCTION'::public."PayrollEntryKind" AND (ped.code IN ('RPPS', 'RGPS', 'INSS') OR ped.incidences ? 'official_social_security') THEN item.amount ELSE 0 END), 0)
  INTO v_amount
  FROM payroll.employee_payroll_item item
  JOIN payroll.payroll_earning_deduction ped ON ped.id = item.earning_deduction_id
  WHERE item.employee_id = p_employee_id
    AND item.competence_year = EXTRACT(YEAR FROM p_competence)::integer
    AND item.competence_month = EXTRACT(MONTH FROM p_competence)::integer
    AND ped.code <> 'IRRF';

  IF COALESCE(v_amount, 0) > 0 THEN
    RETURN v_amount;
  END IF;

  RETURN payroll_calc.base_salary(p_employee_id, p_competence);
END;
$_$;

CREATE FUNCTION payroll_calc.base_rpps(p_employee_id uuid, p_competence date) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
  WITH item_base AS (
    SELECT COALESCE(sum(CASE
      WHEN ped.kind = 'EARNING'::public."PayrollEntryKind"
        AND (ped.incidences ? 'rpps' OR ped.incidences ? 'official_social_security')
      THEN item.amount ELSE 0 END), 0) AS amount
    FROM payroll.employee_payroll_item item
    JOIN payroll.payroll_earning_deduction ped ON ped.id = item.earning_deduction_id
    WHERE item.employee_id = p_employee_id
      AND item.competence_year = EXTRACT(YEAR FROM p_competence)::integer
      AND item.competence_month = EXTRACT(MONTH FROM p_competence)::integer
  )
  SELECT CASE
    WHEN item_base.amount > 0 THEN item_base.amount
    ELSE payroll_calc.base_salary(p_employee_id, p_competence)
  END
  FROM item_base;
$$;

CREATE FUNCTION payroll_calc.base_salary(p_employee_id uuid) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(sr.amount, 0)
  FROM hr.employee e
  LEFT JOIN hr.salary_reference sr ON sr.id = e.salary_reference_id
  WHERE e.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.base_salary(p_employee_id uuid, p_competence date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    CASE
      WHEN srl.id IS NOT NULL THEN avaliacao.fn_get_vencimento_vigente(srl.id, p_competence)
      ELSE NULL
    END,
    sr.amount,
    0
  )
  FROM hr.employee e
  LEFT JOIN hr.salary_reference sr ON sr.id = e.salary_reference_id
  LEFT JOIN hr.job_position jp ON jp.id = e.job_position_id
  LEFT JOIN hr.salary_range_level srl ON srl.salary_range_id = jp.salary_range_id
  WHERE e.id = p_employee_id
  ORDER BY srl.class_number, srl.level_number_fol02
  LIMIT 1;
$$;

CREATE FUNCTION payroll_calc.base_teto_remuneratorio(p_employee_id uuid, p_competence date) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  WITH item_base AS (
    SELECT COALESCE(sum(CASE
      WHEN ped.kind = 'EARNING'::public."PayrollEntryKind"
        AND ped.subject_to_ceiling
      THEN item.amount ELSE 0 END), 0) AS amount
    FROM payroll.employee_payroll_item item
    JOIN payroll.payroll_earning_deduction ped ON ped.id = item.earning_deduction_id
    WHERE item.employee_id = p_employee_id
      AND item.competence_year = EXTRACT(YEAR FROM p_competence)::integer
      AND item.competence_month = EXTRACT(MONTH FROM p_competence)::integer
      AND ped.code <> 'DESCONTO_TETO'
  )
  SELECT CASE
    WHEN item_base.amount > 0 THEN item_base.amount
    ELSE payroll_calc.base_salary(p_employee_id, p_competence)
  END
  FROM item_base;
$$;

CREATE FUNCTION payroll_calc.ceiling_parameter_amount(p_tenant_id uuid, p_key text) RETURNS numeric
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_value jsonb;
  v_amount numeric;
BEGIN
  SELECT parameter.value
  INTO v_value
  FROM public.system_parameter parameter
  WHERE parameter.tenant_id = p_tenant_id
    AND parameter.key = p_key
  LIMIT 1;

  IF v_value IS NULL
    OR v_value = 'null'::jsonb
    OR jsonb_typeof(v_value) = 'null'
    OR NULLIF(v_value->>'amount', '') IS NULL
  THEN
    RAISE EXCEPTION 'Required remuneration ceiling parameter % is not configured for tenant %', p_key, p_tenant_id
      USING ERRCODE = 'P0001';
  END IF;

  v_amount := NULLIF(v_value->>'amount', '')::numeric;
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Required remuneration ceiling parameter % must be greater than zero for tenant %', p_key, p_tenant_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_amount;
END;
$$;

CREATE FUNCTION payroll_calc.compile_formula(p_expression text, p_dependencies text[] DEFAULT ARRAY[]::text[]) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_tokens text[] := ARRAY[]::text[];
  v_aliases text[] := ARRAY[]::text[];
  v_invalid_tokens text[] := ARRAY[]::text[];
  v_builtin_fns text[] := ARRAY['abs', 'ceil', 'floor', 'sqrt', 'round', 'make_date'];
  v_core_fns text[] := ARRAY['base_salary', 'workload_hours', 'dependent_count', 'service_years', 'days_in_month', 'worked_days', 'absence_days', 'proportional_ratio'];
BEGIN
  IF p_expression IS NULL OR btrim(p_expression) = '' THEN
    RETURN jsonb_build_object(
      'ready', false,
      'error', 'Formula expression is required',
      'dependencies', ARRAY[]::text[]
    );
  END IF;

  IF p_expression LIKE '%;%' OR p_expression ILIKE '%--%' THEN
    RETURN jsonb_build_object(
      'ready', false,
      'error', 'Unsafe token detected in formula expression',
      'dependencies', ARRAY[]::text[]
    );
  END IF;

  SELECT array_agg(ped.formula_alias)
  INTO v_aliases
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.formula_alias IS NOT NULL;
  v_aliases := coalesce(v_aliases, ARRAY[]::text[]);

  SELECT array_agg(DISTINCT m[1])
  INTO v_tokens
  FROM regexp_matches(p_expression, '([A-Za-z_][A-Za-z0-9_]*)\s*\(', 'g') AS m;
  v_tokens := coalesce(v_tokens, ARRAY[]::text[]);

  SELECT array_agg(token)
  INTO v_invalid_tokens
  FROM unnest(v_tokens) AS token
  WHERE NOT (token = ANY(v_aliases || v_core_fns || v_builtin_fns));
  v_invalid_tokens := coalesce(v_invalid_tokens, ARRAY[]::text[]);

  IF cardinality(v_invalid_tokens) > 0 THEN
    RETURN jsonb_build_object(
      'ready', false,
      'error', format('Invalid function token(s): %s', array_to_string(v_invalid_tokens, ', ')),
      'dependencies', ARRAY[]::text[]
    );
  END IF;

  RETURN jsonb_build_object(
    'ready', true,
    'error', NULL,
    'dependencies', (
      SELECT coalesce(array_agg(DISTINCT token), ARRAY[]::text[])
      FROM unnest(v_aliases) AS token
      WHERE token = ANY(v_tokens)
         OR token = ANY(coalesce(p_dependencies, ARRAY[]::text[]))
    )
  );
END;
$$;

CREATE FUNCTION payroll_calc.compile_formula_expression() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'payroll', 'hr', 'public', 'pg_catalog'
    AS $_$
DECLARE
  v_schema text := 'payroll_calc';
  v_function_name text;
  v_expression text;
  v_expression_compiled text;
  v_dependencies text[] := ARRAY[]::text[];
  v_aliases text[] := ARRAY[]::text[];
  v_tokens text[] := ARRAY[]::text[];
  v_token text;
  v_dep_function_name text;
  v_ddl text;
  v_smoke numeric;
  v_builtin_fns text[] := ARRAY['abs', 'ceil', 'floor', 'sqrt', 'round', 'make_date'];
  v_core_fns text[] := ARRAY['base_salary', 'workload_hours', 'dependent_count', 'service_years', 'days_in_month', 'worked_days', 'absence_days', 'proportional_ratio'];
BEGIN
  -- Keep metadata deterministic for rows without formula expressions.
  IF NEW.formula_expression IS NULL OR btrim(NEW.formula_expression) = '' THEN
    NEW.formula_ready := false;
    NEW.formula_dependencies := ARRAY[]::text[];
    NEW.formula_function_name := NULL;
    NEW.formula_function_ddl := NULL;
    NEW.formula_error := NULL;
    RETURN NEW;
  END IF;

  v_expression := NEW.formula_expression;
  NEW.formula_ready := false;
  NEW.formula_error := NULL;

  IF v_expression LIKE '%;%' OR v_expression ILIKE '%--%' THEN
    NEW.formula_error := 'Unsafe token detected in formula expression';
    RETURN NEW;
  END IF;

  IF NEW.formula_alias IS NULL OR btrim(NEW.formula_alias) = '' THEN
    NEW.formula_alias := lower(regexp_replace(coalesce(NEW.code, ''), '[^a-zA-Z0-9_]+', '_', 'g'));
  END IF;

  IF NEW.formula_alias IS NULL OR btrim(NEW.formula_alias) = '' THEN
    NEW.formula_error := 'Unable to derive formula alias';
    RETURN NEW;
  END IF;

  NEW.formula_alias := lower(regexp_replace(NEW.formula_alias, '[^a-zA-Z0-9_]+', '_', 'g'));
  v_function_name := format('f_%s', NEW.formula_alias);
  NEW.formula_function_name := v_function_name;
  IF TG_OP = 'UPDATE'
    AND (
      OLD.formula_expression IS DISTINCT FROM NEW.formula_expression
      OR OLD.formula_alias IS DISTINCT FROM NEW.formula_alias
    )
  THEN
    NEW.formula_version := COALESCE(OLD.formula_version, 0) + 1;
  ELSIF NEW.formula_version IS NULL OR NEW.formula_version < 1 THEN
    NEW.formula_version := 1;
  END IF;

  SELECT array_agg(ped.formula_alias)
  INTO v_aliases
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.formula_alias IS NOT NULL
    AND ped.id <> NEW.id;
  v_aliases := coalesce(v_aliases, ARRAY[]::text[]);

  SELECT array_agg(DISTINCT m[1])
  INTO v_tokens
  FROM regexp_matches(v_expression, '([A-Za-z_][A-Za-z0-9_]*)\s*\(', 'g') AS m;
  v_tokens := coalesce(v_tokens, ARRAY[]::text[]);

  IF NOT (v_tokens <@ (v_aliases || v_core_fns || v_builtin_fns)) THEN
    NEW.formula_error := format('Invalid function token in expression: %s', v_expression);
    RETURN NEW;
  END IF;

  SELECT array_agg(alias_token)
  INTO v_dependencies
  FROM unnest(v_aliases) AS alias_token
  WHERE alias_token = ANY(v_tokens);
  v_dependencies := coalesce(v_dependencies, ARRAY[]::text[]);

  IF cardinality(v_dependencies) > 0 THEN
    PERFORM 1
    FROM (
      WITH RECURSIVE walk(alias_name) AS (
        SELECT unnest(v_dependencies)
        UNION ALL
        SELECT unnest(coalesce(ped.formula_dependencies, ARRAY[]::text[]))
        FROM payroll.payroll_earning_deduction ped
        JOIN walk w ON ped.formula_alias = w.alias_name
      )
      SELECT alias_name FROM walk
    ) AS cycle_check
    WHERE cycle_check.alias_name = NEW.formula_alias
    LIMIT 1;

    IF FOUND THEN
      NEW.formula_error := format('Circular dependency detected for alias %s', NEW.formula_alias);
      RETURN NEW;
    END IF;
  END IF;

  v_expression_compiled := v_expression;

  FOREACH v_token IN ARRAY v_dependencies
  LOOP
    SELECT ped.formula_function_name
    INTO v_dep_function_name
    FROM payroll.payroll_earning_deduction ped
    WHERE ped.formula_alias = v_token;

    IF v_dep_function_name IS NULL THEN
      NEW.formula_error := format('Dependency %s is not compiled yet', v_token);
      RETURN NEW;
    END IF;

    v_expression_compiled := regexp_replace(
      v_expression_compiled,
      format('(\m%s)\s*\(\s*\)', v_token),
      format('%I.%I(p_employee_id, p_month, p_year)', v_schema, v_dep_function_name),
      'gi'
    );

    v_expression_compiled := regexp_replace(
      v_expression_compiled,
      format('(\m%s)\s*\(\s*([^,()]+)\s*,\s*([^()]+)\s*\)', v_token),
      format('%I.%I(p_employee_id, \2, \3)', v_schema, v_dep_function_name),
      'gi'
    );
  END LOOP;

  v_ddl := format($ddl$
    CREATE OR REPLACE FUNCTION %I.%I(
      p_employee_id uuid,
      p_month integer DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
      p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
    ) RETURNS numeric
    LANGUAGE plpgsql
    VOLATILE
    STRICT
    SECURITY DEFINER
    SET search_path = payroll_calc, hr, payroll, public, pg_catalog
    AS $fn$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := %s;
      RETURN v_result;
    END;
    $fn$;
  $ddl$, v_schema, v_function_name, v_expression_compiled);

  BEGIN
    EXECUTE v_ddl;
  EXCEPTION
    WHEN OTHERS THEN
      NEW.formula_error := format('Compile failure: %s', SQLERRM);
      NEW.formula_function_ddl := v_ddl;
      RETURN NEW;
  END;

  BEGIN
    EXECUTE format('SELECT %I.%I(NULL::uuid, 1, 2026)', v_schema, v_function_name) INTO v_smoke;
  EXCEPTION
    WHEN OTHERS THEN
      NEW.formula_error := format('Smoke test failure: %s', SQLERRM);
      EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(uuid, integer, integer) CASCADE', v_schema, v_function_name);
      RETURN NEW;
  END;

  NEW.formula_dependencies := v_dependencies;
  NEW.formula_function_ddl := v_ddl;
  NEW.formula_ready := true;
  RETURN NEW;
END;
$_$;

CREATE FUNCTION payroll_calc.compute_abono_permanencia(p_tenant_id uuid, p_employment_link_id uuid, p_base_amount numeric, p_competence date) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_active boolean;
  v_starts_on date;
BEGIN
  SELECT employee.abono_permanencia_ativo, employee.abono_permanencia_inicio
  INTO v_active, v_starts_on
  FROM hr.employee employee
  WHERE employee.tenant_id = p_tenant_id
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.created_at DESC
  LIMIT 1;

  IF NOT COALESCE(v_active, false) THEN
    RETURN 0.00;
  END IF;

  IF v_starts_on IS NOT NULL AND v_starts_on > p_competence THEN
    RETURN 0.00;
  END IF;

  RETURN payroll_calc.compute_rpps(
    p_tenant_id,
    p_employment_link_id,
    p_base_amount,
    p_competence
  );
END;
$$;

CREATE FUNCTION payroll_calc.compute_ats(p_tenant_id uuid, p_employment_link_id uuid, p_base_amount numeric, p_competence date) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'public', 'pg_catalog'
    AS $$
  SELECT round(
    greatest(coalesce(p_base_amount, 0), 0)
    * payroll_calc.service_time_years(p_tenant_id, p_employment_link_id, p_competence)
    * payroll_calc.parameter_numeric(p_tenant_id, 'ATS_PERCENT_PER_YEAR', 1.000000)
    / 100,
    2
  )::numeric(14, 2);
$$;

CREATE FUNCTION payroll_calc.compute_decimo_terceiro(p_tenant_id uuid, p_employment_link_id uuid, p_kind text, p_reference_year integer) RETURNS TABLE(avos integer, base numeric, installment_amount numeric, first_installment_discount numeric, irrf_amount numeric)
    LANGUAGE plpgsql
    SET search_path TO 'payroll_calc', 'payroll', 'hr', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_employee_id uuid;
  v_base_rubrica_id uuid;
  v_total numeric(14, 2);
BEGIN
  IF p_kind NOT IN ('DECIMO_TERCEIRO_ADIANTAMENTO', 'DECIMO_TERCEIRO_FECHAMENTO') THEN
    RAISE EXCEPTION 'Invalid decimo terceiro kind: %', p_kind;
  END IF;

  SELECT employee_id, COALESCE(v.avos, 0)
  INTO v_employee_id, avos
  FROM payroll_calc.v_decimo_terceiro_avos v
  WHERE v.tenant_id = p_tenant_id
    AND v.employment_link_id = p_employment_link_id
    AND v.reference_year = p_reference_year
  ORDER BY v.employee_id
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    SELECT employee.id
    INTO v_employee_id
    FROM hr.employee employee
    WHERE employee.tenant_id = p_tenant_id
      AND employee.employment_link_id = p_employment_link_id
    ORDER BY employee.created_at DESC
    LIMIT 1;
    avos := 0;
  END IF;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'No employee found for employment_link_id %', p_employment_link_id;
  END IF;

  SELECT ped.id
  INTO v_base_rubrica_id
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.tenant_id = p_tenant_id
    AND ped.code = 'DECIMO_TERCEIRO_BASE'
    AND ped.formula_ready = true
  LIMIT 1;

  IF v_base_rubrica_id IS NOT NULL THEN
    base := payroll_calc.evaluate_earning_deduction(v_base_rubrica_id, v_employee_id, 11, p_reference_year);
  ELSE
    base := round(payroll_calc.base_salary(v_employee_id, make_date(p_reference_year, 11, 1)), 2)::numeric(14, 2);
  END IF;

  v_total := round((COALESCE(base, 0) * LEAST(GREATEST(COALESCE(avos, 0), 0), 12) / 12), 2)::numeric(14, 2);

  SELECT COALESCE(sum(item.amount), 0)::numeric(14, 2)
  INTO first_installment_discount
  FROM payroll.employee_payroll_item item
  JOIN payroll.payroll_run run ON run.id = item.payroll_run_id
  JOIN payroll.processing_type processing_type ON processing_type.id = run.processing_type_id
  JOIN payroll.payroll_earning_deduction ped ON ped.id = item.earning_deduction_id
  WHERE item.tenant_id = p_tenant_id
    AND item.employee_id = v_employee_id
    AND item.competence_year = p_reference_year
    AND run.competence_year = p_reference_year
    AND processing_type.code = 'DECIMO_TERCEIRO_ADIANTAMENTO'
    AND ped.code = 'DECIMO_TERCEIRO_ADIANTAMENTO'
    AND run.status <> 'CANCELED'::public."PayrollRunStatus";

  IF p_kind = 'DECIMO_TERCEIRO_ADIANTAMENTO' THEN
    installment_amount := round(v_total / 2, 2)::numeric(14, 2);
    first_installment_discount := 0.00;
    irrf_amount := 0.00;
  ELSE
    irrf_amount := payroll_calc.compute_irrf(
      p_tenant_id,
      v_total,
      payroll_calc.dependent_count(v_employee_id)::integer,
      make_date(p_reference_year, 12, 1)
    );
    installment_amount := GREATEST(round(v_total - first_installment_discount, 2), 0)::numeric(14, 2);
  END IF;

  RETURN NEXT;
END;
$$;

CREATE FUNCTION payroll_calc.compute_ferias(p_tenant_id uuid, p_vacation_record_id uuid) RETURNS TABLE(item_code text, item_kind public."PayrollEntryKind", amount numeric, reference_value numeric, quantity numeric, metadata jsonb)
    LANGUAGE plpgsql
    SET search_path TO 'payroll_calc', 'payroll', 'hr', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_record hr.vacation_record%ROWTYPE;
  v_employee hr.employee%ROWTYPE;
  v_base_rubrica_id uuid;
  v_base_amount numeric(14, 2);
  v_daily_amount numeric;
  v_salary_amount numeric(14, 2);
  v_one_third_amount numeric(14, 2);
  v_bonus_amount numeric(14, 2);
  v_rpps_base numeric(14, 2);
  v_rpps_amount numeric(14, 2);
  v_irrf_base numeric(14, 2);
  v_irrf_amount numeric(14, 2);
  v_competence date;
BEGIN
  SELECT *
  INTO v_record
  FROM hr.vacation_record
  WHERE id = p_vacation_record_id
    AND tenant_id = p_tenant_id;

  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Vacation record % not found for tenant %', p_vacation_record_id, p_tenant_id;
  END IF;

  IF v_record.status = 'cancelado' THEN
    RAISE EXCEPTION 'Canceled vacation record % cannot be paid', p_vacation_record_id;
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee
  WHERE id = v_record.employee_id
    AND tenant_id = p_tenant_id;

  IF v_employee.id IS NULL OR v_employee.employment_link_id IS NULL THEN
    RAISE EXCEPTION 'Vacation employee % is not payroll-ready', v_record.employee_id;
  END IF;

  v_competence := date_trunc('month', v_record.starts_on)::date;

  SELECT ped.id
  INTO v_base_rubrica_id
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.tenant_id = p_tenant_id
    AND ped.code = 'VACATION_BASE'
    AND ped.formula_ready = true
  LIMIT 1;

  IF v_base_rubrica_id IS NOT NULL THEN
    v_base_amount := payroll_calc.evaluate_earning_deduction(
      v_base_rubrica_id,
      v_record.employee_id,
      EXTRACT(MONTH FROM v_competence)::integer,
      EXTRACT(YEAR FROM v_competence)::integer
    );
  ELSE
    v_base_amount := round(payroll_calc.base_salary(v_record.employee_id, v_competence), 2)::numeric(14, 2);
  END IF;

  v_daily_amount := COALESCE(v_base_amount, 0) / 30;
  v_salary_amount := round(v_daily_amount * GREATEST(COALESCE(v_record.days, 0), 0), 2)::numeric(14, 2);
  v_one_third_amount := round(v_salary_amount / 3, 2)::numeric(14, 2);
  v_bonus_amount := round(v_daily_amount * GREATEST(COALESCE(v_record.pecuniary_bonus_days, 0), 0), 2)::numeric(14, 2);
  v_rpps_base := round(v_salary_amount + v_bonus_amount, 2)::numeric(14, 2);
  v_rpps_amount := payroll_calc.compute_rpps(p_tenant_id, v_employee.employment_link_id, v_rpps_base, v_record.starts_on);
  v_irrf_base := round(v_salary_amount + v_one_third_amount + v_bonus_amount - v_rpps_amount, 2)::numeric(14, 2);
  v_irrf_amount := payroll_calc.compute_irrf(
    p_tenant_id,
    v_irrf_base,
    payroll_calc.dependent_count(v_record.employee_id)::integer,
    v_record.starts_on
  );

  item_code := 'VACATION_SALARY';
  item_kind := 'EARNING'::public."PayrollEntryKind";
  amount := v_salary_amount;
  reference_value := v_base_amount;
  quantity := v_record.days;
  metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code);
  RETURN NEXT;

  item_code := 'VACATION_ONE_THIRD';
  item_kind := 'EARNING'::public."PayrollEntryKind";
  amount := v_one_third_amount;
  reference_value := v_salary_amount;
  quantity := 1;
  metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code);
  RETURN NEXT;

  IF v_bonus_amount > 0 THEN
    item_code := 'VACATION_PECUNIARY_BONUS';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_bonus_amount;
    reference_value := v_base_amount;
    quantity := v_record.pecuniary_bonus_days;
    metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code);
    RETURN NEXT;
  END IF;

  IF v_rpps_amount > 0 THEN
    item_code := 'RPPS';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_rpps_amount;
    reference_value := v_rpps_base;
    quantity := 1;
    metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code, 'baseExcludesOneThird', true);
    RETURN NEXT;
  END IF;

  IF v_irrf_amount > 0 THEN
    item_code := 'IRRF_VACATION';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_irrf_amount;
    reference_value := v_irrf_base;
    quantity := 1;
    metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code, 'exclusiveTaxation', true);
    RETURN NEXT;
  END IF;
END;
$$;

CREATE FUNCTION payroll_calc.compute_irrf(p_tenant_id uuid, p_base_amount numeric, p_dependents integer, p_competence date) RETURNS numeric
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_row public.tax_rate%ROWTYPE;
  v_base numeric;
BEGIN
  SELECT *
  INTO v_row
  FROM public.tax_rate rate
  WHERE rate.tenant_id = p_tenant_id
    AND rate.kind = 'IRRF'
    AND rate.status = 'ACTIVE'::public."RecordStatus"
    AND rate.competence_start <= p_competence
    AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence)
  ORDER BY rate.competence_start DESC, rate.bracket_min ASC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN 0.00;
  END IF;

  v_base := greatest(
    COALESCE(p_base_amount, 0) - (greatest(COALESCE(p_dependents, 0), 0) * COALESCE(v_row.dependent_deduction, 0)),
    0
  );

  SELECT *
  INTO v_row
  FROM public.tax_rate rate
  WHERE rate.tenant_id = p_tenant_id
    AND rate.kind = 'IRRF'
    AND rate.status = 'ACTIVE'::public."RecordStatus"
    AND rate.competence_start <= p_competence
    AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence)
    AND rate.bracket_min <= v_base
    AND (rate.bracket_max IS NULL OR rate.bracket_max >= v_base)
  ORDER BY rate.competence_start DESC, rate.bracket_min DESC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN 0.00;
  END IF;

  RETURN greatest(round((v_base * COALESCE(v_row.rate, 0) / 100) - COALESCE(v_row.deduction_amount, 0), 2), 0)::numeric(14, 2);
END;
$$;

CREATE FUNCTION payroll_calc.compute_quinquenio(p_tenant_id uuid, p_employment_link_id uuid, p_base_amount numeric, p_competence date) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'public', 'pg_catalog'
    AS $$
  SELECT round(
    greatest(coalesce(p_base_amount, 0), 0)
    * floor(payroll_calc.service_time_years(p_tenant_id, p_employment_link_id, p_competence) / 5.0)
    * payroll_calc.parameter_numeric(p_tenant_id, 'QUINQUENIO_PERCENT_PER_PERIOD', 5.000000)
    / 100,
    2
  )::numeric(14, 2);
$$;
