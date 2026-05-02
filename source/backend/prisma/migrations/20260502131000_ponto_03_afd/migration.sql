CREATE TYPE ponto.afd_export_status AS ENUM ('GENERATING', 'READY', 'FAILED');
CREATE TYPE ponto.afd_import_status AS ENUM ('PENDING', 'PROCESSED', 'REJECTED');

CREATE TABLE ponto.afd_export (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  afd_export_id uuid NOT NULL DEFAULT gen_random_uuid(),
  rep_device_id uuid NOT NULL REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  file_sha256 bytea,
  line_count integer NOT NULL DEFAULT 0,
  requested_by_user_id text,
  status ponto.afd_export_status NOT NULL DEFAULT 'GENERATING',
  object_store_key text NOT NULL,
  error_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT afd_export_pkey PRIMARY KEY (afd_export_id),
  CONSTRAINT afd_export_period_chk CHECK (period_end >= period_start),
  CONSTRAINT afd_export_sha_len_chk CHECK (file_sha256 IS NULL OR length(file_sha256) = 32),
  CONSTRAINT afd_export_line_count_chk CHECK (line_count >= 0),
  CONSTRAINT afd_export_object_store_key_uq UNIQUE (tenant_id, object_store_key)
);

CREATE TABLE ponto.afd_import (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  afd_import_id uuid NOT NULL DEFAULT gen_random_uuid(),
  rep_device_id uuid NOT NULL REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT,
  file_name text NOT NULL,
  file_sha256 bytea NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  line_count integer NOT NULL DEFAULT 0,
  status ponto.afd_import_status NOT NULL DEFAULT 'PENDING',
  error_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  object_store_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT afd_import_pkey PRIMARY KEY (afd_import_id),
  CONSTRAINT afd_import_sha_len_chk CHECK (length(file_sha256) = 32),
  CONSTRAINT afd_import_line_count_chk CHECK (line_count >= 0),
  CONSTRAINT afd_import_object_store_key_uq UNIQUE (tenant_id, object_store_key)
);

CREATE TABLE ponto.afd_import_line (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  afd_import_id uuid NOT NULL REFERENCES ponto.afd_import(afd_import_id) ON DELETE CASCADE,
  rep_device_id uuid NOT NULL REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT,
  line_no integer NOT NULL,
  nsr bigint NOT NULL,
  record_type char(1) NOT NULL,
  raw_line text NOT NULL,
  parsed jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz,
  time_record_id uuid REFERENCES ponto.time_record(time_record_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT afd_import_line_pkey PRIMARY KEY (afd_import_id, line_no),
  CONSTRAINT afd_import_line_no_chk CHECK (line_no > 0),
  CONSTRAINT afd_import_line_nsr_chk CHECK (nsr >= 0),
  CONSTRAINT afd_import_line_type_chk CHECK (record_type ~ '^[1-9]$')
);

CREATE INDEX afd_export_device_period_idx ON ponto.afd_export(tenant_id, rep_device_id, period_start, period_end);
CREATE INDEX afd_import_device_imported_idx ON ponto.afd_import(tenant_id, rep_device_id, imported_at DESC);
CREATE INDEX afd_import_line_device_period_idx ON ponto.afd_import_line(tenant_id, rep_device_id, recorded_at, nsr);

CREATE OR REPLACE FUNCTION ponto.ponto03_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.ponto03_audit_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  IF TG_TABLE_NAME = 'afd_export' THEN
    v_resource_id := v_row.afd_export_id::text;
  ELSIF TG_TABLE_NAME = 'afd_import' THEN
    v_resource_id := v_row.afd_import_id::text;
  ELSIF TG_TABLE_NAME = 'afd_import_line' THEN
    v_resource_id := v_row.afd_import_id::text || ':' || v_row.line_no::text;
  END IF;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);

  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('tenantId', v_row.tenant_id::text),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER afd_export_touch_updated_at
  BEFORE UPDATE ON ponto.afd_export
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_touch_updated_at();
CREATE TRIGGER afd_import_touch_updated_at
  BEFORE UPDATE ON ponto.afd_import
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_touch_updated_at();
CREATE TRIGGER afd_import_line_touch_updated_at
  BEFORE UPDATE ON ponto.afd_import_line
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_touch_updated_at();

CREATE TRIGGER afd_export_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.afd_export
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_audit_row();
CREATE TRIGGER afd_import_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.afd_import
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_audit_row();
CREATE TRIGGER afd_import_line_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.afd_import_line
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_audit_row();

ALTER TABLE ponto.afd_export ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.afd_export FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.afd_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.afd_import FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.afd_import_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.afd_import_line FORCE ROW LEVEL SECURITY;

CREATE POLICY afd_export_rw ON ponto.afd_export
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.afd.read', 'ponto.afd.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.afd.write'])
  );

CREATE POLICY afd_import_rw ON ponto.afd_import
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.afd.read', 'ponto.afd.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.afd.write'])
  );

CREATE POLICY afd_import_line_rw ON ponto.afd_import_line
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.afd.read', 'ponto.afd.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.afd.write'])
  );
