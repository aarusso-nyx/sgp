CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS esocial;

ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2298';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'hr'
      AND t.typname = 'reintegration_order_kind'
  ) THEN
    CREATE TYPE hr.reintegration_order_kind AS ENUM (
      'JUDICIAL',
      'ADMINISTRATIVE_ANNULMENT',
      'AMNESTY'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'hr'
      AND t.typname = 'reintegration_order_status'
  ) THEN
    CREATE TYPE hr.reintegration_order_status AS ENUM (
      'REGISTERED',
      'APPLIED',
      'TRANSMITTED',
      'ACCEPTED',
      'REJECTED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'esocial'
      AND t.typname = 's2298_event_status'
  ) THEN
    CREATE TYPE esocial.s2298_event_status AS ENUM (
      'DRAFT',
      'TRANSMITTED',
      'ACCEPTED',
      'REJECTED'
    );
  END IF;
END $$;

ALTER TABLE hr.employee_status_history
  ADD COLUMN IF NOT EXISTS cause text NOT NULL DEFAULT '';

ALTER TABLE payroll.payroll_run
  ADD COLUMN IF NOT EXISTS cause text;

CREATE TABLE IF NOT EXISTS hr.reintegration_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  employment_link_id uuid NOT NULL REFERENCES hr.employment_link(id),
  original_termination_event_id uuid NOT NULL REFERENCES public.esocial_event(id),
  reinstatement_date date NOT NULL,
  kind hr.reintegration_order_kind NOT NULL,
  process_number text,
  court text,
  decision_date date NOT NULL,
  attachment_uri text,
  status hr.reintegration_order_status NOT NULL DEFAULT 'REGISTERED',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reintegration_order_judicial_process_required
    CHECK (kind <> 'JUDICIAL' OR nullif(process_number, '') IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS esocial.s2298_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  reintegration_order_id uuid NOT NULL REFERENCES hr.reintegration_order(id) ON DELETE CASCADE,
  original_s2299_receipt text NOT NULL,
  reint_type char(1) NOT NULL,
  payload_xml text NOT NULL,
  receipt text,
  status esocial.s2298_event_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT s2298_event_reint_type_valid CHECK (reint_type IN ('1', '2', '9'))
);

CREATE INDEX IF NOT EXISTS reintegration_order_tenant_link_idx
  ON hr.reintegration_order (tenant_id, employment_link_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS s2298_event_order_key
  ON esocial.s2298_event (tenant_id, reintegration_order_id);

ALTER TABLE hr.reintegration_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.reintegration_order FORCE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2298_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2298_event FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reintegration_order_read ON hr.reintegration_order;
CREATE POLICY reintegration_order_read ON hr.reintegration_order
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  );

DROP POLICY IF EXISTS reintegration_order_write ON hr.reintegration_order;
CREATE POLICY reintegration_order_write ON hr.reintegration_order
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  );

DROP POLICY IF EXISTS s2298_event_read ON esocial.s2298_event;
CREATE POLICY s2298_event_read ON esocial.s2298_event
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  );

DROP POLICY IF EXISTS s2298_event_write ON esocial.s2298_event;
CREATE POLICY s2298_event_write ON esocial.s2298_event
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write'
    ])
  );

CREATE OR REPLACE FUNCTION hr.audit_reintegration_order_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' WHEN TG_OP = 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.reintegration_order',
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION esocial.audit_s2298_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' WHEN TG_OP = 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.s2298_event',
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

DROP TRIGGER IF EXISTS audit_reintegration_order_mutation ON hr.reintegration_order;
CREATE TRIGGER audit_reintegration_order_mutation
  AFTER INSERT OR UPDATE OR DELETE ON hr.reintegration_order
  FOR EACH ROW EXECUTE FUNCTION hr.audit_reintegration_order_mutation();

DROP TRIGGER IF EXISTS audit_s2298_event_mutation ON esocial.s2298_event;
CREATE TRIGGER audit_s2298_event_mutation
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s2298_event
  FOR EACH ROW EXECUTE FUNCTION esocial.audit_s2298_event_mutation();
