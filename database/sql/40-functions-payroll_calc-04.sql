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
