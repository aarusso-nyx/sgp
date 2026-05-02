-- CALC-11 monthly payroll orchestration and portal paystub projection.

ALTER TABLE hr.competence_period
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE hr.competence_period
  ALTER COLUMN status DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'competence_period'
      AND column_name = 'status'
      AND udt_name <> 'text'
  ) THEN
    ALTER TABLE hr.competence_period
      ALTER COLUMN status TYPE text
      USING CASE status::text
        WHEN 'ACTIVE' THEN 'OPEN'
        WHEN 'INACTIVE' THEN 'CLOSED'
        WHEN 'ARCHIVED' THEN 'CLOSED'
        ELSE status::text
      END;
  END IF;
END
$$;

UPDATE hr.competence_period
SET status = CASE status
  WHEN 'ACTIVE' THEN 'OPEN'
  WHEN 'INACTIVE' THEN 'CLOSED'
  WHEN 'ARCHIVED' THEN 'CLOSED'
  ELSE status
END
WHERE status NOT IN ('OPEN', 'CALCULATING', 'CALCULATED', 'APPROVED', 'GENERATED', 'CLOSED');

ALTER TABLE hr.competence_period
  ALTER COLUMN status SET DEFAULT 'OPEN',
  DROP CONSTRAINT IF EXISTS competence_period_status_check,
  ADD CONSTRAINT competence_period_status_check
    CHECK (status IN ('OPEN', 'CALCULATING', 'CALCULATED', 'APPROVED', 'GENERATED', 'CLOSED'));

CREATE INDEX IF NOT EXISTS competence_period_tenant_status_idx
  ON hr.competence_period(tenant_id, status, competence_year, competence_month);

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

CREATE OR REPLACE FUNCTION payroll_calc.allow_negative_net(
  p_tenant_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN jsonb_typeof(parameter.value) = 'boolean'
        THEN (parameter.value #>> '{}')::boolean
      WHEN lower(COALESCE(parameter.value->>'value', parameter.value#>>'{}')) IN ('true', 't', 'yes', 'y', '1')
        THEN true
      ELSE false
    END
    FROM public.system_parameter parameter
    WHERE parameter.tenant_id = p_tenant_id
      AND parameter.key = 'ALLOW_NEGATIVE_NET'
    ORDER BY parameter.updated_at DESC
    LIMIT 1
  ), false);
$$;

CREATE OR REPLACE FUNCTION payroll_calc.validate_payroll_run(
  p_tenant_id uuid,
  p_payroll_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payroll_calc, payroll, hr, public, pg_catalog
AS $$
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_employee_count integer := 0;
  v_total_earnings numeric(16, 2) := 0;
  v_total_deductions numeric(16, 2) := 0;
  v_total_net numeric(16, 2) := 0;
  v_mismatched_records integer := 0;
  v_negative_net integer := 0;
  v_allow_negative_net boolean := false;
BEGIN
  SELECT *
  INTO v_run
  FROM payroll.payroll_run run
  WHERE run.id = p_payroll_run_id
    AND run.tenant_id = p_tenant_id;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Payroll run % was not found for tenant %', p_payroll_run_id, p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  WITH employee_totals AS (
    SELECT
      item.employee_id,
      round(coalesce(sum(CASE WHEN earning.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount ELSE 0 END), 0), 2)::numeric(16, 2) AS earnings,
      round(coalesce(sum(CASE WHEN earning.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN item.amount ELSE 0 END), 0), 2)::numeric(16, 2) AS deductions,
      round(coalesce(sum(CASE
        WHEN earning.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount
        WHEN earning.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN -item.amount
        ELSE 0
      END), 0), 2)::numeric(16, 2) AS net
    FROM payroll.v_payroll_run_line_active item
    JOIN payroll.payroll_earning_deduction earning
      ON earning.id = item.earning_deduction_id
    WHERE item.tenant_id = p_tenant_id
      AND item.payroll_run_id = p_payroll_run_id
    GROUP BY item.employee_id
  ),
  aggregate_totals AS (
    SELECT
      count(*)::integer AS employee_count,
      coalesce(sum(earnings), 0)::numeric(16, 2) AS total_earnings,
      coalesce(sum(deductions), 0)::numeric(16, 2) AS total_deductions,
      coalesce(sum(net), 0)::numeric(16, 2) AS total_net,
      count(*) FILTER (WHERE net < 0)::integer AS negative_net_count
    FROM employee_totals
  ),
  record_mismatches AS (
    SELECT count(*)::integer AS mismatch_count
    FROM employee_totals totals
    LEFT JOIN payroll.payroll_financial_record financial
      ON financial.tenant_id = p_tenant_id
     AND financial.payroll_run_id = p_payroll_run_id
     AND financial.employee_id = totals.employee_id
    WHERE financial.id IS NULL
       OR financial.total_earnings::numeric(16, 2) <> totals.earnings
       OR financial.total_deductions::numeric(16, 2) <> totals.deductions
       OR financial.net_amount::numeric(16, 2) <> totals.net
  )
  SELECT
    aggregate_totals.employee_count,
    aggregate_totals.total_earnings,
    aggregate_totals.total_deductions,
    aggregate_totals.total_net,
    aggregate_totals.negative_net_count,
    record_mismatches.mismatch_count
  INTO
    v_employee_count,
    v_total_earnings,
    v_total_deductions,
    v_total_net,
    v_negative_net,
    v_mismatched_records
  FROM aggregate_totals
  CROSS JOIN record_mismatches;

  v_allow_negative_net := payroll_calc.allow_negative_net(p_tenant_id);

  IF NOT v_allow_negative_net AND v_negative_net > 0 THEN
    RAISE EXCEPTION 'Payroll run % has % employee(s) with negative net pay', p_payroll_run_id, v_negative_net
      USING ERRCODE = '23514';
  END IF;

  IF v_mismatched_records > 0 THEN
    RAISE EXCEPTION 'Payroll run % has % employee financial record mismatch(es)', p_payroll_run_id, v_mismatched_records
      USING ERRCODE = '23514';
  END IF;

  IF v_employee_count <> v_run.employee_count
    OR v_total_earnings <> v_run.total_earnings
    OR v_total_deductions <> v_run.total_deductions
    OR v_total_net <> v_run.total_net
  THEN
    RAISE EXCEPTION 'Payroll run % aggregate totals are inconsistent: employees %, earnings %, deductions %, net %; stored employees %, earnings %, deductions %, net %',
      p_payroll_run_id,
      v_employee_count,
      v_total_earnings,
      v_total_deductions,
      v_total_net,
      v_run.employee_count,
      v_run.total_earnings,
      v_run.total_deductions,
      v_run.total_net
      USING ERRCODE = '23514';
  END IF;

  RETURN jsonb_build_object(
    'payrollRunId', p_payroll_run_id,
    'employeeCount', v_employee_count,
    'totalEarnings', v_total_earnings,
    'totalDeductions', v_total_deductions,
    'totalNet', v_total_net,
    'allowNegativeNet', v_allow_negative_net
  );
END;
$$;

CREATE OR REPLACE VIEW portal.v_employee_paystub
WITH (security_invoker = true) AS
SELECT
  run.tenant_id,
  run.id AS payroll_run_id,
  employee.id AS employee_id,
  employee.registration,
  employee.name AS employee_name,
  run.competence_year,
  run.competence_month,
  run.status::text AS payroll_status,
  competence.status AS competence_status,
  financial.total_earnings::numeric(16, 2) AS total_earnings,
  financial.total_deductions::numeric(16, 2) AS total_deductions,
  financial.net_amount::numeric(16, 2) AS net_amount,
  financial.generated_at,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', earning.code,
        'description', earning.description,
        'kind', earning.kind::text,
        'quantity', item.quantity,
        'referenceValue', item.reference_value,
        'amount', item.amount,
        'notes', item.notes
      )
      ORDER BY earning.kind::text, earning.code
    ) FILTER (WHERE item.id IS NOT NULL),
    '[]'::jsonb
  ) AS lines
