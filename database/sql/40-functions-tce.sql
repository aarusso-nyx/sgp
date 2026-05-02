CREATE FUNCTION tce.sgp_tce_adapter_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;
  resource_id := COALESCE(after_json ->> 'adapter_id', before_json ->> 'adapter_id');

  PERFORM set_config(
    'app.current_tenant_id',
    COALESCE(public.sgp_current_tenant_uuid(), '00000000-0000-0000-0000-000000000100'::uuid)::text,
    true
  );

  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION tce.sgp_tce_catalog_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');

  PERFORM set_config(
    'app.current_tenant_id',
    COALESCE(public.sgp_current_tenant_uuid(), '00000000-0000-0000-0000-000000000100'::uuid)::text,
    true
  );

  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION tce.sgp_tce_catalog_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION tce.sgp_tce_circuit_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION tce.sgp_tce_layout_version_no_active_overlap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND EXISTS (
    SELECT 1
    FROM tce.layout_version existing
    WHERE existing.id <> NEW.id
      AND existing.state_id = NEW.state_id
      AND lower(existing.system_name) = lower(NEW.system_name)
      AND existing.status = 'ACTIVE'
      AND daterange(existing.effective_from, COALESCE(existing.effective_to, 'infinity'::date), '[]')
        && daterange(NEW.effective_from, COALESCE(NEW.effective_to, 'infinity'::date), '[]')
  ) THEN
    RAISE EXCEPTION 'active layout version effective period overlaps for state and system'
      USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION tce.sgp_tce_queue_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  resource_tenant uuid;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  resource_tenant := COALESCE((after_json ->> 'tenant_id')::uuid, (before_json ->> 'tenant_id')::uuid);

  IF resource_tenant IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', resource_tenant::text, true);
  END IF;

  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    resource_tenant,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION tce.sgp_tce_queue_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION tce.sgp_tce_submission_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  resource_tenant uuid;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  resource_tenant := COALESCE((after_json ->> 'tenant_id')::uuid, (before_json ->> 'tenant_id')::uuid);

  PERFORM set_config('app.current_tenant_id', resource_tenant::text, true);

  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    resource_tenant,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION tce.sgp_tce_submission_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
