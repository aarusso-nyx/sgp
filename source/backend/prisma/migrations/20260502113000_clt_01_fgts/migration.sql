CREATE SCHEMA IF NOT EXISTS payment;

DO $$
BEGIN
  IF to_regtype('payment.fgts_account_status') IS NULL THEN
    CREATE TYPE payment.fgts_account_status AS ENUM ('ACTIVE', 'CLOSED');
  END IF;
  IF to_regtype('payment.fgts_movement_kind') IS NULL THEN
    CREATE TYPE payment.fgts_movement_kind AS ENUM ('DEPOSIT_8', 'DEPOSIT_AVISO', 'RESCISION_FINE_40', 'ADJUSTMENT');
  END IF;
  IF to_regtype('payment.fgts_source_event') IS NULL THEN
    CREATE TYPE payment.fgts_source_event AS ENUM ('MONTHLY', 'TERMINATION');
  END IF;
END
$$;

ALTER TABLE hr.employment_link
  DROP CONSTRAINT IF EXISTS employment_link_tenant_id_id_uq,
  ADD CONSTRAINT employment_link_tenant_id_id_uq UNIQUE (tenant_id, id);

CREATE TABLE payment.fgts_account (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  fgts_account_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  employment_link_id uuid NOT NULL,
  opened_at date NOT NULL,
  status payment.fgts_account_status NOT NULL DEFAULT 'ACTIVE',
  closed_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fgts_account_pkey PRIMARY KEY (tenant_id, fgts_account_id),
  CONSTRAINT fgts_account_employee_fk FOREIGN KEY (tenant_id, employee_id)
    REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fgts_account_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id)
    REFERENCES hr.employment_link(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fgts_account_employee_link_uq UNIQUE (tenant_id, employee_id, employment_link_id),
  CONSTRAINT fgts_account_closed_check CHECK (
    (status = 'ACTIVE' AND closed_at IS NULL)
    OR (status = 'CLOSED' AND closed_at IS NOT NULL AND closed_at >= opened_at)
  )
);

CREATE TABLE payment.fgts_movement (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  fgts_movement_id uuid NOT NULL DEFAULT gen_random_uuid(),
  fgts_account_id uuid NOT NULL,
  competence date NOT NULL,
  kind payment.fgts_movement_kind NOT NULL,
  base_amount numeric(14,2) NOT NULL,
  rate numeric(18,6) NOT NULL,
  amount numeric(14,2) NOT NULL,
  payroll_run_id uuid,
  source_event payment.fgts_source_event NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fgts_movement_pkey PRIMARY KEY (tenant_id, fgts_movement_id),
  CONSTRAINT fgts_movement_account_fk FOREIGN KEY (tenant_id, fgts_account_id)
    REFERENCES payment.fgts_account(tenant_id, fgts_account_id) ON DELETE CASCADE,
  CONSTRAINT fgts_movement_payroll_run_fk FOREIGN KEY (payroll_run_id)
    REFERENCES payroll.payroll_run(id) ON DELETE SET NULL,
  CONSTRAINT fgts_movement_amount_check CHECK (base_amount >= 0 AND rate >= 0 AND amount >= 0)
);

CREATE INDEX fgts_account_employee_idx
  ON payment.fgts_account (tenant_id, employee_id, status);

CREATE INDEX fgts_movement_account_competence_idx
  ON payment.fgts_movement (tenant_id, fgts_account_id, competence);

CREATE UNIQUE INDEX fgts_movement_run_idempotency_uq
  ON payment.fgts_movement (tenant_id, fgts_account_id, competence, kind, source_event, payroll_run_id)
  WHERE payroll_run_id IS NOT NULL;

CREATE UNIQUE INDEX fgts_movement_manual_idempotency_uq
  ON payment.fgts_movement (tenant_id, fgts_account_id, competence, kind, source_event)
  WHERE payroll_run_id IS NULL;

CREATE OR REPLACE VIEW payment.v_fgts_balance
WITH (security_invoker = true) AS
SELECT
  account.tenant_id,
  account.fgts_account_id,
  account.employee_id,
  account.employment_link_id,
  account.status,
  account.opened_at,
  account.closed_at,
  COALESCE(
    sum(movement.amount) FILTER (
      WHERE movement.kind IN ('DEPOSIT_8', 'DEPOSIT_AVISO', 'ADJUSTMENT')
    ),
    0
  )::numeric(14,2) AS deposit_balance,
  COALESCE(
    sum(movement.amount) FILTER (WHERE movement.kind = 'RESCISION_FINE_40'),
    0
  )::numeric(14,2) AS rescission_fine_total,
  count(movement.fgts_movement_id)::integer AS movement_count,
  max(movement.created_at) AS latest_movement_at
