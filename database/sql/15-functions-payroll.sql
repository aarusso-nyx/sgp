CREATE FUNCTION payroll.employee_payroll_item_idempotency_key(p_tenant_id uuid, p_competence_year integer, p_competence_month integer, p_payroll_run_id uuid, p_employee_id uuid, p_earning_deduction_id uuid, p_source public."PayrollEntrySource") RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_source = 'CALCULATED'::public."PayrollEntrySource"
      AND p_payroll_run_id IS NOT NULL
    THEN
      p_tenant_id::text || ':' ||
      p_competence_year::text || ':' ||
      lpad(p_competence_month::text, 2, '0') || ':' ||
      p_payroll_run_id::text || ':' ||
      p_employee_id::text || ':' ||
      p_earning_deduction_id::text || ':' ||
      p_source::text
    ELSE NULL
  END
$$;
