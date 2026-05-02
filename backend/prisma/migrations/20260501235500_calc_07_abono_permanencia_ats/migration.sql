ALTER TABLE hr.employee
  ADD COLUMN IF NOT EXISTS abono_permanencia_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abono_permanencia_inicio date,
  ADD COLUMN IF NOT EXISTS abono_permanencia_fundamento text;

COMMENT ON COLUMN hr.employee.abono_permanencia_ativo
  IS 'Whether permanence allowance is active for the employee.';
COMMENT ON COLUMN hr.employee.abono_permanencia_inicio
  IS 'Start date for permanence allowance eligibility.';
COMMENT ON COLUMN hr.employee.abono_permanencia_fundamento
  IS 'Legal basis recorded when permanence allowance is changed.';

WITH canonical_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
  ('rh.employee.abono.write', 'rh', 'employee.abono', 'write', '/api/v1/funcionarios/*/abono-permanencia', 'Toggle employee permanence allowance.'),
  ('payroll.ats.read', 'payroll', 'ats', 'read', '/api/v1/admin/parametros/ats', 'Read ATS and sixth-part payroll parameters.'),
  ('payroll.ats.write', 'payroll', 'ats', 'write', '/api/v1/admin/parametros/ats', 'Mutate ATS and sixth-part payroll parameters.')
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