FROM payment.fgts_account account
LEFT JOIN payment.fgts_movement movement
  ON movement.tenant_id = account.tenant_id
 AND movement.fgts_account_id = account.fgts_account_id
WHERE public.sgp_tenant_matches(account.tenant_id)
  AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write'])
GROUP BY
  account.tenant_id,
  account.fgts_account_id,
  account.employee_id,
  account.employment_link_id,
  account.status,
  account.opened_at,
  account.closed_at;

CREATE OR REPLACE FUNCTION payment.sgp_fgts_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(
    after_json ->> 'fgts_movement_id',
    before_json ->> 'fgts_movement_id',
    after_json ->> 'fgts_account_id',
    before_json ->> 'fgts_account_id'
  );

  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS fgts_account_audit ON payment.fgts_account;
CREATE TRIGGER fgts_account_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.fgts_account
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_audit();

DROP TRIGGER IF EXISTS fgts_movement_audit ON payment.fgts_movement;
CREATE TRIGGER fgts_movement_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.fgts_movement
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_audit();

ALTER TABLE payment.fgts_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_account FORCE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_movement FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fgts_account_select ON payment.fgts_account;
CREATE POLICY fgts_account_select ON payment.fgts_account
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write'])
    )
  );

DROP POLICY IF EXISTS fgts_account_write ON payment.fgts_account;
CREATE POLICY fgts_account_write ON payment.fgts_account
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.fgts.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.fgts.write'])
    )
  );

DROP POLICY IF EXISTS fgts_movement_select ON payment.fgts_movement;
CREATE POLICY fgts_movement_select ON payment.fgts_movement
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write'])
    )
  );

DROP POLICY IF EXISTS fgts_movement_write ON payment.fgts_movement;
CREATE POLICY fgts_movement_write ON payment.fgts_movement
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.fgts.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.fgts.write'])
    )
  );

