-- CALC-05 vacation payroll integration.

ALTER TABLE hr.vacation_record
  ADD COLUMN IF NOT EXISTS payroll_run_id uuid;

ALTER TABLE hr.vacation_record
  DROP CONSTRAINT IF EXISTS vacation_record_payroll_run_id_fkey,
  ADD CONSTRAINT vacation_record_payroll_run_id_fkey
    FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS vacation_record_payroll_run_id_idx
  ON hr.vacation_record(payroll_run_id);

CREATE INDEX IF NOT EXISTS vacation_record_payroll_trigger_idx
  ON hr.vacation_record(tenant_id, starts_on, payroll_run_id)
  WHERE payroll_run_id IS NULL AND status IN ('programado', 'aprovado');

ALTER TABLE hr.vacation_record
  DROP CONSTRAINT IF EXISTS vacation_record_status_check,
  ADD CONSTRAINT vacation_record_status_check
    CHECK (status IN ('programado', 'aprovado', 'gozado', 'cancelado', 'paid'));

CREATE OR REPLACE FUNCTION payroll_calc.f_vacation_base(
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

CREATE OR REPLACE FUNCTION payroll_calc.compute_ferias(
  p_tenant_id uuid,
  p_vacation_record_id uuid
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
SET search_path = payroll_calc, payroll, hr, public, pg_catalog
AS $$
DECLARE
  v_record hr.vacation_record%ROWTYPE;
  v_employee hr.employee%ROWTYPE;
  v_base_rubrica_id uuid;
  v_base_amount numeric(14, 2);
  v_daily_amount numeric;
  v_salary_amount numeric(14, 2);
  v_one_third_amount numeric(14, 2);
  v_bonus_amount numeric(14, 2);
  v_rpps_base numeric(14, 2);
  v_rpps_amount numeric(14, 2);
  v_irrf_base numeric(14, 2);
  v_irrf_amount numeric(14, 2);
  v_competence date;
BEGIN
  SELECT *
  INTO v_record
  FROM hr.vacation_record
  WHERE id = p_vacation_record_id
    AND tenant_id = p_tenant_id;

  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Vacation record % not found for tenant %', p_vacation_record_id, p_tenant_id;
  END IF;

  IF v_record.status = 'cancelado' THEN
    RAISE EXCEPTION 'Canceled vacation record % cannot be paid', p_vacation_record_id;
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee
  WHERE id = v_record.employee_id
    AND tenant_id = p_tenant_id;

  IF v_employee.id IS NULL OR v_employee.employment_link_id IS NULL THEN
    RAISE EXCEPTION 'Vacation employee % is not payroll-ready', v_record.employee_id;
  END IF;

  v_competence := date_trunc('month', v_record.starts_on)::date;

  SELECT ped.id
  INTO v_base_rubrica_id
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.tenant_id = p_tenant_id
    AND ped.code = 'VACATION_BASE'
    AND ped.formula_ready = true
  LIMIT 1;

  IF v_base_rubrica_id IS NOT NULL THEN
    v_base_amount := payroll_calc.evaluate_earning_deduction(
      v_base_rubrica_id,
      v_record.employee_id,
      EXTRACT(MONTH FROM v_competence)::integer,
      EXTRACT(YEAR FROM v_competence)::integer
    );
  ELSE
    v_base_amount := round(payroll_calc.base_salary(v_record.employee_id, v_competence), 2)::numeric(14, 2);
  END IF;

  v_daily_amount := COALESCE(v_base_amount, 0) / 30;
  v_salary_amount := round(v_daily_amount * GREATEST(COALESCE(v_record.days, 0), 0), 2)::numeric(14, 2);
  v_one_third_amount := round(v_salary_amount / 3, 2)::numeric(14, 2);
  v_bonus_amount := round(v_daily_amount * GREATEST(COALESCE(v_record.pecuniary_bonus_days, 0), 0), 2)::numeric(14, 2);
  v_rpps_base := round(v_salary_amount + v_bonus_amount, 2)::numeric(14, 2);
  v_rpps_amount := payroll_calc.compute_rpps(p_tenant_id, v_employee.employment_link_id, v_rpps_base, v_record.starts_on);
  v_irrf_base := round(v_salary_amount + v_one_third_amount + v_bonus_amount - v_rpps_amount, 2)::numeric(14, 2);
  v_irrf_amount := payroll_calc.compute_irrf(
    p_tenant_id,
    v_irrf_base,
    payroll_calc.dependent_count(v_record.employee_id)::integer,
    v_record.starts_on
  );

  item_code := 'VACATION_SALARY';
  item_kind := 'EARNING'::public."PayrollEntryKind";
  amount := v_salary_amount;
  reference_value := v_base_amount;
  quantity := v_record.days;
  metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code);
  RETURN NEXT;

  item_code := 'VACATION_ONE_THIRD';
  item_kind := 'EARNING'::public."PayrollEntryKind";
  amount := v_one_third_amount;
  reference_value := v_salary_amount;
  quantity := 1;
  metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code);
  RETURN NEXT;

  IF v_bonus_amount > 0 THEN
    item_code := 'VACATION_PECUNIARY_BONUS';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_bonus_amount;
    reference_value := v_base_amount;
    quantity := v_record.pecuniary_bonus_days;
    metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code);
    RETURN NEXT;
  END IF;

  IF v_rpps_amount > 0 THEN
    item_code := 'RPPS';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_rpps_amount;
    reference_value := v_rpps_base;
    quantity := 1;
    metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code, 'baseExcludesOneThird', true);
    RETURN NEXT;
  END IF;

  IF v_irrf_amount > 0 THEN
    item_code := 'IRRF_VACATION';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_irrf_amount;
    reference_value := v_irrf_base;
    quantity := 1;
    metadata := jsonb_build_object('vacationRecordId', p_vacation_record_id, 'component', item_code, 'exclusiveTaxation', true);
    RETURN NEXT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION payroll.process_due_vacation_payroll()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_record record;
  v_count integer := 0;
  v_payroll_type_id uuid;
  v_processing_type_id uuid;
  v_run_id uuid;
  v_year integer;
  v_month integer;
  v_totals record;
