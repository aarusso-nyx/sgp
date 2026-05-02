-- Allow the centralized audit append helper to write to the forced-RLS audit table.
-- The helper still derives tenant_id from app.current_tenant_id/app.current_tenant.

ALTER FUNCTION public.sgp_append_audit_event(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) SECURITY DEFINER;

ALTER FUNCTION public.sgp_append_audit_event(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  text
) SECURITY DEFINER;
