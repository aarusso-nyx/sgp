-- CLT-02 prior notice calculation and termination reflexes.

CREATE SCHEMA IF NOT EXISTS payment;

DO $$
BEGIN
  IF to_regtype('payment.prior_notice_kind') IS NULL THEN
    CREATE TYPE payment.prior_notice_kind AS ENUM ('WORKED', 'INDEMNIFIED', 'NONE');
  END IF;
  IF to_regtype('payment.prior_notice_reduction_mode') IS NULL THEN
    CREATE TYPE payment.prior_notice_reduction_mode AS ENUM ('TWO_HOURS_DAY', 'SEVEN_FINAL_DAYS', 'NONE');
  END IF;
END
$$;

CREATE TABLE payment.prior_notice (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  employment_link_id uuid NOT NULL,
  kind payment.prior_notice_kind NOT NULL,
  notice_days integer NOT NULL,
  projected_end_date date NOT NULL,
  base_amount numeric(14,2) NOT NULL,
  reduction_mode payment.prior_notice_reduction_mode NOT NULL DEFAULT 'NONE',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prior_notice_pkey PRIMARY KEY (tenant_id, employment_link_id),
  CONSTRAINT prior_notice_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id)
    REFERENCES hr.employment_link(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT prior_notice_notice_days_check CHECK (notice_days BETWEEN 0 AND 90),
  CONSTRAINT prior_notice_base_amount_check CHECK (base_amount >= 0)
);

CREATE INDEX prior_notice_tenant_kind_idx
  ON payment.prior_notice (tenant_id, kind);

CREATE OR REPLACE FUNCTION payment.sgp_prior_notice_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    'payment.prior_notice',
    COALESCE(after_json ->> 'employment_link_id', before_json ->> 'employment_link_id'),
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'payment.prior_notice',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS prior_notice_audit ON payment.prior_notice;
CREATE TRIGGER prior_notice_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.prior_notice
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_prior_notice_audit();

ALTER TABLE payment.prior_notice ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.prior_notice FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prior_notice_select ON payment.prior_notice;
CREATE POLICY prior_notice_select ON payment.prior_notice
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.run.read', 'payroll.run.write'])
    )
  );

DROP POLICY IF EXISTS prior_notice_write ON payment.prior_notice;
CREATE POLICY prior_notice_write ON payment.prior_notice
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.run.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.run.write'])
    )
  );

