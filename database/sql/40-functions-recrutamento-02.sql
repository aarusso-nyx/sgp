CREATE FUNCTION recrutamento.sgp_banca_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json)
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_biometric_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
  metadata jsonb;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  after_json := after_json - 'template_cipher';
  before_json := before_json - 'template_cipher';
  metadata := jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json);

  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    metadata
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_classificacao_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id', after_json ->> 'snapshot_id', before_json ->> 'snapshot_id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json)
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_concurso_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id', after_json ->> 'concurso_id', before_json ->> 'concurso_id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json)
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_inscricao_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json)
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_nomeacao_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id', after_json ->> 'nomeacao_id', before_json ->> 'nomeacao_id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json)
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_posse_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    'recrutamento.posse',
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'recrutamento.posse',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_proctoring_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json)
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.touch_nomeacao_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION recrutamento.touch_posse_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
