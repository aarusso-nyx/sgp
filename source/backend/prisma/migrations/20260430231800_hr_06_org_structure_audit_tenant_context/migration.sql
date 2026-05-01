-- Repair HR-06 audit trigger for seed/bootstrap paths that do not set request tenant context.
-- Runtime requests keep their existing app.current_tenant_id; seed inserts fall back to NEW.tenant_id.

CREATE OR REPLACE FUNCTION hr.sgp_audit_hr06_org_structure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action text;
  v_previous_tenant_id text;
  v_previous_tenant text;
  v_using_row_tenant boolean := false;
BEGIN
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'UPDATE' END;
  v_previous_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '');
  v_previous_tenant := NULLIF(current_setting('app.current_tenant', true), '');

  IF v_previous_tenant_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', NEW.tenant_id::text, true);
    IF v_previous_tenant IS NULL THEN
      PERFORM set_config('app.current_tenant', NEW.tenant_id::text, true);
    END IF;
    v_using_row_tenant := true;
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    'gestao.master_data'::text,
    NEW.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('code', NEW.code, 'operation', TG_OP),
    NULL::text,
    NULL::text,
    NULL::text
  );

  IF v_using_row_tenant THEN
    PERFORM set_config('app.current_tenant_id', COALESCE(v_previous_tenant_id, ''), true);
    IF v_previous_tenant IS NULL THEN
      PERFORM set_config('app.current_tenant', '', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
