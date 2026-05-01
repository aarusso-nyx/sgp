-- Repair HR-06 audit trigger after XCUT-04 introduced overloaded append signatures.

CREATE OR REPLACE FUNCTION hr.sgp_audit_hr06_org_structure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action text;
BEGIN
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'UPDATE' END;
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
  RETURN NEW;
END;
$$;
