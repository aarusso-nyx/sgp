-- Audit helper for application and database-side operational events.
-- Run after Prisma migrations so public.audit_event and enum type "AuditAction" exist.
CREATE OR REPLACE FUNCTION public.sgp_append_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_sub text DEFAULT NULL,
  p_actor_login text DEFAULT NULL,
  p_table_name text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.audit_event (
    id,
    occurred_at,
    actor_user_id,
    actor_sub,
    actor_login,
    action,
    resource_type,
    resource_id,
    table_name,
    request_id,
    metadata
  ) VALUES (
    gen_random_uuid(),
    now(),
    p_actor_user_id,
    p_actor_sub,
    p_actor_login,
    p_action::public."AuditAction",
    p_resource_type,
    p_resource_id,
    p_table_name,
    p_request_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE INDEX IF NOT EXISTS audit_event_metadata_gin_idx
  ON public.audit_event USING gin (metadata);
