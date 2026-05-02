-- Ensure the monthly base salary formula exists even on databases where CALC-11
-- was applied before the formula projection was present.

CREATE SCHEMA IF NOT EXISTS payroll_calc;

CREATE OR REPLACE FUNCTION payroll_calc.f_monthly_base_salary(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
AS $$
  SELECT round(
    payroll_calc.base_salary(p_employee_id, make_date(p_year, p_month, 1))
    * payroll_calc.proportional_ratio(p_employee_id, p_month, p_year),
    2
  );
$$;
