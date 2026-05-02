CREATE SCHEMA IF NOT EXISTS payment;

DO $$
BEGIN
  IF to_regtype('payment.pis_pasep_program') IS NULL THEN
    CREATE TYPE payment.pis_pasep_program AS ENUM ('PIS', 'PASEP');
  END IF;
END
$$;

CREATE TABLE payment.pis_pasep_base_year (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  employee_id uuid NOT NULL,
  year_base integer NOT NULL,
  program payment.pis_pasep_program NOT NULL,
  monthly_base jsonb NOT NULL,
  total_base numeric(14,2) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pis_pasep_base_year_pkey PRIMARY KEY (tenant_id, employee_id, year_base),
  CONSTRAINT pis_pasep_base_year_employee_fk FOREIGN KEY (tenant_id, employee_id)
    REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT pis_pasep_base_year_year_chk CHECK (year_base BETWEEN 2000 AND 2100),
  CONSTRAINT pis_pasep_base_year_monthly_object_chk CHECK (jsonb_typeof(monthly_base) = 'object'),
  CONSTRAINT pis_pasep_base_year_total_chk CHECK (total_base >= 0)
);

CREATE INDEX pis_pasep_base_year_year_idx
  ON payment.pis_pasep_base_year (tenant_id, year_base, program);

CREATE OR REPLACE FUNCTION payment.sgp_pis_pasep_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  tenant_id uuid;
  resource_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_before := OLD;
    before_json := to_jsonb(row_before);
    after_json := NULL::jsonb;
    tenant_id := row_before.tenant_id;
  ELSIF TG_OP = 'INSERT' THEN
    row_after := NEW;
    before_json := NULL::jsonb;
    after_json := to_jsonb(row_after);
    tenant_id := row_after.tenant_id;
  ELSE
    row_before := OLD;
    row_after := NEW;
    before_json := to_jsonb(row_before);
    after_json := to_jsonb(row_after);
    tenant_id := row_after.tenant_id;
  END IF;

  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(after_json ->> 'employee_id', before_json ->> 'employee_id')
    || ':' || COALESCE(after_json ->> 'year_base', before_json ->> 'year_base');

  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
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

DROP TRIGGER IF EXISTS pis_pasep_base_year_audit ON payment.pis_pasep_base_year;
CREATE TRIGGER pis_pasep_base_year_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.pis_pasep_base_year
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_pis_pasep_audit();