CREATE OR REPLACE FUNCTION payment.compute_prior_notice_days(
  p_employment_link_id uuid,
  p_termination_date date
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = payment, hr, public, pg_catalog
AS $$
DECLARE
  v_hired_on date;
  v_full_years integer;
BEGIN
  SELECT employee.hired_on
  INTO v_hired_on
  FROM hr.employee employee
  WHERE employee.tenant_id = public.sgp_current_tenant_uuid()
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.updated_at DESC
  LIMIT 1;

  IF v_hired_on IS NULL OR p_termination_date IS NULL THEN
    RETURN 0;
  END IF;

  v_full_years := GREATEST(EXTRACT(YEAR FROM age(p_termination_date, v_hired_on))::integer, 0);
  RETURN LEAST(90, 30 + (v_full_years * 3));
END;
$$;

CREATE OR REPLACE FUNCTION payment.compute_prior_notice(
  p_employment_link_id uuid,
  p_termination_date date,
  p_kind payment.prior_notice_kind,
  p_reduction_mode payment.prior_notice_reduction_mode DEFAULT 'NONE'
)
RETURNS TABLE (
  notice_days integer,
  projected_end_date date,
  base_amount numeric(14,2)
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payment, payroll_calc, payroll, hr, public, pg_catalog
AS $$
DECLARE
  v_tenant_id uuid := public.sgp_current_tenant_uuid();
  v_link hr.employment_link%ROWTYPE;
  v_employee hr.employee%ROWTYPE;
  v_kind payment.prior_notice_kind := COALESCE(p_kind, 'NONE'::payment.prior_notice_kind);
  v_notice_days integer := 0;
  v_projected_end date;
  v_base numeric(14,2) := 0;
BEGIN
  SELECT *
  INTO v_link
  FROM hr.employment_link link
  WHERE link.tenant_id = v_tenant_id
    AND link.id = p_employment_link_id;

  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'Employment link % not found for tenant %', p_employment_link_id, v_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee employee
  WHERE employee.tenant_id = v_tenant_id
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.updated_at DESC
  LIMIT 1;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'No employee found for employment link %', p_employment_link_id
      USING ERRCODE = 'P0002';
  END IF;

  IF lower(COALESCE(v_link.contract_type, '')) NOT IN ('celetista', 'clt') THEN
    DELETE FROM payment.prior_notice notice
    WHERE notice.tenant_id = v_tenant_id
      AND notice.employment_link_id = p_employment_link_id;
    notice_days := 0;
    projected_end_date := p_termination_date;
    base_amount := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_kind <> 'NONE'::payment.prior_notice_kind THEN
    v_notice_days := payment.compute_prior_notice_days(p_employment_link_id, p_termination_date);
    v_base := round(payroll_calc.base_salary(v_employee.id, p_termination_date), 2)::numeric(14,2);
  END IF;

  v_projected_end := CASE
    WHEN v_kind = 'INDEMNIFIED'::payment.prior_notice_kind THEN p_termination_date + GREATEST(v_notice_days - 1, 0)
    WHEN v_kind = 'WORKED'::payment.prior_notice_kind THEN p_termination_date
    ELSE p_termination_date
  END;

  INSERT INTO payment.prior_notice (
    tenant_id,
    employment_link_id,
    kind,
    notice_days,
    projected_end_date,
    base_amount,
    reduction_mode
  )
  VALUES (
    v_tenant_id,
    p_employment_link_id,
    v_kind,
    v_notice_days,
    v_projected_end,
    v_base,
    COALESCE(p_reduction_mode, 'NONE'::payment.prior_notice_reduction_mode)
  )
  ON CONFLICT (tenant_id, employment_link_id) DO UPDATE
  SET kind = EXCLUDED.kind,
      notice_days = EXCLUDED.notice_days,
      projected_end_date = EXCLUDED.projected_end_date,
      base_amount = EXCLUDED.base_amount,
      reduction_mode = EXCLUDED.reduction_mode,
      created_at = now();

  notice_days := v_notice_days;
  projected_end_date := v_projected_end;
  base_amount := v_base;
  RETURN NEXT;
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
SET search_path = payroll_calc, payroll, payment, hr, public, pg_catalog
AS $$
DECLARE
  v_employee hr.employee%ROWTYPE;
  v_link hr.employment_link%ROWTYPE;
  v_notice payment.prior_notice%ROWTYPE;
  v_base_rubrica_id uuid;
  v_base_amount numeric(14, 2);
  v_balance_salary numeric(14, 2);
  v_effective_end_date date;
  v_thirteenth_avos integer;
  v_thirteenth numeric(14, 2);
  v_service_months integer;
  v_vested_periods integer;
  v_proportional_avos integer;
  v_vested_vacation numeric(14, 2);
  v_vested_vacation_third numeric(14, 2);
  v_proportional_vacation numeric(14, 2);
  v_proportional_vacation_third numeric(14, 2);
  v_notice_amount numeric(14, 2) := 0;
  v_notice_deduction numeric(14, 2) := 0;
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

  SELECT *
  INTO v_notice
  FROM payment.prior_notice notice
  WHERE notice.tenant_id = p_tenant_id
    AND notice.employment_link_id = p_employment_link_id;

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
  v_effective_end_date := CASE
    WHEN v_is_clt
     AND v_notice.kind = 'INDEMNIFIED'::payment.prior_notice_kind
     AND upper(COALESCE(p_cause, '')) = 'SEM_JUSTA_CAUSA'
      THEN COALESCE(v_notice.projected_end_date, p_termination_date)
    ELSE p_termination_date
  END;

  v_balance_salary := round(COALESCE(v_base_amount, 0) / 30 * EXTRACT(DAY FROM p_termination_date), 2)::numeric(14, 2);
  v_thirteenth_avos := payroll_calc.termination_avos(v_employee.hired_on, v_effective_end_date, EXTRACT(YEAR FROM v_effective_end_date)::integer);
  v_thirteenth := round(COALESCE(v_base_amount, 0) * v_thirteenth_avos / 12, 2)::numeric(14, 2);
  v_service_months := GREATEST(
    (EXTRACT(YEAR FROM age(v_effective_end_date, COALESCE(v_employee.hired_on, v_effective_end_date)))::integer * 12)
      + EXTRACT(MONTH FROM age(v_effective_end_date, COALESCE(v_employee.hired_on, v_effective_end_date)))::integer,
    0
  );
  v_vested_periods := floor(v_service_months / 12)::integer;
  v_proportional_avos := LEAST(mod(v_service_months, 12) + CASE WHEN EXTRACT(DAY FROM v_effective_end_date) >= 15 THEN 1 ELSE 0 END, 12);
  v_vested_vacation := round(COALESCE(v_base_amount, 0) * v_vested_periods, 2)::numeric(14, 2);
  v_vested_vacation_third := round(v_vested_vacation / 3, 2)::numeric(14, 2);
  v_proportional_vacation := round(COALESCE(v_base_amount, 0) * v_proportional_avos / 12, 2)::numeric(14, 2);
  v_proportional_vacation_third := round(v_proportional_vacation / 3, 2)::numeric(14, 2);

  IF v_is_clt
     AND v_notice.kind = 'INDEMNIFIED'::payment.prior_notice_kind
     AND upper(COALESCE(p_cause, '')) = 'SEM_JUSTA_CAUSA' THEN
    v_notice_amount := round(COALESCE(v_notice.base_amount, v_base_amount, 0) / 30 * v_notice.notice_days, 2)::numeric(14, 2);
  ELSIF v_is_clt
     AND v_notice.kind = 'INDEMNIFIED'::payment.prior_notice_kind
     AND upper(COALESCE(p_cause, '')) = 'PEDIDO_DEMISSAO' THEN
    v_notice_deduction := round(COALESCE(v_notice.base_amount, v_base_amount, 0) / 30 * v_notice.notice_days, 2)::numeric(14, 2);
  END IF;

  v_gross := round(
    v_balance_salary
    + v_thirteenth
    + v_vested_vacation
    + v_vested_vacation_third
    + v_proportional_vacation
    + v_proportional_vacation_third
    + v_notice_amount,
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
  metadata := jsonb_build_object('origin', 'thirteenth_proportional', 'avos', v_thirteenth_avos, 'projectedEndDate', v_effective_end_date);
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
    metadata := jsonb_build_object('origin', 'vacation_proportional', 'avos', v_proportional_avos, 'projectedEndDate', v_effective_end_date);
    RETURN NEXT;

    item_code := 'RESC_FERIAS_TERCO';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_proportional_vacation_third;
    reference_value := v_proportional_vacation;
    quantity := v_proportional_avos;
    metadata := jsonb_build_object('origin', 'vacation_proportional_one_third', 'avos', v_proportional_avos);
    RETURN NEXT;
  END IF;

  IF v_notice_amount > 0 THEN
    item_code := 'RESC_AVISO_PREVIO';
    item_kind := 'EARNING'::public."PayrollEntryKind";
    amount := v_notice_amount;
    reference_value := COALESCE(v_notice.base_amount, v_base_amount);
    quantity := v_notice.notice_days;
    metadata := jsonb_build_object('origin', 'indemnified_notice', 'kind', v_notice.kind, 'cause', p_cause, 'fgtsBase', true, 'projectedEndDate', v_notice.projected_end_date);
    RETURN NEXT;
  END IF;

  IF v_notice_deduction > 0 THEN
    item_code := 'RESC_AVISO_PREVIO_DESCONTO';
    item_kind := 'DEDUCTION'::public."PayrollEntryKind";
    amount := v_notice_deduction;
    reference_value := COALESCE(v_notice.base_amount, v_base_amount);
    quantity := v_notice.notice_days;
    metadata := jsonb_build_object('origin', 'unworked_notice_discount', 'kind', v_notice.kind, 'cause', p_cause);
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

CREATE OR REPLACE VIEW payroll.v_termination_with_notice
WITH (security_invoker = true) AS
SELECT
  component.*,
  notice.kind AS prior_notice_kind,
  notice.notice_days AS prior_notice_days,
  notice.projected_end_date AS prior_notice_projected_end_date,
  notice.base_amount AS prior_notice_base_amount,
  notice.reduction_mode AS prior_notice_reduction_mode
FROM payroll.v_termination_components component
LEFT JOIN payment.prior_notice notice
  ON notice.tenant_id = component.tenant_id
 AND notice.employment_link_id = component.employment_link_id
WHERE public.sgp_tenant_matches(component.tenant_id)
  AND public.sgp_has_any_permission(ARRAY['payroll.run.read', 'payroll.run.write']);

DO $$
BEGIN
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
    formula_dependencies,
    formula_ready
  )
  SELECT
    tenant.id,
    'RESC_AVISO_PREVIO_DESCONTO',
    'Desconto de aviso previo nao cumprido',
    'DEDUCTION'::public."PayrollEntryKind",
    true,
    true,
    '{"termination":true,"clt":true,"notice":true}',
    DATE '2025-01-01',
    NULL,
    NULL,
    ARRAY[]::text[],
    false
  FROM public.tenant tenant
  ON CONFLICT (tenant_id, code) DO UPDATE
  SET description = EXCLUDED.description,
      kind = EXCLUDED.kind,
      taxable = EXCLUDED.taxable,
      active = EXCLUDED.active,
      incidences = EXCLUDED.incidences,
      updated_at = now();
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA payment TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.prior_notice TO sgp_app_role;
    GRANT SELECT ON payroll.v_termination_with_notice TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION payment.compute_prior_notice_days(uuid, date) TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION payment.compute_prior_notice(uuid, date, payment.prior_notice_kind, payment.prior_notice_reduction_mode) TO sgp_app_role;
  END IF;
END
$$;