BEGIN
  FOR v_record IN
    SELECT vacation.id, vacation.tenant_id, vacation.employee_id, employee.branch_id, employee.functional_status_id, vacation.starts_on
    FROM hr.vacation_record vacation
    JOIN hr.employee employee ON employee.id = vacation.employee_id
    WHERE payroll_run_id IS NULL
      AND status IN ('programado', 'aprovado')
      AND starts_on - INTERVAL '30 days' <= CURRENT_DATE
    ORDER BY starts_on, id
  LOOP
    SELECT id INTO v_payroll_type_id
    FROM payroll.payroll_type
    WHERE tenant_id = v_record.tenant_id
      AND code = 'FERIAS'
    LIMIT 1;

    SELECT id INTO v_processing_type_id
    FROM payroll.processing_type
    WHERE tenant_id = v_record.tenant_id
      AND code = 'FERIAS'
    LIMIT 1;

    v_year := EXTRACT(YEAR FROM v_record.starts_on)::integer;
    v_month := EXTRACT(MONTH FROM v_record.starts_on)::integer;

    SELECT id INTO v_run_id
    FROM payroll.payroll_run
    WHERE tenant_id = v_record.tenant_id
      AND competence_year = v_year
      AND competence_month = v_month
      AND branch_id IS NULL
      AND payroll_type_id = v_payroll_type_id
      AND processing_type_id = v_processing_type_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_run_id IS NULL THEN
      INSERT INTO payroll.payroll_run (
        tenant_id, competence_year, competence_month, payroll_type_id,
        processing_type_id, branch_id, status
      )
      VALUES (
        v_record.tenant_id, v_year, v_month, v_payroll_type_id,
        v_processing_type_id, NULL, 'PROCESSING'::public."PayrollRunStatus"
      )
      RETURNING id INTO v_run_id;
    END IF;

    INSERT INTO payroll.employee_payroll_item (
      tenant_id, employee_id, payroll_run_id, earning_deduction_id, source,
      competence_year, competence_month, quantity, reference_value, amount, notes
    )
    SELECT
      v_record.tenant_id,
      v_record.employee_id,
      v_run_id,
      ped.id,
      'CALCULATED'::public."PayrollEntrySource",
      v_year,
      v_month,
      calc.quantity,
      calc.reference_value,
      calc.amount,
      'vacation_record_id=' || v_record.id::text
    FROM payroll_calc.compute_ferias(v_record.tenant_id, v_record.id) calc
    JOIN payroll.payroll_earning_deduction ped
      ON ped.tenant_id = v_record.tenant_id
     AND ped.code = calc.item_code;

    SELECT
      count(DISTINCT item.employee_id)::integer AS employee_count,
      coalesce(sum(CASE WHEN ed.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2) AS total_earnings,
      coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2) AS total_deductions,
      coalesce(sum(CASE
        WHEN ed.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount
        WHEN ed.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN -item.amount
        ELSE 0
      END), 0)::numeric(16, 2) AS total_net
    INTO v_totals
    FROM payroll.employee_payroll_item item
    JOIN payroll.payroll_earning_deduction ed ON ed.id = item.earning_deduction_id
    WHERE item.payroll_run_id = v_run_id;

    UPDATE payroll.payroll_run
    SET employee_count = v_totals.employee_count,
        total_earnings = v_totals.total_earnings,
        total_deductions = v_totals.total_deductions,
        total_net = v_totals.total_net,
        status = 'GENERATED'::public."PayrollRunStatus",
        updated_at = now()
    WHERE id = v_run_id;

    UPDATE hr.vacation_record
    SET payroll_run_id = v_run_id,
        status = 'paid',
        updated_at = now()
    WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
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
    'payroll_financial_record'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'calc05_' || table_name || '_execute', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'', ''rh.vacation.payout'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'', ''rh.vacation.payout''])))',
      'calc05_' || table_name || '_execute',
      table_name
    );
  END LOOP;

  FOREACH table_name IN ARRAY ARRAY[
    'employee',
    'employment_link',
    'salary_reference',
    'employee_dependent',
    'vacation_record'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'calc05_' || table_name || '_vacation_payroll', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'', ''rh.vacation.payout'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''payroll.run.execute'', ''rh.vacation.payout''])))',
      'calc05_' || table_name || '_vacation_payroll',
      table_name
    );
  END LOOP;
