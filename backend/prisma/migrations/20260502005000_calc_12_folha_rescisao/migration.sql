-- CALC-12 termination payroll calculation.

ALTER TABLE hr.employment_link
  ADD COLUMN IF NOT EXISTS termination_payroll_run_id uuid;

ALTER TABLE hr.employment_link
  DROP CONSTRAINT IF EXISTS employment_link_termination_payroll_run_id_fkey,
  ADD CONSTRAINT employment_link_termination_payroll_run_id_fkey
    FOREIGN KEY (termination_payroll_run_id) REFERENCES payroll.payroll_run(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS employment_link_termination_payroll_run_id_idx
  ON hr.employment_link(termination_payroll_run_id);

CREATE OR REPLACE FUNCTION payroll_calc.f_termination_base(
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

CREATE OR REPLACE FUNCTION payroll_calc.termination_avos(
  p_starts_on date,
  p_termination_date date,
  p_reference_year integer
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
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

CREATE OR REPLACE FUNCTION payroll_calc.compute_rescisao(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_termination_date date,
  p_cause text
)
RETURNS TABLE (
  item_code text,
  item_kind public."PayrollEntryKind",
  amount numeric(14, 2),
  reference_value numeric(14, 2),
  quantity numeric(12, 4),
  metadata jsonb
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payroll_calc, payroll, hr, public, pg_catalog
AS $$
DECLARE
  v_employee hr.employee%ROWTYPE;
  v_link hr.employment_link%ROWTYPE;
  v_base_rubrica_id uuid;
  v_base_amount numeric(14, 2);
  v_balance_salary numeric(14, 2);
  v_thirteenth_avos integer;
  v_thirteenth numeric(14, 2);
  v_service_months integer;
  v_vested_periods integer;
  v_proportional_avos integer;
  v_vested_vacation numeric(14, 2);
  v_vested_vacation_third numeric(14, 2);
  v_proportional_vacation numeric(14, 2);
  v_proportional_vacation_third numeric(14, 2);
  v_notice numeric(14, 2) := 0;
  v_fgts_fine numeric(14, 2) := 0;
  v_rpps_base numeric(14, 2) := 0;
  v_rpps numeric(14, 2) := 0;
  v_irrf_base numeric(14, 2) := 0;
  v_irrf numeric(14, 2) := 0;
  v_gross numeric(14, 2) := 0;
  v_is_clt boolean;
  v_is_statutory boolean;
BEGIN
  SELECT *
  INTO v_link
  FROM hr.employment_link link
  WHERE link.id = p_employment_link_id
    AND link.tenant_id = p_tenant_id;

  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'Employment link % not found for tenant %', p_employment_link_id, p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee employee
  WHERE employee.tenant_id = p_tenant_id
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.terminated_on DESC NULLS LAST, employee.updated_at DESC
  LIMIT 1;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'No employee found for employment link %', p_employment_link_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT ped.id
  INTO v_base_rubrica_id
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.tenant_id = p_tenant_id
    AND ped.code = 'RESCISAO_BASE'
    AND ped.formula_ready = true
  LIMIT 1;

  IF v_base_rubrica_id IS NOT NULL THEN
    v_base_amount := payroll_calc.evaluate_earning_deduction(
      v_base_rubrica_id,
      v_employee.id,
      EXTRACT(MONTH FROM p_termination_date)::integer,
      EXTRACT(YEAR FROM p_termination_date)::integer
    );
  ELSE
    v_base_amount := round(payroll_calc.base_salary(v_employee.id, p_termination_date), 2)::numeric(14, 2);
  END IF;

  v_is_clt := lower(COALESCE(v_link.contract_type, '')) IN ('celetista', 'clt');
  v_is_statutory := lower(COALESCE(v_link.contract_type, '')) = 'statutory';
  v_balance_salary := round(COALESCE(v_base_amount, 0) / 30 * EXTRACT(DAY FROM p_termination_date), 2)::numeric(14, 2);
  v_thirteenth_avos := payroll_calc.termination_avos(v_employee.hired_on, p_termination_date, EXTRACT(YEAR FROM p_termination_date)::integer);
  v_thirteenth := round(COALESCE(v_base_amount, 0) * v_thirteenth_avos / 12, 2)::numeric(14, 2);
  v_service_months := GREATEST(
    (EXTRACT(YEAR FROM age(p_termination_date, COALESCE(v_employee.hired_on, p_termination_date)))::integer * 12)
      + EXTRACT(MONTH FROM age(p_termination_date, COALESCE(v_employee.hired_on, p_termination_date)))::integer,
    0
  );
  v_vested_periods := floor(v_service_months / 12)::integer;
  v_proportional_avos := LEAST(mod(v_service_months, 12) + CASE WHEN EXTRACT(DAY FROM p_termination_date) >= 15 THEN 1 ELSE 0 END, 12);
  v_vested_vacation := round(COALESCE(v_base_amount, 0) * v_vested_periods, 2)::numeric(14, 2);
  v_vested_vacation_third := round(v_vested_vacation / 3, 2)::numeric(14, 2);
  v_proportional_vacation := round(COALESCE(v_base_amount, 0) * v_proportional_avos / 12, 2)::numeric(14, 2);
  v_proportional_vacation_third := round(v_proportional_vacation / 3, 2)::numeric(14, 2);

  IF v_is_clt AND upper(COALESCE(p_cause, '')) = 'SEM_JUSTA_CAUSA' THEN
    v_notice := round(COALESCE(v_base_amount, 0), 2)::numeric(14, 2);
    v_fgts_fine := round((COALESCE(v_base_amount, 0) * 0.08 * GREATEST(v_service_months, 1)) * 0.40, 2)::numeric(14, 2);
  END IF;

  v_gross := round(
    v_balance_salary
    + v_thirteenth
    + v_vested_vacation
    + v_vested_vacation_third
    + v_proportional_vacation
    + v_proportional_vacation_third
    + v_notice
    + v_fgts_fine,
    2
  )::numeric(14, 2);

  IF v_is_statutory THEN
    v_rpps_base := round(v_balance_salary + v_thirteenth, 2)::numeric(14, 2);
    v_rpps := payroll_calc.compute_rpps(p_tenant_id, p_employment_link_id, v_rpps_base, p_termination_date);
  END IF;

  v_irrf_base := round(v_gross - v_rpps, 2)::numeric(14, 2);
  v_irrf := payroll_calc.compute_irrf(
    p_tenant_id,
    v_irrf_base,
    payroll_calc.dependent_count(v_employee.id)::integer,
    p_termination_date
  );

  item_code := 'RESC_SALDO';
  item_kind := 'EARNING'::public."PayrollEntryKind";
  amount := v_balance_salary;
  reference_value := v_base_amount;
  quantity := EXTRACT(DAY FROM p_termination_date);
  metadata := jsonb_build_object('origin', 'salary_balance', 'terminationDate', p_termination_date);
  RETURN NEXT;

  item_code := 'RESC_13_PROP';
  item_kind := 'EARNING'::public."PayrollEntryKind";
  amount := v_thirteenth;
  reference_value := v_base_amount;
  quantity := v_thirteenth_avos;
  metadata := jsonb_build_object('origin', 'thirteenth_proportional', 'avos', v_thirteenth_avos);
  RETURN NEXT;

  IF v_vested_vacation > 0 THEN
    item_code := 'RESC_FERIAS_VENCIDAS';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_vested_vacation;
    reference_value := v_base_amount;
    quantity := v_vested_periods;
    metadata := jsonb_build_object('origin', 'vested_vacation', 'periods', v_vested_periods);
    RETURN NEXT;

    item_code := 'RESC_FERIAS_VENCIDAS_TERCO';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_vested_vacation_third;
    reference_value := v_vested_vacation;
    quantity := v_vested_periods;
    metadata := jsonb_build_object('origin', 'vested_vacation_one_third', 'periods', v_vested_periods);
    RETURN NEXT;
  END IF;

  IF v_proportional_vacation > 0 THEN
    item_code := 'RESC_FERIAS_PROP';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_proportional_vacation;
    reference_value := v_base_amount;
    quantity := v_proportional_avos;
    metadata := jsonb_build_object('origin', 'vacation_proportional', 'avos', v_proportional_avos);
    RETURN NEXT;

    item_code := 'RESC_FERIAS_TERCO';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_proportional_vacation_third;
    reference_value := v_proportional_vacation;
    quantity := v_proportional_avos;
    metadata := jsonb_build_object('origin', 'vacation_proportional_one_third', 'avos', v_proportional_avos);
    RETURN NEXT;
  END IF;

  IF v_notice > 0 THEN
    item_code := 'RESC_AVISO_PREVIO';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_notice;
    reference_value := v_base_amount;
    quantity := 30;
    metadata := jsonb_build_object('origin', 'indemnified_notice', 'cause', p_cause);
    RETURN NEXT;
  END IF;

  IF v_fgts_fine > 0 THEN
    item_code := 'RESC_MULTA_FGTS_40';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_fgts_fine;
    reference_value := round(COALESCE(v_base_amount, 0) * 0.08 * GREATEST(v_service_months, 1), 2)::numeric(14, 2);
    quantity := 0.4000;
    metadata := jsonb_build_object('origin', 'fgts_fine_40', 'serviceMonths', v_service_months, 'cause', p_cause);
    RETURN NEXT;
  END IF;

  IF v_rpps > 0 THEN
    item_code := 'RPPS';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_rpps;
    reference_value := v_rpps_base;
    quantity := 1;
    metadata := jsonb_build_object('origin', 'statutory_rpps', 'regime', v_link.contract_type);
    RETURN NEXT;
  END IF;

  IF v_irrf > 0 THEN
    item_code := 'IRRF_RESCISAO';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_irrf;
    reference_value := v_irrf_base;
    quantity := 1;
    metadata := jsonb_build_object('origin', 'termination_exclusive_irrf', 'exclusiveTaxation', true);
    RETURN NEXT;
  END IF;
END;
$$;

CREATE OR REPLACE VIEW payroll.v_termination_components
WITH (security_invoker = true) AS
SELECT
  item.tenant_id,
  item.payroll_run_id,
  item.employee_id,
  employee.employment_link_id,
  earning.code AS component_code,
  earning.description AS component_description,
  earning.kind AS component_kind,
  item.reference_value,
  item.quantity,
  item.amount,
  item.notes,
  item.created_at
FROM payroll.v_payroll_run_line_active item
JOIN payroll.payroll_earning_deduction earning
  ON earning.id = item.earning_deduction_id
JOIN payroll.payroll_run run
  ON run.id = item.payroll_run_id
JOIN payroll.processing_type processing_type
  ON processing_type.id = run.processing_type_id
JOIN hr.employee employee
  ON employee.id = item.employee_id
WHERE processing_type.code = 'RESCISAO'
  AND public.sgp_tenant_matches(item.tenant_id)
  AND public.sgp_has_any_permission(ARRAY['payroll.run.execute', 'rh.employee.terminate', 'portal.paystub.read']);

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
    'payroll_financial_record'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'calc12_' || table_name || '_execute', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'', ''rh.employee.terminate'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'', ''rh.employee.terminate''])))',
      'calc12_' || table_name || '_execute',
      table_name
    );
  END LOOP;

  FOREACH table_name IN ARRAY ARRAY[
    'employee',
    'employment_link',
    'employee_status_history',
    'functional_status',
    'salary_reference',
    'employee_dependent'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'calc12_' || table_name || '_termination_payroll', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'', ''rh.employee.terminate'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'', ''rh.employee.terminate''])))',
      'calc12_' || table_name || '_termination_payroll',
      table_name
    );
  END LOOP;
END
$$;

ALTER TABLE public.tax_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rate FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calc12_tax_rate_payroll_select ON public.tax_rate;
CREATE POLICY calc12_tax_rate_payroll_select ON public.tax_rate
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.run.execute', 'rh.employee.terminate'])
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT ON payroll.v_termination_components TO sgp_app_role;
  END IF;
END
$$;

DO $$
DECLARE
  v_tenant_id uuid;
  v_payroll_type_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenant LOOP
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

    INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
    VALUES (v_tenant_id, 'RESCISAO', 'Folha de rescisao', 'ACTIVE'::public."RecordStatus")
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = now()
    RETURNING id INTO v_payroll_type_id;

    INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
    VALUES (v_tenant_id, 'RESCISAO', 'Folha de rescisao', v_payroll_type_id, 'ACTIVE'::public."RecordStatus")
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET description = EXCLUDED.description,
        payroll_type_id = EXCLUDED.payroll_type_id,
        status = EXCLUDED.status,
        updated_at = now();

    INSERT INTO payroll.payroll_earning_deduction (
      tenant_id, code, description, kind, taxable, active, incidences, starts_on,
      formula_alias, formula_function_name, formula_dependencies, formula_ready
    )
    VALUES
      (v_tenant_id, 'RESCISAO_BASE', 'Base de calculo de rescisao', 'BASE'::public."PayrollEntryKind", false, true, '{"termination_base":true}', DATE '2025-01-01', 'termination_base', 'f_termination_base', ARRAY['SALARIO_BASE'], true),
      (v_tenant_id, 'RESC_SALDO', 'Saldo de salario de rescisao', 'EARNING'::public."PayrollEntryKind", true, true, '{"termination":true,"income_tax":true,"rpps":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'RESC_13_PROP', 'Decimo terceiro proporcional de rescisao', 'EARNING'::public."PayrollEntryKind", true, true, '{"termination":true,"thirteenth_salary":true,"income_tax_exclusive":true,"rpps":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'RESC_FERIAS_VENCIDAS', 'Ferias vencidas de rescisao', 'EARNING'::public."PayrollEntryKind", true, true, '{"termination":true,"vacation":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'RESC_FERIAS_VENCIDAS_TERCO', 'Terco de ferias vencidas de rescisao', 'EARNING'::public."PayrollEntryKind", true, true, '{"termination":true,"vacation":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'RESC_FERIAS_PROP', 'Ferias proporcionais de rescisao', 'EARNING'::public."PayrollEntryKind", true, true, '{"termination":true,"vacation":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'RESC_FERIAS_TERCO', 'Terco de ferias proporcionais de rescisao', 'EARNING'::public."PayrollEntryKind", true, true, '{"termination":true,"vacation":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'RESC_AVISO_PREVIO', 'Aviso previo indenizado de rescisao', 'EARNING'::public."PayrollEntryKind", true, true, '{"termination":true,"clt":true,"income_tax":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'RESC_MULTA_FGTS_40', 'Multa de 40 por cento do FGTS', 'EARNING'::public."PayrollEntryKind", false, true, '{"termination":true,"clt":true,"fgts":true,"indemnity":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'IRRF_RESCISAO', 'IRRF exclusivo sobre rescisao', 'DEDUCTION'::public."PayrollEntryKind", false, true, '{"termination":true,"income_tax":true,"income_tax_exclusive":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'RPPS', 'Contribuicao previdenciaria RPPS', 'DEDUCTION'::public."PayrollEntryKind", false, true, '{"rpps":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false)
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET description = EXCLUDED.description,
        kind = EXCLUDED.kind,
        taxable = EXCLUDED.taxable,
        active = EXCLUDED.active,
        incidences = EXCLUDED.incidences,
        formula_alias = EXCLUDED.formula_alias,
        formula_function_name = EXCLUDED.formula_function_name,
        formula_dependencies = EXCLUDED.formula_dependencies,
        formula_ready = EXCLUDED.formula_ready,
        formula_error = NULL,
        updated_at = now();

    PERFORM public.sgp_append_audit_event(
      'CREATE',
      'payroll.termination',
      NULL,
      NULL::uuid,
      'migration',
      'migration',
      'payroll.processing_type',
      NULL,
      jsonb_build_object('event', 'calc12.termination.bootstrap'),
      NULL::text,
      NULL::text,
      NULL::text
    );
  END LOOP;
END
$$;
