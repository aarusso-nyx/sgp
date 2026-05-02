-- ES-04 periodic payroll S-1200/S-1210 emission state.

ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-1200';
ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-1210';

ALTER TABLE public.esocial_event
  ADD COLUMN IF NOT EXISTS payroll_run_id uuid,
  ADD COLUMN IF NOT EXISTS payment_batch_id uuid;

CREATE INDEX IF NOT EXISTS esocial_event_payroll_run_idx
  ON public.esocial_event (tenant_id, payroll_run_id)
  WHERE payroll_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS esocial_event_payment_batch_idx
  ON public.esocial_event (tenant_id, payment_batch_id)
  WHERE payment_batch_id IS NOT NULL;

CREATE TABLE esocial.s1200_emission_state (
  tenant_id uuid NOT NULL,
  payroll_run_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  recibo text,
  payload_hash char(64) NOT NULL,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, payroll_run_id, employee_id)
);

CREATE TABLE esocial.s1210_emission_state (
  tenant_id uuid NOT NULL,
  payment_batch_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  recibo text,
  payload_hash char(64) NOT NULL,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, payment_batch_id, employee_id)
);

CREATE INDEX s1200_emission_state_employee_idx
  ON esocial.s1200_emission_state (tenant_id, employee_id, emitted_at DESC);
CREATE INDEX s1210_emission_state_employee_idx
  ON esocial.s1210_emission_state (tenant_id, employee_id, emitted_at DESC);

CREATE OR REPLACE FUNCTION esocial.sgp_es04_emission_state_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_resource_id := CASE
    WHEN TG_TABLE_NAME = 's1200_emission_state' THEN
      v_row.payroll_run_id::text || ':' || v_row.employee_id::text
    ELSE
      v_row.payment_batch_id::text || ':' || v_row.employee_id::text
  END;

  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP),
    NULL::text,
    NULL::text,
    NULL::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER es04_s1200_emission_state_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s1200_emission_state
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es04_emission_state_audit();
CREATE TRIGGER es04_s1210_emission_state_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s1210_emission_state
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es04_emission_state_audit();

ALTER TABLE esocial.s1200_emission_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s1200_emission_state FORCE ROW LEVEL SECURITY;
ALTER TABLE esocial.s1210_emission_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s1210_emission_state FORCE ROW LEVEL SECURITY;

CREATE POLICY s1200_emission_state_select ON esocial.s1200_emission_state
  FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
  );
CREATE POLICY s1200_emission_state_write ON esocial.s1200_emission_state
  FOR ALL USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  );

CREATE POLICY s1210_emission_state_select ON esocial.s1210_emission_state
  FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
  );
CREATE POLICY s1210_emission_state_write ON esocial.s1210_emission_state
  FOR ALL USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s1200_emission_state TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s1210_emission_state TO sgp_app_role;
  END IF;
END
$$;
