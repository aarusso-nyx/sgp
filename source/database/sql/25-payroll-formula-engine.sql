-- Folia-inspired payroll formula engine port for SGP v0.0.1.
-- Keeps physical model in English and runs directly on payroll/hr schemas.

CREATE SCHEMA IF NOT EXISTS payroll_calc;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_earning_deduction'
      AND column_name = 'formula_alias'
  ) THEN
    ALTER TABLE payroll.payroll_earning_deduction
      ADD COLUMN formula_alias text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_earning_deduction'
      AND column_name = 'formula_function_name'
  ) THEN
    ALTER TABLE payroll.payroll_earning_deduction
      ADD COLUMN formula_function_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_earning_deduction'
      AND column_name = 'formula_expression'
  ) THEN
    ALTER TABLE payroll.payroll_earning_deduction
      ADD COLUMN formula_expression text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_earning_deduction'
      AND column_name = 'formula_function_ddl'
  ) THEN
    ALTER TABLE payroll.payroll_earning_deduction
      ADD COLUMN formula_function_ddl text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_earning_deduction'
      AND column_name = 'formula_dependencies'
  ) THEN
    ALTER TABLE payroll.payroll_earning_deduction
      ADD COLUMN formula_dependencies text[] NOT NULL DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_earning_deduction'
      AND column_name = 'formula_ready'
  ) THEN
    ALTER TABLE payroll.payroll_earning_deduction
      ADD COLUMN formula_ready boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_earning_deduction'
      AND column_name = 'formula_error'
  ) THEN
    ALTER TABLE payroll.payroll_earning_deduction
      ADD COLUMN formula_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_earning_deduction'
      AND column_name = 'formula_version'
  ) THEN
    ALTER TABLE payroll.payroll_earning_deduction
      ADD COLUMN formula_version integer NOT NULL DEFAULT 1;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_earning_deduction_formula_alias_uq
  ON payroll.payroll_earning_deduction (tenant_id, formula_alias)
  WHERE formula_alias IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_earning_deduction_formula_function_name_uq
  ON payroll.payroll_earning_deduction (tenant_id, formula_function_name)
  WHERE formula_function_name IS NOT NULL;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_earning_deduction',
    'formula_attribute',
    'job_position_earning'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'fol01_' || table_name || '_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'fol01_' || table_name || '_write', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.read'', ''folha.rubrica.write'', ''folha.rubrica.preview'', ''payroll.formula.read'', ''payroll.formula.write''])))',
      'fol01_' || table_name || '_select',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.write'', ''payroll.formula.write'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.write'', ''payroll.formula.write''])))',
      'fol01_' || table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DROP TABLE IF EXISTS payroll_calc.formula_cache CASCADE;
CREATE TABLE payroll_calc.formula_cache (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  earning_deduction_id uuid NOT NULL REFERENCES payroll.payroll_earning_deduction(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  compiled_sql text NOT NULL,
  compiled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, earning_deduction_id, version)
);

CREATE INDEX IF NOT EXISTS formula_cache_updated_at_idx
  ON payroll_calc.formula_cache (compiled_at DESC);

CREATE INDEX IF NOT EXISTS formula_cache_tenant_updated_at_idx
  ON payroll_calc.formula_cache (tenant_id, compiled_at DESC);

ALTER TABLE payroll_calc.formula_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calc.formula_cache FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_formula_cache_rw ON payroll_calc.formula_cache;
DROP POLICY IF EXISTS calc01_formula_cache_select ON payroll_calc.formula_cache;
DROP POLICY IF EXISTS calc01_formula_cache_write ON payroll_calc.formula_cache;
CREATE POLICY calc01_formula_cache_select ON payroll_calc.formula_cache
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.formula.read', 'payroll.formula.write'])
    )
  );
CREATE POLICY calc01_formula_cache_write ON payroll_calc.formula_cache
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.formula.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.formula.write'])
    )
  );