FROM payroll.payroll_run run
JOIN hr.competence_period competence
  ON competence.tenant_id = run.tenant_id
 AND competence.competence_year = run.competence_year
 AND competence.competence_month = run.competence_month
JOIN payroll.payroll_financial_record financial
  ON financial.tenant_id = run.tenant_id
 AND financial.payroll_run_id = run.id
JOIN hr.employee employee
  ON employee.tenant_id = run.tenant_id
 AND employee.id = financial.employee_id
LEFT JOIN payroll.v_payroll_run_line_active item
  ON item.tenant_id = run.tenant_id
 AND item.payroll_run_id = run.id
 AND item.employee_id = employee.id
LEFT JOIN payroll.payroll_earning_deduction earning
  ON earning.id = item.earning_deduction_id
WHERE competence.status IN ('GENERATED', 'CLOSED')
  AND run.status IN ('GENERATED'::public."PayrollRunStatus", 'CLOSED'::public."PayrollRunStatus")
  AND public.sgp_tenant_matches(run.tenant_id)
  AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'])
GROUP BY
  run.tenant_id,
  run.id,
  employee.id,
  employee.registration,
  employee.name,
  run.competence_year,
  run.competence_month,
  run.status,
  competence.status,
  financial.total_earnings,
  financial.total_deductions,
  financial.net_amount,
  financial.generated_at;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_run',
    'payroll_run_status_history',
    'employee_payroll_item',
    'payroll_financial_record',
    'payroll_earning_deduction'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'calc11_' || table_name || '_portal_paystub_select', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''portal.paystub.read''])))',
      'calc11_' || table_name || '_portal_paystub_select',
      table_name
    );
  END LOOP;

  FOREACH table_name IN ARRAY ARRAY[
    'employee',
    'competence_period'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'calc11_' || table_name || '_portal_paystub_select', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''portal.paystub.read''])))',
      'calc11_' || table_name || '_portal_paystub_select',
      table_name
    );
  END LOOP;

  DROP POLICY IF EXISTS calc11_competence_period_monthly_write ON hr.competence_period;
  CREATE POLICY calc11_competence_period_monthly_write ON hr.competence_period
    FOR ALL
    USING (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['folha.write'])
      )
    )
    WITH CHECK (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['folha.write'])
      )
    );
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_portal_api') THEN
    GRANT USAGE ON SCHEMA portal TO sgp_portal_api;
    GRANT SELECT ON portal.v_employee_paystub TO sgp_portal_api;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT ON portal.v_employee_paystub TO sgp_app_role;
  END IF;
END
$$;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('portal.paystub.read', 'portal', 'paystub', 'read', '#!/contracheques/**', 'Read the authenticated employee monthly paystub after payroll generation.')
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('FOLHA_OPERADOR', 'portal.paystub.read'),
    ('RH_OPERADOR', 'portal.paystub.read'),
    ('AUDITOR', 'portal.paystub.read')
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
