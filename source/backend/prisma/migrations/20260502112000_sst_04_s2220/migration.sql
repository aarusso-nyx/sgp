ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2220';

ALTER TABLE saude.aso_record
  ADD COLUMN IF NOT EXISTS s2220_event_id uuid REFERENCES public.esocial_event(id);

CREATE TABLE esocial.s2220_pending (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  aso_record_id uuid NOT NULL REFERENCES saude.aso_record(id) ON DELETE CASCADE,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT s2220_pending_pkey PRIMARY KEY (tenant_id, aso_record_id),
  CONSTRAINT s2220_pending_attempts_nonnegative_chk CHECK (attempts >= 0)
);

CREATE INDEX s2220_pending_tenant_enqueued_idx
  ON esocial.s2220_pending(tenant_id, enqueued_at);
CREATE INDEX aso_record_s2220_missing_idx
  ON saude.aso_record(tenant_id, status, s2220_event_id)
  WHERE status = 'ARCHIVED'::saude.aso_status;

CREATE OR REPLACE FUNCTION esocial.sgp_enqueue_s2220_from_aso()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status <> 'ARCHIVED'::saude.aso_status
     AND NEW.status = 'ARCHIVED'::saude.aso_status
     AND NEW.s2220_event_id IS NULL THEN
    INSERT INTO esocial.s2220_pending (tenant_id, aso_record_id)
    VALUES (NEW.tenant_id, NEW.id)
    ON CONFLICT (tenant_id, aso_record_id)
    DO UPDATE
    SET enqueued_at = EXCLUDED.enqueued_at,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sst04_aso_record_s2220 ON saude.aso_record;
CREATE TRIGGER sst04_aso_record_s2220
  AFTER UPDATE ON saude.aso_record
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2220_from_aso();

CREATE OR REPLACE FUNCTION esocial.sgp_s2220_pending_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.aso_record_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'tenantId', v_row.tenant_id::text,
      'attempts', COALESCE(v_row.attempts, 0)
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER s2220_pending_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s2220_pending
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2220_pending_audit();

ALTER TABLE esocial.s2220_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2220_pending FORCE ROW LEVEL SECURITY;

CREATE POLICY s2220_pending_select ON esocial.s2220_pending
  FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
  );
CREATE POLICY s2220_pending_write ON esocial.s2220_pending
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
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s2220_pending TO sgp_app_role;
  END IF;
END
$$;