CREATE OR REPLACE FUNCTION payment.pis_pasep_includes_rubric(p_incidences jsonb, p_kind text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(COALESCE(p_incidences->>'codIncPisPasep', p_incidences->>'cod_inc_pis_pasep', '')) IN ('00', '0', 'none', 'false', 'nao', 'nao_base') THEN false
    WHEN lower(COALESCE(p_incidences->>'pisPasep', p_incidences->>'pis_pasep', p_incidences->>'pis_pasep_base', '')) IN ('false', '0', 'none', 'nao', 'nao_base') THEN false
    WHEN lower(COALESCE(p_incidences->>'codIncPisPasep', p_incidences->>'cod_inc_pis_pasep', '')) IN ('11', '12', 'base', 'monthly', 'mensal') THEN true
    WHEN lower(COALESCE(p_incidences->>'pisPasep', p_incidences->>'pis_pasep', p_incidences->>'pis_pasep_base', '')) IN ('true', '1', 'base', 'monthly', 'mensal') THEN true
    ELSE p_kind IN ('EARNING', 'BASE')
  END;
$$;

CREATE OR REPLACE FUNCTION payment.recompute_pis_pasep_base(
  p_tenant_id uuid,
  p_employee_id uuid,
  p_year_base integer
)
RETURNS payment.pis_pasep_base_year
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payment, payroll, esocial, hr, public, pg_catalog
AS $$
DECLARE
  v_employee hr.employee%ROWTYPE;
  v_contract_type text;
  v_program payment.pis_pasep_program;
  v_monthly jsonb;
  v_total numeric(14,2);
  v_result payment.pis_pasep_base_year%ROWTYPE;
BEGIN
  IF p_year_base < 2000 OR p_year_base > 2100 THEN
    RAISE EXCEPTION 'Invalid PIS/PASEP base year %', p_year_base USING ERRCODE = '22023';
  END IF;

  IF NOT public.sgp_bypass_rls()
     AND public.sgp_current_tenant_uuid() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'PIS/PASEP recompute requires current tenant context %', p_tenant_id
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_employee
  FROM hr.employee employee
  WHERE employee.tenant_id = p_tenant_id
    AND employee.id = p_employee_id;

  IF v_employee.id IS NULL THEN
    RAISE EXCEPTION 'Employee % not found for tenant %', p_employee_id, p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT lower(COALESCE(link.contract_type, 'statutory'))
  INTO v_contract_type
  FROM hr.employment_link link
  WHERE link.tenant_id = p_tenant_id
    AND link.id = v_employee.employment_link_id
  LIMIT 1;

  v_program := CASE
    WHEN COALESCE(v_contract_type, '') IN ('celetista', 'clt') THEN 'PIS'::payment.pis_pasep_program
    ELSE 'PASEP'::payment.pis_pasep_program
  END;

  WITH months(month_no, month_key) AS (
    SELECT generate_series(1, 12), lpad(generate_series(1, 12)::text, 2, '0')
  ),
  monthly AS (
    SELECT
      months.month_key,
      round(COALESCE(sum(
        CASE
          WHEN payment.pis_pasep_includes_rubric(earning.incidences, earning.kind::text)
            THEN abs(item.amount)
          ELSE 0
        END
      ), 0), 2)::numeric(14,2) AS amount
    FROM months
    LEFT JOIN payroll.payroll_run run
      ON run.tenant_id = p_tenant_id
     AND run.competence_year = p_year_base
     AND run.competence_month = months.month_no
    LEFT JOIN esocial.s1200_emission_state state
      ON state.tenant_id = run.tenant_id
     AND state.payroll_run_id = run.id
     AND state.employee_id = p_employee_id
    LEFT JOIN public.esocial_event event
      ON event.tenant_id = run.tenant_id
     AND event.payroll_run_id = run.id
     AND event.event_type = 'S-1200'
     AND event.payload->>'employeeId' = p_employee_id::text
     AND event.status <> 'EXCLUIDO'::public."ESocialEventStatus"
    LEFT JOIN payroll.employee_payroll_item item
      ON item.tenant_id = run.tenant_id
     AND item.payroll_run_id = run.id
     AND item.employee_id = p_employee_id
     AND item.deleted_at IS NULL
     AND state.employee_id IS NOT NULL
     AND event.id IS NOT NULL
    LEFT JOIN payroll.payroll_earning_deduction earning
      ON earning.tenant_id = item.tenant_id
     AND earning.id = item.earning_deduction_id
    GROUP BY months.month_no, months.month_key
  )
  SELECT
    jsonb_object_agg(month_key, amount ORDER BY month_key),
    COALESCE(sum(amount), 0)::numeric(14,2)
  INTO v_monthly, v_total
  FROM monthly;

  INSERT INTO payment.pis_pasep_base_year (
    tenant_id,
    employee_id,
    year_base,
    program,
    monthly_base,
    total_base,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_employee_id,
    p_year_base,
    v_program,
    v_monthly,
    v_total,
    now()
  )
  ON CONFLICT (tenant_id, employee_id, year_base) DO UPDATE
  SET program = EXCLUDED.program,
      monthly_base = EXCLUDED.monthly_base,
      total_base = EXCLUDED.total_base,
      updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE VIEW payment.v_pis_pasep_year
WITH (security_invoker = true) AS
SELECT
  base.tenant_id,
  base.employee_id,
  employee.registration,
  employee.name AS employee_name,
  employee.cpf,
  base.year_base,
  base.program::text AS program,
  base.monthly_base,
  base.total_base,
  base.updated_at
FROM payment.pis_pasep_base_year base
JOIN hr.employee employee
  ON employee.tenant_id = base.tenant_id
 AND employee.id = base.employee_id
WHERE public.sgp_tenant_matches(base.tenant_id)
  AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read', 'payroll.payroll.write']);

ALTER TABLE payment.pis_pasep_base_year ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.pis_pasep_base_year FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pis_pasep_base_year_select ON payment.pis_pasep_base_year;
CREATE POLICY pis_pasep_base_year_select ON payment.pis_pasep_base_year
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read', 'payroll.payroll.write'])
  );

DROP POLICY IF EXISTS pis_pasep_base_year_write ON payment.pis_pasep_base_year;
CREATE POLICY pis_pasep_base_year_write ON payment.pis_pasep_base_year
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read', 'payroll.payroll.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read', 'payroll.payroll.write'])
  );

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('payroll.payroll.read', 'payroll', 'pis-pasep', 'read', '/api/v1/admin/pis-pasep/**', 'Read annual PIS/PASEP payroll bases.'),
  ('payroll.payroll.write', 'payroll', 'pis-pasep', 'write', '/api/v1/admin/pis-pasep/**', 'Recompute annual PIS/PASEP payroll bases.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'payroll.payroll.read'),
    ('ADMIN', 'payroll.payroll.write'),
    ('FOLHA_OPERADOR', 'payroll.payroll.read'),
    ('FOLHA_OPERADOR', 'payroll.payroll.write'),
    ('AUDITOR', 'payroll.payroll.read')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile
  ON access_profile.code = profile_permissions.profile_code
 AND access_profile.tenant_id = public.sgp_current_tenant_uuid()
JOIN public.permission
  ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.pis_pasep_base_year TO sgp_app_role;
    GRANT SELECT ON payment.v_pis_pasep_year TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION payment.recompute_pis_pasep_base(uuid, uuid, integer) TO sgp_app_role;
  END IF;
END
$$;
