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

DO $$
DECLARE
  v_row record;
BEGIN
  FOR v_row IN
    SELECT id, tenant_id
    FROM payroll.payroll_earning_deduction
    WHERE code = 'IRRF'
      AND formula_alias = 'irrf'
  LOOP
    PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
    UPDATE payroll.payroll_earning_deduction
    SET formula_function_name = 'f_irrf_progressive',
        formula_expression = NULL,
        formula_function_ddl = 'CREATE OR REPLACE FUNCTION payroll_calc.f_irrf_progressive(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE AS $function$ SELECT payroll_calc.compute_irrf(public.sgp_current_tenant_uuid(), payroll_calc.base_irrf($1, make_date($3, $2, 1)), payroll_calc.dependent_count($1)::integer, make_date($3, $2, 1)); $function$;',
        formula_dependencies = ARRAY['BASE_IRRF', 'DEPENDENTES'],
        formula_ready = true,
        formula_error = NULL,
        updated_at = now()
    WHERE id = v_row.id;
  END LOOP;
END
$$;
