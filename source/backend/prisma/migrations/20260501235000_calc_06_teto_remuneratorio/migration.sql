ALTER TABLE payroll.payroll_earning_deduction
  ADD COLUMN IF NOT EXISTS subject_to_ceiling boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN payroll.payroll_earning_deduction.subject_to_ceiling
  IS 'Whether this earning/deduction participates in the constitutional remuneration ceiling base.';

WITH canonical_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
  ('system.parameter.read', 'system', 'parameter', 'read', '/api/v1/admin/parametros/**', 'Read tenant system parameters.'),
  ('system.parameter.write', 'system', 'parameter', 'write', '/api/v1/admin/parametros/**', 'Mutate tenant system parameters.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM canonical_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

DROP POLICY IF EXISTS system_parameter_select ON public.system_parameter;
DROP POLICY IF EXISTS system_parameter_write ON public.system_parameter;
CREATE POLICY system_parameter_select ON public.system_parameter
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'gestao.read',
        'gestao.write',
        'system.parameter.read',
        'system.parameter.write'
      ])
    )
  );
CREATE POLICY system_parameter_write ON public.system_parameter
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'gestao.write',
        'system.parameter.write'
      ])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'gestao.write',
        'system.parameter.write'
      ])
    )
  );

CREATE OR REPLACE FUNCTION payroll_calc.ceiling_parameter_amount(
  p_tenant_id uuid,
  p_key text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
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

CREATE OR REPLACE FUNCTION payroll_calc.resolve_ceiling_parameter_key(
  p_tenant_id uuid,
  p_employment_link_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
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

CREATE OR REPLACE FUNCTION payroll_calc.compute_teto_redutor(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_gross_subject numeric,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE plpgsql
STABLE
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

CREATE OR REPLACE FUNCTION payroll_calc.base_teto_remuneratorio(
  p_employee_id uuid,
  p_competence date
)
RETURNS numeric
LANGUAGE sql
STABLE
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

CREATE OR REPLACE FUNCTION payroll_calc.f_teto_remuneratorio(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
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

  EXECUTE format('SELECT %I.%I($1, $2, $3)', 'payroll_calc', v_function_name)
    USING p_employee_id, p_month, p_year
    INTO v_amount;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Formula % returned NULL for earning_deduction_id %', v_function_name, p_earning_deduction_id;
  END IF;

  RETURN round(v_amount, 2)::numeric(14, 2);
END;
$$;

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenant LOOP
    INSERT INTO public.system_parameter (
      tenant_id, key, value, description, module_key
    )
    VALUES
      (v_tenant_id, 'TETO_PREFEITURA', '{"amount":null}'::jsonb, 'Teto remuneratório do Poder Executivo municipal.', 'payroll'),
      (v_tenant_id, 'TETO_VICE', '{"amount":null}'::jsonb, 'Subteto remuneratório de vice-prefeito.', 'payroll'),
      (v_tenant_id, 'TETO_VEREADOR', '{"amount":null}'::jsonb, 'Subteto remuneratório de vereador.', 'payroll'),
      (v_tenant_id, 'TETO_SECRETARIO', '{"amount":null}'::jsonb, 'Subteto remuneratório de secretário municipal.', 'payroll')
    ON CONFLICT (tenant_id, key) DO NOTHING;

    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'CREATE', 'system.parameter', NULL, NULL::uuid,
      'migration', 'migration', 'public.system_parameter', NULL,
      jsonb_build_object('event', 'calc06.teto.initial_load'),
      NULL::text, NULL::text, NULL::text
    );

    INSERT INTO payroll.payroll_earning_deduction (
      tenant_id, code, description, kind, taxable, active, incidences, starts_on,
      subject_to_ceiling,
      formula_alias, formula_function_name, formula_expression,
      formula_function_ddl, formula_dependencies, formula_ready
    )
    VALUES (
      v_tenant_id, 'DESCONTO_TETO', 'Redutor do teto remuneratório constitucional', 'DEDUCTION'::public."PayrollEntryKind",
      false, true, '{"constitutional_ceiling":true}', DATE '2025-01-01',
      false,
      'desconto_teto', 'f_teto_remuneratorio', NULL,
      'CREATE OR REPLACE FUNCTION payroll_calc.f_teto_remuneratorio(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE AS $function$ SELECT payroll_calc.compute_teto_redutor(employee.tenant_id, employee.employment_link_id, payroll_calc.base_teto_remuneratorio(employee.id, make_date($3, $2, 1)), make_date($3, $2, 1)) FROM hr.employee employee WHERE employee.id = $1; $function$;',
      ARRAY['BASE_TETO_REMUNERATORIO'], true
    )
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET formula_alias = EXCLUDED.formula_alias,
        formula_function_name = EXCLUDED.formula_function_name,
        formula_expression = EXCLUDED.formula_expression,
        formula_function_ddl = EXCLUDED.formula_function_ddl,
        formula_dependencies = EXCLUDED.formula_dependencies,
        incidences = EXCLUDED.incidences,
        subject_to_ceiling = false,
        formula_ready = true,
        formula_error = NULL,
        updated_at = now();
  END LOOP;
END
$$;
