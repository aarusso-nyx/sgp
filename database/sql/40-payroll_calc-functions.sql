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

CREATE FUNCTION payroll_calc.f_fol01_venc_32efde4e(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_43f75ca7(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_47cd31c3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_4921aed5(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_49879ab1(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_49bcdf29(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      SELECT fc.amount
      INTO v_result
      FROM payroll_calc.formula_cache fc
      WHERE fc.earning_deduction_id = 'bc78700f-a624-4b18-baa9-0599e96f4210'::uuid
        AND fc.tenant_id = public.sgp_current_tenant_uuid()
        AND fc.employee_id = p_employee_id
        AND fc.competence_month = p_month
        AND fc.competence_year = p_year;

      IF FOUND THEN
        RETURN v_result;
      END IF;

      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1));

      INSERT INTO payroll_calc.formula_cache (
        tenant_id,
        earning_deduction_id,
        employee_id,
        competence_month,
        competence_year,
        amount
      )
      SELECT ped.tenant_id, ped.id, p_employee_id, p_month, p_year, v_result
      FROM payroll.payroll_earning_deduction ped
      WHERE ped.id = 'bc78700f-a624-4b18-baa9-0599e96f4210'::uuid
      ON CONFLICT (earning_deduction_id, employee_id, competence_month, competence_year)
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();

      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_4d5e250b(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_4d795c8f(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_4fcccfa8(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_553886e6(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_556af985(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_55a2314f(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_57a098e3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_5b809f84(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_610cf061(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_622556da(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_73670244(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_74cb540d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_74cd73e2(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_78f81054(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_7963eafb(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_79933da8(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_7ca5c0fb(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_7fd3b3a3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_8113c96e(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      SELECT fc.amount
      INTO v_result
      FROM payroll_calc.formula_cache fc
      WHERE fc.earning_deduction_id = '5c5e4ecf-f6a6-4503-b0e1-3ce6f9f90347'::uuid
        AND fc.tenant_id = public.sgp_current_tenant_uuid()
        AND fc.employee_id = p_employee_id
        AND fc.competence_month = p_month
        AND fc.competence_year = p_year;

      IF FOUND THEN
        RETURN v_result;
      END IF;

      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1));

      INSERT INTO payroll_calc.formula_cache (
        tenant_id,
        earning_deduction_id,
        employee_id,
        competence_month,
        competence_year,
        amount
      )
      SELECT ped.tenant_id, ped.id, p_employee_id, p_month, p_year, v_result
      FROM payroll.payroll_earning_deduction ped
      WHERE ped.id = '5c5e4ecf-f6a6-4503-b0e1-3ce6f9f90347'::uuid
      ON CONFLICT (earning_deduction_id, employee_id, competence_month, competence_year)
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();

      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_8243e4a5(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_840bb1c4(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_89f74b36(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_8a3367b1(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_8b606b22(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_909bcfcf(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_919e8858(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_92419a21(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_9403f543(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_943e80d3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_95b75c57(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_96839793(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_9787bf80(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_9b1a30ac(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_9c438fee(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_9c80540d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_9cd32d8b(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_9fc3a049(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_a1b04129(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_a2269d39(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_a40d7def(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_a903464b(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_addee92a(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_b34ff4a8(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_b6b182b1(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_bb227d47(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_bf4cf844(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_c0ecfc65(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_c417991e(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_d412ee6c(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_d46f760a(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_d611e466(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_d63a856f(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_d69cd0b9(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_da44b2fe(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_dd759722(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_df7c4435(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_e17a812f(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_e2361d4d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_e3d1e4cc(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_e5c6cb6f(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_f2339f23(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_f2beb02a(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      SELECT fc.amount
      INTO v_result
      FROM payroll_calc.formula_cache fc
      WHERE fc.earning_deduction_id = '42797e6d-fb29-4164-8666-7565e0c47a79'::uuid
        AND fc.tenant_id = public.sgp_current_tenant_uuid()
        AND fc.employee_id = p_employee_id
        AND fc.competence_month = p_month
        AND fc.competence_year = p_year;

      IF FOUND THEN
        RETURN v_result;
      END IF;

      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1));

      INSERT INTO payroll_calc.formula_cache (
        tenant_id,
        earning_deduction_id,
        employee_id,
        competence_month,
        competence_year,
        amount
      )
      SELECT ped.tenant_id, ped.id, p_employee_id, p_month, p_year, v_result
      FROM payroll.payroll_earning_deduction ped
      WHERE ped.id = '42797e6d-fb29-4164-8666-7565e0c47a79'::uuid
      ON CONFLICT (earning_deduction_id, employee_id, competence_month, competence_year)
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();

      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_f311d8bc(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_f3a1da40(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_f9cbc43e(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_fol01_venc_fae464da(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
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

CREATE FUNCTION payroll_calc.f_irrf_progressive(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT payroll_calc.compute_irrf(
    public.sgp_current_tenant_uuid(),
    payroll_calc.base_irrf(p_employee_id, make_date(p_year, p_month, 1)),
    payroll_calc.dependent_count(p_employee_id)::integer,
    make_date(p_year, p_month, 1)
  );
$$;

CREATE FUNCTION payroll_calc.f_quinquenio(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
  SELECT payroll_calc.compute_quinquenio(employee.tenant_id, employee.employment_link_id, payroll_calc.base_salary(employee.id, make_date(p_year, p_month, 1)), make_date(p_year, p_month, 1))
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.f_rpps_progressive(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
  SELECT payroll_calc.compute_rpps(
    employee.tenant_id,
    employee.employment_link_id,
    payroll_calc.base_rpps(employee.id, make_date(p_year, p_month, 1)),
    make_date(p_year, p_month, 1)
  )
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.f_sexta_parte(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
  SELECT payroll_calc.compute_sexta_parte(employee.tenant_id, employee.employment_link_id, payroll_calc.base_salary(employee.id, make_date(p_year, p_month, 1)), make_date(p_year, p_month, 1))
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.f_teto_remuneratorio(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT payroll_calc.compute_teto_redutor(
    employee.tenant_id,
    employee.employment_link_id,
    payroll_calc.base_teto_remuneratorio(employee.id, make_date(p_year, p_month, 1)),
    make_date(p_year, p_month, 1)
  )
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.f_trienio(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
  SELECT payroll_calc.compute_trienio(employee.tenant_id, employee.employment_link_id, payroll_calc.base_salary(employee.id, make_date(p_year, p_month, 1)), make_date(p_year, p_month, 1))
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.f_vacation_base(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
      SELECT payroll_calc.base_salary(p_employee_id, make_date(p_year, p_month, 1));
    $$;

CREATE FUNCTION payroll_calc.fgts_monthly_base(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'payroll', 'hr', 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE((
    SELECT record.total_earnings::numeric(14,2)
    FROM payroll.payroll_financial_record record
    WHERE record.employee_id = p_employee_id
      AND record.competence_year = p_year
      AND record.competence_month = p_month
      AND record.tenant_id = public.sgp_current_tenant_uuid()
    ORDER BY record.generated_at DESC
    LIMIT 1
  ), 0)::numeric(14,2);
$$;

CREATE FUNCTION payroll_calc.on_earning_after_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'payroll', 'public', 'pg_catalog'
    AS $$
BEGIN
  IF OLD.formula_function_name IS NOT NULL THEN
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(uuid, integer, integer) CASCADE',
      'payroll_calc',
      OLD.formula_function_name
    );
  END IF;
  RETURN OLD;
END;
$$;

CREATE FUNCTION payroll_calc.on_earning_before_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.formula_alias IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM payroll.payroll_earning_deduction ped
      WHERE ped.id <> OLD.id
        AND OLD.formula_alias = ANY(coalesce(ped.formula_dependencies, ARRAY[]::text[]))
    )
  THEN
    RAISE EXCEPTION 'Cannot delete earning/deduction % because dependent formulas exist', OLD.code;
  END IF;

  RETURN OLD;
END;
$$;

CREATE FUNCTION payroll_calc.on_earning_before_truncate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'payroll', 'public', 'pg_catalog'
    AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT ped.formula_function_name
    FROM payroll.payroll_earning_deduction ped
    WHERE ped.formula_function_name IS NOT NULL
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(uuid, integer, integer) CASCADE',
      'payroll_calc',
      rec.formula_function_name
    );
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE FUNCTION payroll_calc.on_earning_formula_cache_invalidate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'payroll', 'public', 'pg_catalog'
    AS $$
BEGIN
  IF OLD.formula_expression IS DISTINCT FROM NEW.formula_expression
    OR OLD.formula_alias IS DISTINCT FROM NEW.formula_alias
  THEN
    DELETE FROM payroll_calc.formula_cache
    WHERE tenant_id = OLD.tenant_id
      AND earning_deduction_id = OLD.id
      AND version = OLD.formula_version;

    PERFORM public.sgp_append_audit_event(
      'UPDATE',
      'payroll.formula',
      OLD.id::text,
      NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'payroll_calc.formula_cache',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object(
        'event', 'payroll.formula.cache_invalidated',
        'earningDeductionId', OLD.id::text,
        'previousVersion', OLD.formula_version,
        'currentVersion', NEW.formula_version
      ),
      NULL::text,
      NULL::text,
      NULL::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION payroll_calc.on_earning_formula_cache_materialize() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'payroll', 'public', 'pg_catalog'
    AS $$
BEGIN
  IF NEW.formula_ready = true AND NEW.formula_function_ddl IS NOT NULL THEN
    INSERT INTO payroll_calc.formula_cache (
      tenant_id,
      earning_deduction_id,
      version,
      compiled_sql,
      compiled_at
    )
    VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.formula_version,
      NEW.formula_function_ddl,
      now()
    )
    ON CONFLICT (tenant_id, earning_deduction_id, version) DO UPDATE
    SET compiled_sql = EXCLUDED.compiled_sql,
        compiled_at = EXCLUDED.compiled_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION payroll_calc.on_formula_cache_upsert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();

  SELECT
    COALESCE(NEW.tenant_id, ped.tenant_id),
    CASE
      WHEN ped.kind::text = 'EARNING' THEN 1
      WHEN ped.kind::text = 'DEDUCTION' THEN -1
      ELSE 0
    END
  INTO NEW.tenant_id, NEW.signal
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.id = NEW.earning_deduction_id;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'formula_cache tenant_id could not be derived for earning_deduction_id %', NEW.earning_deduction_id
      USING ERRCODE = '23502';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM hr.employee employee
    WHERE employee.id = NEW.employee_id
      AND employee.tenant_id <> NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'formula_cache tenant mismatch for employee_id %', NEW.employee_id
      USING ERRCODE = '42501';
  END IF;

  IF NEW.signal IS NULL THEN
    NEW.signal := 0;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION payroll_calc.parameter_numeric(p_tenant_id uuid, p_key text, p_default numeric) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE(
        NULLIF(parameter.value->>'amount', '')::numeric,
        NULLIF(parameter.value->>'rate', '')::numeric,
        NULLIF(parameter.value->>'value', '')::numeric,
        NULLIF(parameter.value#>>'{}', '')::numeric
      )
      FROM public.system_parameter parameter
      WHERE parameter.tenant_id = p_tenant_id
        AND parameter.key = p_key
      LIMIT 1
    ),
    p_default
  );
$$;

CREATE FUNCTION payroll_calc.proportional_ratio(p_employee_id uuid, p_month integer, p_year integer) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT CASE
    WHEN payroll_calc.days_in_month(p_year, p_month) = 0 THEN 0
    ELSE COALESCE(payroll_calc.worked_days(p_employee_id, p_month, p_year), 0)
      / payroll_calc.days_in_month(p_year, p_month)::numeric
  END;
$$;

CREATE FUNCTION payroll_calc.resolve_ceiling_parameter_key(p_tenant_id uuid, p_employment_link_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_position_code text;
  v_position_name text;
  v_category text;
BEGIN
  SELECT position.code, position.name, position.category::text
  INTO v_position_code, v_position_name, v_category
  FROM hr.employee employee
  LEFT JOIN hr.job_position position
    ON position.id = employee.job_position_id
   AND position.tenant_id = employee.tenant_id
  WHERE employee.tenant_id = p_tenant_id
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.created_at DESC
  LIMIT 1;

  IF upper(coalesce(v_position_code, '') || ' ' || coalesce(v_position_name, '')) LIKE '%VICE%' THEN
    RETURN 'TETO_VICE';
  END IF;

  IF upper(coalesce(v_position_code, '') || ' ' || coalesce(v_position_name, '')) LIKE '%SECRET%' THEN
    RETURN 'TETO_SECRETARIO';
  END IF;

  IF v_category = 'eletivo' THEN
    RETURN 'TETO_VEREADOR';
  END IF;

  IF v_category = 'comissionado' THEN
    RETURN 'TETO_SECRETARIO';
  END IF;

  RETURN 'TETO_PREFEITURA';
END;
$$;

CREATE FUNCTION payroll_calc.rpps_ceiling(p_tenant_id uuid) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    NULLIF(value->>'amount', '')::numeric,
    NULLIF(value#>>'{}', '')::numeric,
    0
  )
  FROM public.system_parameter
  WHERE tenant_id = p_tenant_id
    AND key = 'TETO_RPPS'
  LIMIT 1;
$$;

CREATE FUNCTION payroll_calc.service_time_years(p_tenant_id uuid, p_employment_link_id uuid, p_competence date) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'public', 'pg_catalog'
    AS $$
  WITH selected_employee AS (
    SELECT employee.id
    FROM hr.employee employee
    WHERE employee.tenant_id = p_tenant_id
      AND employee.employment_link_id = p_employment_link_id
    ORDER BY employee.created_at DESC
    LIMIT 1
  ),
  service_days AS (
    SELECT COALESCE(sum(
      CASE
        WHEN record.days_count IS NOT NULL THEN greatest(record.days_count, 0)
        ELSE greatest(
          (least(coalesce(record.ends_on, p_competence), p_competence) - record.starts_on + 1),
          0
        )
      END
    ), 0) AS days
    FROM hr.service_time_record record
    JOIN selected_employee selected ON selected.id = record.employee_id
    WHERE record.tenant_id = p_tenant_id
      AND record.starts_on <= p_competence
  )
  SELECT floor(service_days.days / 365.0)::integer
  FROM service_days;
$$;

CREATE FUNCTION payroll_calc.service_years(p_employee_id uuid, p_competence date) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    floor(EXTRACT(YEAR FROM age(p_competence, employee.hired_on))),
    0
  )
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE FUNCTION payroll_calc.simulate_payroll(p_tenant_id uuid, p_employment_link_id uuid, p_competence date, p_overrides jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(earning_deduction_id uuid, code text, description text, kind text, current_amount numeric, amount numeric, delta numeric, quantity numeric, source text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_employee_id uuid;
  v_base_salary numeric(14, 2);
  v_dependent_count numeric;
  v_extra_rubric_id uuid;
  v_extra_amount numeric(14, 2);
  v_extra_quantity numeric(12, 4);
BEGIN
  IF NOT public.sgp_tenant_matches(p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant context does not match payroll simulation tenant';
  END IF;

  IF NOT public.sgp_has_any_permission(ARRAY['payroll.simulation.execute']) THEN
    RAISE EXCEPTION 'Missing permission payroll.simulation.execute';
  END IF;

  SELECT employee.id
  INTO v_employee_id
  FROM hr.employee employee
  WHERE employee.tenant_id = p_tenant_id
    AND (
      employee.employment_link_id = p_employment_link_id
      OR employee.id = p_employment_link_id
    )
  ORDER BY (employee.id = p_employment_link_id) DESC, employee.created_at DESC
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employment link or employee not found for payroll simulation';
  END IF;

  v_base_salary := NULLIF(p_overrides->>'baseSalary', '')::numeric(14, 2);
  v_dependent_count := NULLIF(p_overrides->>'dependentCount', '')::numeric;
  v_extra_rubric_id := NULLIF(p_overrides->>'rubricId', '')::uuid;
  v_extra_amount := NULLIF(p_overrides->>'rubricAmount', '')::numeric(14, 2);
  v_extra_quantity := COALESCE(NULLIF(p_overrides->>'rubricQuantity', '')::numeric(12, 4), 1);

  CREATE TEMP TABLE IF NOT EXISTS payroll_simulation_employee_override (
    employee_id uuid PRIMARY KEY,
    base_salary numeric(14, 2),
    dependent_count numeric
  ) ON COMMIT DROP;

  TRUNCATE TABLE payroll_simulation_employee_override;
  INSERT INTO payroll_simulation_employee_override (
    employee_id,
    base_salary,
    dependent_count
  )
  VALUES (
    v_employee_id,
    v_base_salary,
    v_dependent_count
  );

  RETURN QUERY
  WITH eligible_rubrics AS (
    SELECT DISTINCT
      earning.id,
      earning.code,
      earning.description,
      earning.formula_function_name,
      earning.formula_expression,
      earning.formula_dependencies,
      earning.kind::text AS kind,
      COALESCE(link.default_quantity, 1)::numeric(12, 4) AS quantity
    FROM payroll.payroll_earning_deduction earning
    LEFT JOIN payroll.employment_link_earning link
      ON link.earning_deduction_id = earning.id
     AND link.tenant_id = earning.tenant_id
     AND link.employment_link_id = p_employment_link_id
     AND link.status = 'ACTIVE'::"RecordStatus"
     AND (link.starts_on IS NULL OR link.starts_on <= p_competence)
     AND (link.ends_on IS NULL OR link.ends_on >= p_competence)
    WHERE earning.tenant_id = p_tenant_id
      AND earning.active = true
      AND earning.formula_ready = true
      AND earning.kind <> 'BASE'::"PayrollEntryKind"
      AND earning.starts_on <= p_competence
      AND (earning.ends_on IS NULL OR earning.ends_on >= p_competence)
      AND (
        link.id IS NOT NULL
        OR NOT EXISTS (
          SELECT 1
          FROM payroll.employment_link_earning scoped
          WHERE scoped.tenant_id = p_tenant_id
            AND scoped.employment_link_id = p_employment_link_id
            AND scoped.status = 'ACTIVE'::"RecordStatus"
        )
      )
  ),
  evaluated AS (
    SELECT
      rubric.id,
      rubric.code,
      rubric.description,
      rubric.kind,
      rubric.quantity,
      CASE
        WHEN v_base_salary IS NOT NULL
          AND rubric.kind = 'EARNING'
          AND (
            COALESCE(rubric.formula_function_name, '') ILIKE '%salary%'
            OR COALESCE(rubric.formula_expression, '') ILIKE '%SALARIO%'
            OR COALESCE(rubric.formula_expression, '') ILIKE '%SALARY%'
            OR COALESCE(rubric.formula_dependencies, ARRAY[]::text[]) && ARRAY['SALARIO_BASE', 'BASE_SALARY']
          )
          THEN v_base_salary
        WHEN v_base_salary IS NOT NULL
          AND rubric.kind = 'DEDUCTION'
          AND (
            rubric.code ILIKE '%IRRF%'
            OR COALESCE(rubric.formula_function_name, '') ILIKE '%irrf%'
            OR COALESCE(rubric.formula_dependencies, ARRAY[]::text[]) && ARRAY['BASE_IRRF', 'IRRF']
          )
          THEN payroll_calc.compute_irrf(
            p_tenant_id,
            v_base_salary,
            COALESCE(v_dependent_count, payroll_calc.dependent_count(v_employee_id))::integer,
            p_competence
          )
        ELSE payroll_calc.evaluate_earning_deduction(
          rubric.id,
          v_employee_id,
          EXTRACT(MONTH FROM p_competence)::integer,
          EXTRACT(YEAR FROM p_competence)::integer
        )
      END::numeric(14, 2) AS simulated_amount
    FROM eligible_rubrics rubric
  )
  SELECT
    evaluated.id,
    evaluated.code,
    evaluated.description,
    evaluated.kind,
    evaluated.simulated_amount,
    evaluated.simulated_amount,
    0::numeric(14, 2),
    evaluated.quantity,
    'FORMULA'::text
  FROM evaluated
  UNION ALL
  SELECT
    extra.id,
    extra.code,
    extra.description,
    extra.kind::text,
    0::numeric(14, 2),
    COALESCE(v_extra_amount, 0)::numeric(14, 2),
    COALESCE(v_extra_amount, 0)::numeric(14, 2),
    v_extra_quantity,
    'OVERRIDE'::text
  FROM payroll.payroll_earning_deduction extra
  WHERE v_extra_rubric_id IS NOT NULL
    AND extra.id = v_extra_rubric_id
    AND extra.tenant_id = p_tenant_id
    AND COALESCE(v_extra_amount, 0) <> 0
  ORDER BY code;
END;
$$;

CREATE FUNCTION payroll_calc.termination_avos(p_starts_on date, p_termination_date date, p_reference_year integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_month integer;
  v_start date;
  v_end date;
  v_active_days integer;
  v_avos integer := 0;
BEGIN
  IF p_starts_on IS NULL OR p_termination_date IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_month IN 1..12 LOOP
    v_start := make_date(p_reference_year, v_month, 1);
    v_end := (v_start + INTERVAL '1 month - 1 day')::date;
    v_active_days := GREATEST(LEAST(p_termination_date, v_end) - GREATEST(p_starts_on, v_start) + 1, 0);
    IF v_active_days >= 15 THEN
      v_avos := v_avos + 1;
    END IF;
  END LOOP;

  RETURN LEAST(v_avos, 12);
END;
$$;

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
