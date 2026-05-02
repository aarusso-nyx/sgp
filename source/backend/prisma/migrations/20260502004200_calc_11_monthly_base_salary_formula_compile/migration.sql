-- Recompile the CALC-11 monthly base salary rubric through the formula engine.
-- Earlier CALC-11 migrations created the helper function directly, but the
-- formula trigger clears function metadata for rows without formula_expression.

UPDATE payroll.payroll_earning_deduction
SET formula_alias = 'monthly_base_salary',
    formula_expression = 'round(base_salary(p_employee_id, make_date(p_year, p_month, 1)) * proportional_ratio(p_employee_id, p_month, p_year), 2)',
    formula_error = NULL,
    updated_at = now()
WHERE code = 'MONTHLY_BASE_SALARY';