CREATE OR REPLACE FUNCTION payroll_calc.parameter_numeric(
  p_tenant_id uuid,
  p_key text,
  p_default numeric
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, public, pg_catalog
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

CREATE OR REPLACE FUNCTION payroll_calc.service_time_years(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_competence date
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, hr, public, pg_catalog
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

CREATE OR REPLACE FUNCTION payroll_calc.compute_abono_permanencia(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_base_amount numeric,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
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

CREATE OR REPLACE FUNCTION payroll_calc.compute_ats(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_base_amount numeric,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, public, pg_catalog
AS $$
  SELECT round(
    greatest(coalesce(p_base_amount, 0), 0)
    * payroll_calc.service_time_years(p_tenant_id, p_employment_link_id, p_competence)
    * payroll_calc.parameter_numeric(p_tenant_id, 'ATS_PERCENT_PER_YEAR', 1.000000)
    / 100,
    2
  )::numeric(14, 2);
$$;

CREATE OR REPLACE FUNCTION payroll_calc.compute_trienio(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_base_amount numeric,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, public, pg_catalog
AS $$
  SELECT round(
    greatest(coalesce(p_base_amount, 0), 0)
    * floor(payroll_calc.service_time_years(p_tenant_id, p_employment_link_id, p_competence) / 3.0)
    * payroll_calc.parameter_numeric(p_tenant_id, 'TRIENIO_PERCENT_PER_PERIOD', 3.000000)
    / 100,
    2
  )::numeric(14, 2);
$$;

CREATE OR REPLACE FUNCTION payroll_calc.compute_quinquenio(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_base_amount numeric,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, public, pg_catalog
AS $$
  SELECT round(
    greatest(coalesce(p_base_amount, 0), 0)
    * floor(payroll_calc.service_time_years(p_tenant_id, p_employment_link_id, p_competence) / 5.0)
    * payroll_calc.parameter_numeric(p_tenant_id, 'QUINQUENIO_PERCENT_PER_PERIOD', 5.000000)
    / 100,
    2
  )::numeric(14, 2);
$$;

CREATE OR REPLACE FUNCTION payroll_calc.compute_sexta_parte(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_base_amount numeric,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, public, pg_catalog
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

CREATE OR REPLACE FUNCTION payroll_calc.f_abono_permanencia(p_employee_id uuid, p_month integer, p_year integer)
RETURNS numeric
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
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

CREATE OR REPLACE FUNCTION payroll_calc.f_ats(p_employee_id uuid, p_month integer, p_year integer)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
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

CREATE OR REPLACE FUNCTION payroll_calc.f_trienio(p_employee_id uuid, p_month integer, p_year integer)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
AS $$
  SELECT payroll_calc.compute_trienio(employee.tenant_id, employee.employment_link_id, payroll_calc.base_salary(employee.id, make_date(p_year, p_month, 1)), make_date(p_year, p_month, 1))
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.f_quinquenio(p_employee_id uuid, p_month integer, p_year integer)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
AS $$
  SELECT payroll_calc.compute_quinquenio(employee.tenant_id, employee.employment_link_id, payroll_calc.base_salary(employee.id, make_date(p_year, p_month, 1)), make_date(p_year, p_month, 1))
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.f_sexta_parte(p_employee_id uuid, p_month integer, p_year integer)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
AS $$
  SELECT payroll_calc.compute_sexta_parte(employee.tenant_id, employee.employment_link_id, payroll_calc.base_salary(employee.id, make_date(p_year, p_month, 1)), make_date(p_year, p_month, 1))
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenant LOOP
    INSERT INTO public.system_parameter (tenant_id, key, value, description, module_key)
    VALUES
      (v_tenant_id, 'ATS_PERCENT_PER_YEAR', '{"rate":1.000000}'::jsonb, 'Percentual anual do adicional por tempo de serviço.', 'payroll'),
      (v_tenant_id, 'TRIENIO_PERCENT_PER_PERIOD', '{"rate":3.000000}'::jsonb, 'Percentual por triênio completo.', 'payroll'),
      (v_tenant_id, 'QUINQUENIO_PERCENT_PER_PERIOD', '{"rate":5.000000}'::jsonb, 'Percentual por quinquênio completo.', 'payroll'),
      (v_tenant_id, 'SEXTA_PARTE_SERVICE_YEARS', '{"value":25}'::jsonb, 'Anos completos exigidos para sexta-parte.', 'payroll'),
      (v_tenant_id, 'SEXTA_PARTE_FRACTION', '{"rate":0.166666666667}'::jsonb, 'Fração aplicada na sexta-parte.', 'payroll')
    ON CONFLICT (tenant_id, key) DO NOTHING;

    INSERT INTO payroll.payroll_earning_deduction (
      tenant_id, code, description, kind, taxable, active, incidences, starts_on,
      subject_to_ceiling, formula_alias, formula_function_name, formula_expression,
      formula_function_ddl, formula_dependencies, formula_ready
    )
    VALUES
      (v_tenant_id, 'ABONO_PERMANENCIA', 'Abono permanencia', 'EARNING'::public."PayrollEntryKind", false, true, '{"abono_permanencia":true}'::jsonb, DATE '2025-01-01', false, 'abono_permanencia', 'f_abono_permanencia', NULL, 'CREATE OR REPLACE FUNCTION payroll_calc.f_abono_permanencia(uuid, integer, integer) RETURNS numeric LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = payroll_calc, hr, payroll, public, pg_catalog AS $function$ SELECT payroll_calc.compute_abono_permanencia(employee.tenant_id, employee.employment_link_id, payroll_calc.base_rpps(employee.id, make_date($3, $2, 1)), make_date($3, $2, 1)) FROM hr.employee employee WHERE employee.id = $1; $function$;', ARRAY['RPPS'], true),
      (v_tenant_id, 'ATS', 'Adicional por tempo de servico', 'EARNING'::public."PayrollEntryKind", true, true, '{"service_time":true}'::jsonb, DATE '2025-01-01', true, 'ats', 'f_ats', NULL, 'CREATE OR REPLACE FUNCTION payroll_calc.f_ats(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = payroll_calc, hr, payroll, public, pg_catalog AS $function$ SELECT payroll_calc.compute_ats(employee.tenant_id, employee.employment_link_id, payroll_calc.base_salary(employee.id, make_date($3, $2, 1)), make_date($3, $2, 1)) FROM hr.employee employee WHERE employee.id = $1; $function$;', ARRAY['BASE_SALARY'], true),
      (v_tenant_id, 'TRIENIO', 'Trienio', 'EARNING'::public."PayrollEntryKind", true, true, '{"service_time":true}'::jsonb, DATE '2025-01-01', true, 'trienio', 'f_trienio', NULL, NULL, ARRAY['BASE_SALARY'], true),
      (v_tenant_id, 'QUINQUENIO', 'Quinquenio', 'EARNING'::public."PayrollEntryKind", true, true, '{"service_time":true}'::jsonb, DATE '2025-01-01', true, 'quinquenio', 'f_quinquenio', NULL, NULL, ARRAY['BASE_SALARY'], true),
      (v_tenant_id, 'SEXTA_PARTE', 'Sexta-parte', 'EARNING'::public."PayrollEntryKind", true, true, '{"service_time":true,"sexta_parte":true}'::jsonb, DATE '2025-01-01', true, 'sexta_parte', 'f_sexta_parte', NULL, NULL, ARRAY['BASE_SALARY'], true)
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET formula_alias = EXCLUDED.formula_alias,
        formula_function_name = EXCLUDED.formula_function_name,
        formula_expression = EXCLUDED.formula_expression,
        formula_function_ddl = EXCLUDED.formula_function_ddl,
        formula_dependencies = EXCLUDED.formula_dependencies,
        incidences = EXCLUDED.incidences,
        subject_to_ceiling = EXCLUDED.subject_to_ceiling,
        formula_ready = true,
        formula_error = NULL,
        updated_at = now();
  END LOOP;
END
$$;
