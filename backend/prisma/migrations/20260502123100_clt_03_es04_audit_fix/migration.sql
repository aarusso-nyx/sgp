CREATE OR REPLACE FUNCTION esocial.sgp_es04_emission_state_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_resource_id text;
BEGIN
  IF TG_TABLE_NAME = 's1200_emission_state' THEN
    v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
    v_resource_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)::text
      || ':' || COALESCE(NEW.employee_id, OLD.employee_id)::text;
  ELSE
    v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
    v_resource_id := COALESCE(NEW.payment_batch_id, OLD.payment_batch_id)::text
      || ':' || COALESCE(NEW.employee_id, OLD.employee_id)::text;
  END IF;

  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
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
