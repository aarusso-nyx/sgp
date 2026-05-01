CREATE OR REPLACE FUNCTION payroll_calc.f_irrf_progressive(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT payroll_calc.compute_irrf(
    public.sgp_current_tenant_uuid(),
    payroll_calc.base_irrf(p_employee_id, make_date(p_year, p_month, 1)),
    payroll_calc.dependent_count(p_employee_id)::integer,
    make_date(p_year, p_month, 1)
  );
$$;

DROP FUNCTION IF EXISTS payroll_calc.simulate_payroll(uuid, uuid, date, jsonb);
CREATE OR REPLACE FUNCTION payroll_calc.simulate_payroll(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_competence date,
  p_overrides jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  earning_deduction_id uuid,
  code text,
  description text,
  kind text,
  current_amount numeric(14, 2),
  amount numeric(14, 2),
  delta numeric(14, 2),
  quantity numeric(12, 4),
  source text
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
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
