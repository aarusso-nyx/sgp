CREATE OR REPLACE FUNCTION payment.sgp_prior_notice_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  v_tenant_id uuid;
BEGIN
  after_json := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  before_json := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);

  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    'payment.prior_notice',
    COALESCE(after_json ->> 'employment_link_id', before_json ->> 'employment_link_id'),
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'payment.prior_notice',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;