CREATE OR REPLACE FUNCTION payroll_calc.base_salary(
  p_employee_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(sr.amount, 0)
  FROM hr.employee e
  LEFT JOIN hr.salary_reference sr ON sr.id = e.salary_reference_id
  WHERE e.id = p_employee_id;
$$;

DROP FUNCTION IF EXISTS payroll_calc.base_salary(uuid, date);
CREATE OR REPLACE FUNCTION payroll_calc.base_salary(
  p_employee_id uuid,
  p_competence date
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT payroll_calc.base_salary(p_employee_id);
$$;

CREATE OR REPLACE FUNCTION payroll_calc.workload_hours(
  p_employee_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(shift.daily_hours, 0)
  FROM hr.employee employee
  LEFT JOIN hr.shift shift ON shift.id = employee.shift_id
  WHERE employee.id = p_employee_id;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.dependent_count(
  p_employee_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::numeric
  FROM hr.employee_dependent dependent
  WHERE dependent.employee_id = p_employee_id
    AND dependent.income_tax_dependent = true;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.service_years(
  p_employee_id uuid,
  p_competence date
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    floor(EXTRACT(YEAR FROM age(p_competence, employee.hired_on))),
    0
  )
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.days_in_month(
  p_year integer,
  p_month integer
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT EXTRACT(DAY FROM (date_trunc('month', make_date(p_year, p_month, 1)) + INTERVAL '1 month - 1 day'))::integer;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.absence_days(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT ef.absence_days
    FROM hr.employee_frequency ef
    WHERE ef.employee_id = p_employee_id
      AND ef.month = p_month
      AND ef.year = p_year
  ), 0);
$$;

CREATE OR REPLACE FUNCTION payroll_calc.worked_days(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT ef.worked_days
    FROM hr.employee_frequency ef
    WHERE ef.employee_id = p_employee_id
      AND ef.month = p_month
      AND ef.year = p_year
  ), payroll_calc.days_in_month(p_year, p_month) - payroll_calc.absence_days(p_employee_id, p_month, p_year));
$$;

CREATE OR REPLACE FUNCTION payroll_calc.proportional_ratio(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN payroll_calc.days_in_month(p_year, p_month) = 0 THEN 0
    ELSE COALESCE(payroll_calc.worked_days(p_employee_id, p_month, p_year), 0)
      / payroll_calc.days_in_month(p_year, p_month)::numeric
  END;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.compile_formula_expression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payroll_calc, payroll, hr, public, pg_catalog
AS $$
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
$$;

CREATE OR REPLACE FUNCTION payroll_calc.compile_formula(
  p_expression text,
  p_dependencies text[] DEFAULT ARRAY[]::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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

DROP TRIGGER IF EXISTS trg_compile_formula_expression ON payroll.payroll_earning_deduction;
CREATE TRIGGER trg_compile_formula_expression
BEFORE INSERT OR UPDATE OF code, formula_alias, formula_expression
ON payroll.payroll_earning_deduction
FOR EACH ROW
WHEN (NEW.formula_expression IS NOT NULL AND btrim(NEW.formula_expression) <> '')
EXECUTE FUNCTION payroll_calc.compile_formula_expression();

CREATE OR REPLACE FUNCTION payroll_calc.on_earning_formula_cache_materialize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payroll_calc, payroll, public, pg_catalog
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

DROP TRIGGER IF EXISTS trg_earning_formula_cache_materialize ON payroll.payroll_earning_deduction;
CREATE TRIGGER trg_earning_formula_cache_materialize
AFTER INSERT OR UPDATE
ON payroll.payroll_earning_deduction
FOR EACH ROW
EXECUTE FUNCTION payroll_calc.on_earning_formula_cache_materialize();

CREATE OR REPLACE FUNCTION payroll_calc.on_earning_formula_cache_invalidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payroll_calc, payroll, public, pg_catalog
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

DROP TRIGGER IF EXISTS trg_earning_formula_cache_invalidate ON payroll.payroll_earning_deduction;
CREATE TRIGGER trg_earning_formula_cache_invalidate
AFTER UPDATE
ON payroll.payroll_earning_deduction
FOR EACH ROW
EXECUTE FUNCTION payroll_calc.on_earning_formula_cache_invalidate();

CREATE OR REPLACE FUNCTION payroll_calc.on_earning_before_delete()
RETURNS trigger
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

DROP TRIGGER IF EXISTS trg_earning_before_delete ON payroll.payroll_earning_deduction;
CREATE TRIGGER trg_earning_before_delete
BEFORE DELETE ON payroll.payroll_earning_deduction
FOR EACH ROW
EXECUTE FUNCTION payroll_calc.on_earning_before_delete();

CREATE OR REPLACE FUNCTION payroll_calc.on_earning_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payroll_calc, payroll, public, pg_catalog
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

DROP TRIGGER IF EXISTS trg_earning_after_delete ON payroll.payroll_earning_deduction;
CREATE TRIGGER trg_earning_after_delete
AFTER DELETE ON payroll.payroll_earning_deduction
FOR EACH ROW
EXECUTE FUNCTION payroll_calc.on_earning_after_delete();

CREATE OR REPLACE FUNCTION payroll_calc.on_earning_before_truncate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payroll_calc, payroll, public, pg_catalog
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

DROP TRIGGER IF EXISTS trg_earning_before_truncate ON payroll.payroll_earning_deduction;
CREATE TRIGGER trg_earning_before_truncate
BEFORE TRUNCATE ON payroll.payroll_earning_deduction
FOR EACH STATEMENT
EXECUTE FUNCTION payroll_calc.on_earning_before_truncate();

CREATE OR REPLACE FUNCTION payroll_calc.evaluate_earning_deduction(
  p_earning_deduction_id uuid,
  p_employee_id uuid,
  p_month integer DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS numeric(14, 2)
LANGUAGE plpgsql
VOLATILE
AS $$
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

  BEGIN
    EXECUTE format('SELECT %I.%I($1, $2, $3)', 'payroll_calc', v_function_name)
      USING p_employee_id, p_month, p_year
      INTO v_amount;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Formula evaluation failed for %: %', p_earning_deduction_id, SQLERRM;
      RETURN NULL;
  END;

  RETURN v_amount;
END;
$$;
