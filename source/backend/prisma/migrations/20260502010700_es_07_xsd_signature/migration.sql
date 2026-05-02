CREATE SCHEMA IF NOT EXISTS esocial;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'esocial'
      AND t.typname = 'certificate_kind'
  ) THEN
    CREATE TYPE esocial.certificate_kind AS ENUM ('A1', 'A3');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'esocial'
      AND t.typname = 'certificate_status'
  ) THEN
    CREATE TYPE esocial.certificate_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
  END IF;
END
$$;

CREATE TABLE esocial.tenant_certificate (
  tenant_id UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  certificate_id UUID NOT NULL DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL,
  kind esocial.certificate_kind NOT NULL,
  pkcs12_blob BYTEA NOT NULL,
  blob_kms_key_id TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  rotation_due_at TIMESTAMPTZ NOT NULL,
  status esocial.certificate_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tenant_certificate_pkey PRIMARY KEY (tenant_id, certificate_id),
  CONSTRAINT tenant_certificate_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT tenant_certificate_validity_check
    CHECK (valid_to > valid_from)
);

CREATE UNIQUE INDEX tenant_certificate_active_alias_key
  ON esocial.tenant_certificate (tenant_id, lower(alias))
  WHERE status = 'ACTIVE';
CREATE INDEX tenant_certificate_rotation_due_idx
  ON esocial.tenant_certificate (status, rotation_due_at);
CREATE INDEX tenant_certificate_valid_to_idx
  ON esocial.tenant_certificate (tenant_id, valid_to DESC);

CREATE TABLE esocial.xsd_validation_failure (
  tenant_id UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  attempt_id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_kind TEXT NOT NULL,
  xsd_path TEXT NOT NULL,
  error_xml_pointer TEXT NOT NULL,
  error_message TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT xsd_validation_failure_pkey PRIMARY KEY (tenant_id, attempt_id),
  CONSTRAINT xsd_validation_failure_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenant(id)
);

CREATE INDEX xsd_validation_failure_event_kind_idx
  ON esocial.xsd_validation_failure (tenant_id, event_kind, occurred_at DESC);

ALTER TABLE esocial.tenant_certificate ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.tenant_certificate FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_certificate_select ON esocial.tenant_certificate;
CREATE POLICY tenant_certificate_select ON esocial.tenant_certificate
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['esocial.certificate.read', 'esocial.certificate.write']
      )
    )
  );
DROP POLICY IF EXISTS tenant_certificate_write ON esocial.tenant_certificate;
CREATE POLICY tenant_certificate_write ON esocial.tenant_certificate
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'])
    )
  );

ALTER TABLE esocial.xsd_validation_failure ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.xsd_validation_failure FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS xsd_validation_failure_select ON esocial.xsd_validation_failure;
CREATE POLICY xsd_validation_failure_select ON esocial.xsd_validation_failure
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['esocial.certificate.read', 'esocial.certificate.write']
      )
    )
  );
DROP POLICY IF EXISTS xsd_validation_failure_write ON esocial.xsd_validation_failure;
CREATE POLICY xsd_validation_failure_write ON esocial.xsd_validation_failure
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'])
    )
  );

CREATE OR REPLACE FUNCTION esocial.audit_tenant_certificate_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action TEXT;
  v_tenant_id UUID;
  v_certificate_id TEXT;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  v_certificate_id := COALESCE(NEW.certificate_id, OLD.certificate_id)::text;

  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.tenant_certificate',
    v_certificate_id,
    NULL,
    NULL,
    NULL,
    'esocial.tenant_certificate',
    NULL,
    jsonb_build_object(
      'event', 'esocial.certificate.mutated',
      'operation', TG_OP,
      'alias', COALESCE(NEW.alias, OLD.alias),
      'status', COALESCE(NEW.status::text, OLD.status::text)
    ),
    NULL,
    NULL,
    NULL
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_certificate_audit ON esocial.tenant_certificate;
CREATE TRIGGER trg_tenant_certificate_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.tenant_certificate
  FOR EACH ROW EXECUTE FUNCTION esocial.audit_tenant_certificate_mutation();

CREATE OR REPLACE FUNCTION esocial.audit_xsd_validation_failure_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', NEW.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    'CREATE',
    'esocial.xsd_validation_failure',
    NEW.attempt_id::text,
    NULL,
    NULL,
    NULL,
    'esocial.xsd_validation_failure',
    NULL,
    jsonb_build_object(
      'event', 'esocial.xsd_validation_failed',
      'eventKind', NEW.event_kind,
      'xsdPath', NEW.xsd_path,
      'xmlPointer', NEW.error_xml_pointer
    ),
    NULL,
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xsd_validation_failure_audit ON esocial.xsd_validation_failure;
CREATE TRIGGER trg_xsd_validation_failure_audit
  AFTER INSERT ON esocial.xsd_validation_failure
  FOR EACH ROW EXECUTE FUNCTION esocial.audit_xsd_validation_failure_mutation();
