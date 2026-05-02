CREATE TYPE ponto.rep_device_kind AS ENUM ('REP_P', 'REP_A', 'REP_C');
CREATE TYPE ponto.rep_device_status AS ENUM ('ACTIVE', 'INACTIVE', 'DECOMMISSIONED');
CREATE TYPE ponto.rep_ingestion_status AS ENUM ('RECEIVED', 'VALIDATING', 'PROCESSED', 'REJECTED');

CREATE TABLE ponto.rep_device (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  rep_device_id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind ponto.rep_device_kind NOT NULL,
  serial_number text,
  employer_tax_id text NOT NULL,
  manufacturer text,
  model text,
  program_hash text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  status ponto.rep_device_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_device_pkey PRIMARY KEY (rep_device_id),
  CONSTRAINT rep_device_program_hash_chk CHECK (kind <> 'REP_P' OR NULLIF(program_hash, '') IS NOT NULL),
  CONSTRAINT rep_device_serial_chk CHECK (kind <> 'REP_C' OR NULLIF(serial_number, '') IS NOT NULL),
  CONSTRAINT rep_device_employer_tax_id_chk CHECK (employer_tax_id ~ '^[0-9]{11}([0-9]{3})?$')
);

CREATE UNIQUE INDEX rep_device_rep_c_serial_uq
  ON ponto.rep_device (tenant_id, serial_number)
  WHERE kind = 'REP_C' AND serial_number IS NOT NULL;

CREATE TABLE ponto.rep_ingestion_batch (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  rep_device_id uuid NOT NULL REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT,
  kind ponto.rep_device_kind NOT NULL,
  file_name text,
  file_sha256 text NOT NULL,
  raw_file text NOT NULL DEFAULT '',
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status ponto.rep_ingestion_status NOT NULL DEFAULT 'RECEIVED',
  error_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_ingestion_batch_pkey PRIMARY KEY (batch_id),
  CONSTRAINT rep_ingestion_batch_sha_chk CHECK (file_sha256 ~ '^[a-f0-9]{64}$')
);

CREATE TABLE ponto.rep_ingestion_line (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL REFERENCES ponto.rep_ingestion_batch(batch_id) ON DELETE CASCADE,
  rep_device_id uuid NOT NULL REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT,
  line_no integer NOT NULL,
  nsr bigint NOT NULL,
  raw_line text NOT NULL,
  parsed jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_record_id uuid REFERENCES ponto.time_record(time_record_id) ON DELETE SET NULL,
  dedup_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_ingestion_line_pkey PRIMARY KEY (batch_id, line_no),
  CONSTRAINT rep_ingestion_line_nsr_chk CHECK (nsr > 0),
  CONSTRAINT rep_ingestion_line_line_no_chk CHECK (line_no > 0),
  CONSTRAINT rep_ingestion_line_device_nsr_uq UNIQUE (tenant_id, rep_device_id, nsr)
);

CREATE INDEX rep_device_tenant_kind_idx ON ponto.rep_device(tenant_id, kind, status);
CREATE INDEX rep_ingestion_batch_device_idx ON ponto.rep_ingestion_batch(tenant_id, rep_device_id, received_at DESC);
CREATE INDEX rep_ingestion_line_batch_idx ON ponto.rep_ingestion_line(tenant_id, batch_id, line_no);

CREATE OR REPLACE FUNCTION ponto.ponto02_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.ponto02_audit_row()
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

  IF TG_TABLE_NAME = 'rep_device' THEN
    v_resource_id := v_row.rep_device_id::text;
  ELSIF TG_TABLE_NAME = 'rep_ingestion_batch' THEN
    v_resource_id := v_row.batch_id::text;
  ELSIF TG_TABLE_NAME = 'rep_ingestion_line' THEN
    v_resource_id := v_row.batch_id::text || ':' || v_row.line_no::text;
  END IF;

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

CREATE TRIGGER rep_device_touch_updated_at
  BEFORE UPDATE ON ponto.rep_device
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_touch_updated_at();
CREATE TRIGGER rep_ingestion_batch_touch_updated_at
  BEFORE UPDATE ON ponto.rep_ingestion_batch
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_touch_updated_at();
CREATE TRIGGER rep_ingestion_line_touch_updated_at
  BEFORE UPDATE ON ponto.rep_ingestion_line
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_touch_updated_at();

CREATE TRIGGER rep_device_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.rep_device
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_audit_row();
CREATE TRIGGER rep_ingestion_batch_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.rep_ingestion_batch
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_audit_row();
CREATE TRIGGER rep_ingestion_line_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.rep_ingestion_line
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_audit_row();

ALTER TABLE ponto.rep_device ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.rep_device FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.rep_ingestion_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.rep_ingestion_batch FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.rep_ingestion_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.rep_ingestion_line FORCE ROW LEVEL SECURITY;

CREATE POLICY rep_device_rw ON ponto.rep_device
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.rep.read', 'ponto.rep.write', 'ponto.timerecord.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.rep.write'])
  );

CREATE POLICY rep_ingestion_batch_rw ON ponto.rep_ingestion_batch
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.rep.read', 'ponto.rep.write', 'ponto.timerecord.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.rep.write', 'ponto.timerecord.write'])
  );

CREATE POLICY rep_ingestion_line_rw ON ponto.rep_ingestion_line
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.rep.read', 'ponto.rep.write', 'ponto.timerecord.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.rep.write', 'ponto.timerecord.write'])
  );
