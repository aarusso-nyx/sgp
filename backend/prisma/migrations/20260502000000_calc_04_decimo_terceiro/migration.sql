CREATE OR REPLACE VIEW payroll_calc.v_decimo_terceiro_avos AS
WITH status_years AS (
  SELECT DISTINCT
    history.tenant_id,
    history.employee_id,
    employee.employment_link_id,
    year_value::integer AS reference_year
  FROM hr.employee_status_history history
  JOIN hr.employee employee ON employee.id = history.employee_id
  CROSS JOIN LATERAL generate_series(
    EXTRACT(YEAR FROM history.starts_on)::integer,
    EXTRACT(YEAR FROM COALESCE(history.ends_on, make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 12, 31)))::integer
  ) AS year_value
  WHERE employee.employment_link_id IS NOT NULL
),
month_activity AS (
  SELECT
    status_years.tenant_id,
    status_years.employee_id,
    status_years.employment_link_id,
    status_years.reference_year,
    month_value,
    SUM(
      GREATEST(
        LEAST(
          COALESCE(history.ends_on, make_date(status_years.reference_year, 12, 31)),
          (make_date(status_years.reference_year, month_value, 1) + INTERVAL '1 month - 1 day')::date
        )
        - GREATEST(history.starts_on, make_date(status_years.reference_year, month_value, 1))
        + 1,
        0
      )
    ) AS active_days
  FROM status_years
  CROSS JOIN generate_series(1, 12) AS month_value
  JOIN hr.employee_status_history history
    ON history.tenant_id = status_years.tenant_id
   AND history.employee_id = status_years.employee_id
  JOIN hr.functional_status functional_status
    ON functional_status.id = history.functional_status_id
   AND functional_status.enters_payroll = true
  WHERE history.starts_on <= (make_date(status_years.reference_year, month_value, 1) + INTERVAL '1 month - 1 day')::date
    AND COALESCE(history.ends_on, make_date(status_years.reference_year, 12, 31)) >= make_date(status_years.reference_year, month_value, 1)
  GROUP BY
    status_years.tenant_id,
    status_years.employee_id,
    status_years.employment_link_id,
    status_years.reference_year,
    month_value
)
SELECT
  tenant_id,
  employee_id,
  employment_link_id,
  reference_year,
  COUNT(*) FILTER (WHERE active_days >= 15)::integer AS avos
FROM month_activity
GROUP BY tenant_id, employee_id, employment_link_id, reference_year;

CREATE OR REPLACE FUNCTION payroll_calc.compute_decimo_terceiro(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_kind text,
  p_reference_year integer
)
RETURNS TABLE (
  avos integer,
  base numeric(14, 2),
  installment_amount numeric(14, 2),
  first_installment_discount numeric(14, 2),
  irrf_amount numeric(14, 2)
)
LANGUAGE plpgsql
VOLATILE
SET search_path = payroll_calc, payroll, hr, public, pg_catalog
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

CREATE OR REPLACE FUNCTION payroll_calc.f_decimo_terceiro_base(
  p_employee_id uuid,
  p_month integer DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT payroll_calc.base_salary(p_employee_id, make_date(p_year, p_month, 1));
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_type',
    'processing_type',
    'payroll_earning_deduction',
    'payroll_run',
    'payroll_run_status_history',
    'employee_payroll_item',
    'payroll_financial_record',
    'payroll_run_work_location'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'calc04_' || table_name || '_execute', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute''])))',
      'calc04_' || table_name || '_execute',
      table_name
    );
  END LOOP;

  FOREACH table_name IN ARRAY ARRAY[
    'employee',
    'employee_status_history',
    'functional_status',
    'salary_reference'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'calc04_' || table_name || '_execute_read', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute''])))',
      'calc04_' || table_name || '_execute_read',
      table_name
    );
  END LOOP;
END
$$;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('payroll.run.execute', 'payroll', 'run', 'execute', '/api/v1/folhas/decimo-terceiro/**', 'Execute payroll processing runs, including decimo terceiro.')
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('FOLHA_OPERADOR', 'payroll.run.execute')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile
  ON access_profile.code = profile_permissions.profile_code
JOIN public.permission
  ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
DECLARE
  v_tenant_id uuid;
  v_payroll_type_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenant LOOP
    INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
    VALUES (v_tenant_id, 'DECIMO_TERCEIRO', 'Decimo terceiro salario', 'ACTIVE'::public."RecordStatus")
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = now()
    RETURNING id INTO v_payroll_type_id;

    INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
    VALUES
      (v_tenant_id, 'DECIMO_TERCEIRO_ADIANTAMENTO', 'Decimo terceiro - primeira parcela', v_payroll_type_id, 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'DECIMO_TERCEIRO_FECHAMENTO', 'Decimo terceiro - fechamento', v_payroll_type_id, 'ACTIVE'::public."RecordStatus")
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET description = EXCLUDED.description,
        payroll_type_id = EXCLUDED.payroll_type_id,
        status = EXCLUDED.status,
        updated_at = now();

    INSERT INTO payroll.payroll_earning_deduction (
      tenant_id,
      code,
      description,
      kind,
      taxable,
      active,
      incidences,
      starts_on,
      formula_alias,
      formula_function_name,
      formula_expression,
      formula_dependencies,
      formula_ready
    )
    VALUES
      (v_tenant_id, 'DECIMO_TERCEIRO_BASE', 'Base de calculo do decimo terceiro', 'BASE'::public."PayrollEntryKind", false, true, '{"thirteenth_salary_base":true}', DATE '2025-01-01', 'decimo_terceiro_base', 'f_decimo_terceiro_base', NULL, ARRAY['SALARIO_BASE'], true),
      (v_tenant_id, 'DECIMO_TERCEIRO_ADIANTAMENTO', 'Decimo terceiro salario - primeira parcela', 'EARNING'::public."PayrollEntryKind", false, true, '{"thirteenth_salary":true}', DATE '2025-01-01', NULL, NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'DECIMO_TERCEIRO_FECHAMENTO', 'Decimo terceiro salario - fechamento', 'EARNING'::public."PayrollEntryKind", true, true, '{"thirteenth_salary":true,"income_tax_exclusive":true}', DATE '2025-01-01', NULL, NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'IRRF_13', 'IRRF exclusivo sobre decimo terceiro salario', 'DEDUCTION'::public."PayrollEntryKind", false, true, '{"income_tax":true,"income_tax_exclusive":true}', DATE '2025-01-01', NULL, NULL, NULL, ARRAY[]::text[], false)
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET description = EXCLUDED.description,
        kind = EXCLUDED.kind,
        taxable = EXCLUDED.taxable,
        active = EXCLUDED.active,
        incidences = EXCLUDED.incidences,
        starts_on = EXCLUDED.starts_on,
        formula_alias = EXCLUDED.formula_alias,
        formula_function_name = EXCLUDED.formula_function_name,
        formula_expression = EXCLUDED.formula_expression,
        formula_dependencies = EXCLUDED.formula_dependencies,
        formula_ready = EXCLUDED.formula_ready,
        formula_error = NULL,
        updated_at = now();

    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'CREATE',
      'payroll.decimo_terceiro',
      NULL,
      NULL::uuid,
      'migration',
      'migration',
      'payroll.processing_type',
      NULL,
      jsonb_build_object('event', 'calc04.decimo_terceiro.bootstrap', 'referenceYear', 2025),
      NULL::text,
      NULL::text,
      NULL::text
    );
  END LOOP;
END
$$;
