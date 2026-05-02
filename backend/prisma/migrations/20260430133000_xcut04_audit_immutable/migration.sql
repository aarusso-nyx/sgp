-- XCUT-04: make public.audit_event physically immutable and role-scoped.

ALTER TABLE public.audit_event
  ADD COLUMN IF NOT EXISTS reason text;

COMMENT ON TABLE public.audit_event IS
  'Immutable audit trail for all mutating SGP transactions. Events are append-only, protected from UPDATE/DELETE, and retained for at least 6 months before administrative retention windows may truncate eligible partitions.';

CREATE OR REPLACE FUNCTION public.sgp_audit_event_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is immutable' USING ERRCODE = '0A000';
END;
$$;

DROP TRIGGER IF EXISTS audit_event_immutable ON public.audit_event;
CREATE TRIGGER audit_event_immutable
  BEFORE UPDATE OR DELETE ON public.audit_event
  FOR EACH ROW EXECUTE FUNCTION public.sgp_audit_event_immutable();

CREATE OR REPLACE FUNCTION public.sgp_append_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_sub text DEFAULT NULL,
  p_actor_login text DEFAULT NULL,
  p_table_name text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id uuid;
  v_tenant_id uuid;
BEGIN
  v_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;

  INSERT INTO public.audit_event (
    id,
    tenant_id,
    occurred_at,
    actor_user_id,
    actor_sub,
    actor_login,
    action,
    resource_type,
    resource_id,
    table_name,
    request_id,
    ip_address,
    user_agent,
    reason,
    metadata
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    now(),
    p_actor_user_id,
    p_actor_sub,
    p_actor_login,
    p_action::public."AuditAction",
    p_resource_type,
    p_resource_id,
    p_table_name,
    p_request_id,
    NULLIF(p_ip_address, '')::inet,
    p_user_agent,
    NULLIF(p_reason, ''),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    REVOKE UPDATE, DELETE ON public.audit_event FROM sgp_app_role;
    GRANT INSERT, SELECT ON public.audit_event TO sgp_app_role;
  END IF;
END
$$;