END
$$;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('rh.vacation.payout', 'rh', 'vacation', 'payout', '/api/v1/folhas/ferias/**', 'Calculate and pay scheduled vacation payroll.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('FOLHA_OPERADOR', 'rh.vacation.payout'),
    ('RH_OPERADOR', 'rh.vacation.payout')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile ON access_profile.code = profile_permissions.profile_code
JOIN public.permission ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
DECLARE
  v_tenant_id uuid;
  v_payroll_type_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenant LOOP
    INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
    VALUES (v_tenant_id, 'FERIAS', 'Folha de ferias', 'ACTIVE'::public."RecordStatus")
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = now()
    RETURNING id INTO v_payroll_type_id;

    INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
    VALUES (v_tenant_id, 'FERIAS', 'Folha de ferias', v_payroll_type_id, 'ACTIVE'::public."RecordStatus")
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
      (v_tenant_id, 'VACATION_BASE', 'Base de calculo de ferias', 'BASE'::public."PayrollEntryKind", false, true, '{"vacation_base":true}', DATE '2025-01-01', 'vacation_base', 'f_vacation_base', ARRAY['SALARIO_BASE'], true),
      (v_tenant_id, 'VACATION_SALARY', 'Ferias - salario do periodo', 'EARNING'::public."PayrollEntryKind", true, true, '{"vacation":true,"income_tax":true,"rpps":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'VACATION_ONE_THIRD', 'Terco constitucional de ferias', 'EARNING'::public."PayrollEntryKind", true, true, '{"vacation":true,"income_tax":true,"rpps":false}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'VACATION_PECUNIARY_BONUS', 'Abono pecuniario de ferias', 'EARNING'::public."PayrollEntryKind", true, true, '{"vacation":true,"income_tax":true,"rpps":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false),
      (v_tenant_id, 'IRRF_VACATION', 'IRRF exclusivo sobre ferias', 'DEDUCTION'::public."PayrollEntryKind", false, true, '{"income_tax":true,"income_tax_exclusive":true,"vacation":true}', DATE '2025-01-01', NULL, NULL, ARRAY[]::text[], false)
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
  END LOOP;
END
$$;