CREATE OR REPLACE FUNCTION payroll_calc.fgts_monthly_base(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, payroll, hr, public, pg_catalog
AS $$
  SELECT COALESCE((
    SELECT record.total_earnings::numeric(14,2)
    FROM payroll.payroll_financial_record record
    WHERE record.employee_id = p_employee_id
      AND record.competence_year = p_year
      AND record.competence_month = p_month
      AND record.tenant_id = public.sgp_current_tenant_uuid()
    ORDER BY record.generated_at DESC
    LIMIT 1
  ), 0)::numeric(14,2);
$$;

CREATE OR REPLACE FUNCTION payment.compute_fgts_monthly(p_payroll_run_id uuid)
RETURNS TABLE (
  fgts_account_id uuid,
  fgts_movement_id uuid,
  employee_id uuid,
  base_amount numeric(14,2),
  amount numeric(14,2)
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payment, payroll, payroll_calc, hr, public, pg_catalog
AS $$
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_row record;
  v_account_id uuid;
  v_movement_id uuid;
  v_base_rubrica_id uuid;
  v_base_amount numeric(14,2);
  v_amount numeric(14,2);
  v_competence date;
BEGIN
  SELECT *
  INTO v_run
  FROM payroll.payroll_run
  WHERE id = p_payroll_run_id;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Payroll run % not found', p_payroll_run_id USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.sgp_bypass_rls()
     AND public.sgp_current_tenant_uuid() IS DISTINCT FROM v_run.tenant_id THEN
    RAISE EXCEPTION 'FGTS monthly calculation requires current tenant context %', v_run.tenant_id
      USING ERRCODE = '42501';
  END IF;

  v_competence := make_date(v_run.competence_year, v_run.competence_month, 1);

  SELECT ped.id
  INTO v_base_rubrica_id
  FROM payroll.payroll_earning_deduction ped
  WHERE ped.tenant_id = v_run.tenant_id
    AND ped.code = 'FGTS_MONTHLY_BASE'
    AND ped.formula_ready = true
  LIMIT 1;

  FOR v_row IN
    SELECT
      record.employee_id,
      employee.employment_link_id,
      employee.hired_on,
      record.total_earnings
    FROM payroll.payroll_financial_record record
    JOIN hr.employee employee
      ON employee.id = record.employee_id
     AND employee.tenant_id = record.tenant_id
    JOIN hr.employment_link link
      ON link.id = employee.employment_link_id
     AND link.tenant_id = employee.tenant_id
    WHERE record.tenant_id = v_run.tenant_id
      AND record.payroll_run_id = p_payroll_run_id
      AND lower(COALESCE(link.contract_type, '')) IN ('celetista', 'clt')
  LOOP
    INSERT INTO payment.fgts_account (
      tenant_id,
      employee_id,
      employment_link_id,
      opened_at,
      status
    )
    VALUES (
      v_run.tenant_id,
      v_row.employee_id,
      v_row.employment_link_id,
      COALESCE(v_row.hired_on, v_competence),
      'ACTIVE'
    )
    ON CONFLICT (tenant_id, employee_id, employment_link_id) DO UPDATE
    SET status = 'ACTIVE',
        closed_at = NULL,
        updated_at = now()
    RETURNING payment.fgts_account.fgts_account_id INTO v_account_id;

    IF v_base_rubrica_id IS NOT NULL THEN
      v_base_amount := payroll_calc.evaluate_earning_deduction(
        v_base_rubrica_id,
        v_row.employee_id,
        v_run.competence_month,
        v_run.competence_year
      );
    ELSE
      v_base_amount := COALESCE(v_row.total_earnings, 0)::numeric(14,2);
    END IF;

    v_base_amount := round(COALESCE(v_base_amount, 0), 2)::numeric(14,2);
    v_amount := round(v_base_amount * 0.080000, 2)::numeric(14,2);

    INSERT INTO payment.fgts_movement (
      tenant_id,
      fgts_account_id,
      competence,
      kind,
      base_amount,
      rate,
      amount,
      payroll_run_id,
      source_event
    )
    VALUES (
      v_run.tenant_id,
      v_account_id,
      v_competence,
      'DEPOSIT_8',
      v_base_amount,
      0.080000,
      v_amount,
      p_payroll_run_id,
      'MONTHLY'
    )
    ON CONFLICT (tenant_id, fgts_account_id, competence, kind, source_event, payroll_run_id)
      WHERE payroll_run_id IS NOT NULL
    DO UPDATE
    SET base_amount = EXCLUDED.base_amount,
        rate = EXCLUDED.rate,
        amount = EXCLUDED.amount
    RETURNING payment.fgts_movement.fgts_movement_id INTO v_movement_id;

    fgts_account_id := v_account_id;
    fgts_movement_id := v_movement_id;
    employee_id := v_row.employee_id;
    base_amount := v_base_amount;
    amount := v_amount;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION payment.compute_fgts_termination_fine(
  p_payroll_run_id uuid,
  p_employment_link_id uuid,
  p_cause text
)
RETURNS TABLE (
  fgts_account_id uuid,
  fgts_movement_id uuid,
  employee_id uuid,
  base_amount numeric(14,2),
  amount numeric(14,2)
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payment, payroll, hr, public, pg_catalog
AS $$
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_employee hr.employee%ROWTYPE;
  v_link hr.employment_link%ROWTYPE;
  v_account_id uuid;
  v_movement_id uuid;
  v_base_amount numeric(14,2);
  v_amount numeric(14,2);
  v_competence date;
  v_cause text;
BEGIN
  SELECT *
  INTO v_run
  FROM payroll.payroll_run
  WHERE id = p_payroll_run_id;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Payroll run % not found', p_payroll_run_id USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.sgp_bypass_rls()
     AND public.sgp_current_tenant_uuid() IS DISTINCT FROM v_run.tenant_id THEN
    RAISE EXCEPTION 'FGTS termination calculation requires current tenant context %', v_run.tenant_id
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_link
  FROM hr.employment_link link
  WHERE link.id = p_employment_link_id
    AND link.tenant_id = v_run.tenant_id;

  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'Employment link % not found for tenant %', p_employment_link_id, v_run.tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee employee
  WHERE employee.tenant_id = v_run.tenant_id
    AND employee.employment_link_id = p_employment_link_id
  ORDER BY employee.terminated_on DESC NULLS LAST, employee.updated_at DESC
  LIMIT 1;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'No employee found for employment link %', p_employment_link_id
      USING ERRCODE = 'P0002';
  END IF;

  v_cause := upper(COALESCE(p_cause, ''));
  IF lower(COALESCE(v_link.contract_type, '')) NOT IN ('celetista', 'clt')
     OR v_cause NOT IN ('WITHOUT_CAUSE', 'SEM_JUSTA_CAUSA', 'EMPLOYER_EXTINCTION', 'EXTINCAO_EMPREGADOR') THEN
    RETURN;
  END IF;

  v_competence := make_date(v_run.competence_year, v_run.competence_month, 1);

  INSERT INTO payment.fgts_account (
    tenant_id,
    employee_id,
    employment_link_id,
    opened_at,
    status
  )
  VALUES (
    v_run.tenant_id,
    v_employee.id,
    p_employment_link_id,
    COALESCE(v_employee.hired_on, v_competence),
    'ACTIVE'
  )
  ON CONFLICT (tenant_id, employee_id, employment_link_id) DO UPDATE
  SET status = 'ACTIVE',
      closed_at = NULL,
      updated_at = now()
  RETURNING payment.fgts_account.fgts_account_id INTO v_account_id;

  SELECT COALESCE(balance.deposit_balance, 0)::numeric(14,2)
  INTO v_base_amount
  FROM payment.v_fgts_balance balance
  WHERE balance.tenant_id = v_run.tenant_id
    AND balance.fgts_account_id = v_account_id;

  v_base_amount := round(COALESCE(v_base_amount, 0), 2)::numeric(14,2);
  IF v_base_amount <= 0 THEN
    RETURN;
  END IF;

  v_amount := round(v_base_amount * 0.400000, 2)::numeric(14,2);

  INSERT INTO payment.fgts_movement (
    tenant_id,
    fgts_account_id,
    competence,
    kind,
    base_amount,
    rate,
    amount,
    payroll_run_id,
    source_event
  )
  VALUES (
    v_run.tenant_id,
    v_account_id,
    v_competence,
    'RESCISION_FINE_40',
    v_base_amount,
    0.400000,
    v_amount,
    p_payroll_run_id,
    'TERMINATION'
  )
  ON CONFLICT (tenant_id, fgts_account_id, competence, kind, source_event, payroll_run_id)
    WHERE payroll_run_id IS NOT NULL
  DO UPDATE
  SET base_amount = EXCLUDED.base_amount,
      rate = EXCLUDED.rate,
      amount = EXCLUDED.amount
  RETURNING payment.fgts_movement.fgts_movement_id INTO v_movement_id;

  UPDATE payment.fgts_account
  SET status = 'CLOSED',
      closed_at = v_competence,
      updated_at = now()
  WHERE tenant_id = v_run.tenant_id
    AND fgts_account_id = v_account_id;

  fgts_account_id := v_account_id;
  fgts_movement_id := v_movement_id;
  employee_id := v_employee.id;
  base_amount := v_base_amount;
  amount := v_amount;
  RETURN NEXT;
END;
$$;

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenant LOOP
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

    INSERT INTO payroll.payroll_earning_deduction (
      tenant_id,
      code,
      description,
      kind,
      taxable,
      active,
      incidences,
      starts_on,
      subject_to_ceiling,
      formula_alias,
      formula_function_name,
      formula_expression,
      formula_function_ddl,
      formula_dependencies,
      formula_ready
    )
    VALUES (
      v_tenant_id,
      'FGTS_MONTHLY_BASE',
      'FGTS monthly remuneration base',
      'BASE'::public."PayrollEntryKind",
      false,
      true,
      '{"fgts":true,"monthly_payroll":true}'::jsonb,
      DATE '2025-01-01',
      false,
      'fgts_monthly_base',
      'fgts_monthly_base',
      'fgts_monthly_base(p_employee_id, p_month, p_year)',
      'CREATE OR REPLACE FUNCTION payroll_calc.fgts_monthly_base(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = payroll_calc, payroll, hr, public, pg_catalog AS $function$ SELECT COALESCE((SELECT record.total_earnings::numeric(14,2) FROM payroll.payroll_financial_record record WHERE record.employee_id = $1 AND record.competence_year = $3 AND record.competence_month = $2 AND record.tenant_id = public.sgp_current_tenant_uuid() ORDER BY record.generated_at DESC LIMIT 1), 0)::numeric(14,2); $function$;',
      ARRAY['MONTHLY_REMUNERATION'],
      true
    )
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET description = EXCLUDED.description,
        kind = EXCLUDED.kind,
        taxable = EXCLUDED.taxable,
        active = EXCLUDED.active,
        incidences = EXCLUDED.incidences,
        starts_on = EXCLUDED.starts_on,
        subject_to_ceiling = EXCLUDED.subject_to_ceiling,
        formula_alias = EXCLUDED.formula_alias,
        formula_function_name = EXCLUDED.formula_function_name,
        formula_expression = EXCLUDED.formula_expression,
        formula_function_ddl = EXCLUDED.formula_function_ddl,
        formula_dependencies = EXCLUDED.formula_dependencies,
        formula_ready = EXCLUDED.formula_ready,
        formula_error = NULL,
        updated_at = now();
  END LOOP;
END
$$;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('payroll.fgts.read', 'payroll', 'fgts', 'read', '/api/v1/admin/fgts/**', 'Read FGTS accounts, balances, and movements.'),
  ('payroll.fgts.write', 'payroll', 'fgts', 'write', '#!/folha/fgts/**', 'Accrue monthly FGTS deposits and termination fines.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA payment TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.fgts_account TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.fgts_movement TO sgp_app_role;
    GRANT SELECT ON payment.v_fgts_balance TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION payment.compute_fgts_monthly(uuid) TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION payment.compute_fgts_termination_fine(uuid, uuid, text) TO sgp_app_role;
  END IF;
END
$$;
