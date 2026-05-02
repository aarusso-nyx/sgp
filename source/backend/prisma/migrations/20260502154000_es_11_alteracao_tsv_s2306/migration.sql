CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS esocial;

ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2306';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'esocial'
      AND t.typname = 's2306_event_status'
  ) THEN
    CREATE TYPE esocial.s2306_event_status AS ENUM (
      'DRAFT',
      'TRANSMITTED',
      'ACCEPTED',
      'REJECTED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS hr.tsv_contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  employment_link_id uuid NOT NULL REFERENCES hr.employment_link(id),
  tsv_category char(3) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  role text NOT NULL,
  monthly_amount numeric(14,2) NOT NULL,
  weekly_hours numeric(18,6) NOT NULL,
  workplace_id uuid NOT NULL REFERENCES hr.work_location(id),
  supervisor_employee_id uuid REFERENCES hr.employee(id),
  education_institution text,
  internship_plan_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr.tsv_contract_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  tsv_contract_id uuid NOT NULL REFERENCES hr.tsv_contract(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  fields_changed jsonb NOT NULL,
  previous_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tsv_contract_change_fields_object
    CHECK (jsonb_typeof(fields_changed) = 'object'),
  CONSTRAINT tsv_contract_change_previous_object
    CHECK (jsonb_typeof(previous_values) = 'object'),
  CONSTRAINT tsv_contract_change_new_object
    CHECK (jsonb_typeof(new_values) = 'object')
);

CREATE TABLE IF NOT EXISTS esocial.s2306_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  tsv_contract_change_id uuid NOT NULL REFERENCES hr.tsv_contract_change(id) ON DELETE CASCADE,
  payload_xml text NOT NULL,
  receipt text,
  status esocial.s2306_event_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tsv_contract_change_tenant_contract_effective_idx
  ON hr.tsv_contract_change (tenant_id, tsv_contract_id, effective_date);

CREATE UNIQUE INDEX IF NOT EXISTS s2306_event_change_key
  ON esocial.s2306_event (tenant_id, tsv_contract_change_id);

ALTER TABLE hr.tsv_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.tsv_contract FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.tsv_contract_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.tsv_contract_change FORCE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2306_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2306_event FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tsv_contract_read ON hr.tsv_contract;
CREATE POLICY tsv_contract_read ON hr.tsv_contract
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.read',
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  );

DROP POLICY IF EXISTS tsv_contract_write ON hr.tsv_contract;
CREATE POLICY tsv_contract_write ON hr.tsv_contract
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.employment.write', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.employment.write', 'esocial.event.write'])
  );

DROP POLICY IF EXISTS tsv_contract_change_read ON hr.tsv_contract_change;
CREATE POLICY tsv_contract_change_read ON hr.tsv_contract_change
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.read',
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  );

DROP POLICY IF EXISTS tsv_contract_change_write ON hr.tsv_contract_change;
CREATE POLICY tsv_contract_change_write ON hr.tsv_contract_change
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.employment.write', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.employment.write', 'esocial.event.write'])
  );

DROP POLICY IF EXISTS s2306_event_read ON esocial.s2306_event;
CREATE POLICY s2306_event_read ON esocial.s2306_event
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.read',
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  );

DROP POLICY IF EXISTS s2306_event_write ON esocial.s2306_event;
CREATE POLICY s2306_event_write ON esocial.s2306_event
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.employment.write', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.employment.write', 'esocial.event.write'])
  );

CREATE OR REPLACE FUNCTION hr.audit_tsv_contract_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_before jsonb;
  v_after jsonb;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_before := to_jsonb(OLD);
  v_after := to_jsonb(NEW);
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' WHEN TG_OP = 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.tsv_contract',
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', v_before, 'after', v_after),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION hr.audit_tsv_contract_change_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_before jsonb;
  v_after jsonb;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_before := to_jsonb(OLD);
  v_after := to_jsonb(NEW);
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' WHEN TG_OP = 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.tsv_contract_change',
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', v_before, 'after', v_after),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION esocial.audit_s2306_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_before jsonb;
  v_after jsonb;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_before := to_jsonb(OLD);
  v_after := to_jsonb(NEW);
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' WHEN TG_OP = 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.s2306_event',
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', v_before, 'after', v_after),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

DROP TRIGGER IF EXISTS audit_tsv_contract_mutation ON hr.tsv_contract;
CREATE TRIGGER audit_tsv_contract_mutation
  AFTER INSERT OR UPDATE OR DELETE ON hr.tsv_contract
  FOR EACH ROW EXECUTE FUNCTION hr.audit_tsv_contract_mutation();

DROP TRIGGER IF EXISTS audit_tsv_contract_change_mutation ON hr.tsv_contract_change;
CREATE TRIGGER audit_tsv_contract_change_mutation
  AFTER INSERT OR UPDATE OR DELETE ON hr.tsv_contract_change
  FOR EACH ROW EXECUTE FUNCTION hr.audit_tsv_contract_change_mutation();

DROP TRIGGER IF EXISTS audit_s2306_event_mutation ON esocial.s2306_event;
CREATE TRIGGER audit_s2306_event_mutation
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s2306_event
  FOR EACH ROW EXECUTE FUNCTION esocial.audit_s2306_event_mutation();
