ALTER TYPE ponto.rep_device_kind ADD VALUE IF NOT EXISTS 'FINGERPRINT';
ALTER TYPE ponto.rep_device_kind ADD VALUE IF NOT EXISTS 'PALM_VEIN';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'ponto' AND t.typname = 'biometric_kind'
  ) THEN
    CREATE TYPE ponto.biometric_kind AS ENUM ('FINGERPRINT', 'PALM_VEIN');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'ponto' AND t.typname = 'biometric_template_status'
  ) THEN
    CREATE TYPE ponto.biometric_template_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
  END IF;
END
$$;

CREATE TABLE ponto.biometric_consent (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  consent_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT biometric_consent_pkey PRIMARY KEY (id),
  CONSTRAINT biometric_consent_version_chk CHECK (NULLIF(consent_version, '') IS NOT NULL)
);

CREATE TABLE ponto.employee_biometric_template (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  kind ponto.biometric_kind NOT NULL,
  template_cipher bytea NOT NULL,
  template_kms_key_id text NOT NULL,
  quality_score numeric(18,6) NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  status ponto.biometric_template_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_biometric_template_pkey PRIMARY KEY (id),
  CONSTRAINT employee_biometric_template_quality_chk CHECK (quality_score >= 0 AND quality_score <= 1),
  CONSTRAINT employee_biometric_template_kms_chk CHECK (NULLIF(template_kms_key_id, '') IS NOT NULL)
);

CREATE TABLE ponto.biometric_match (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  time_record_id uuid NOT NULL REFERENCES ponto.time_record(time_record_id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  kind ponto.biometric_kind NOT NULL,
  score numeric(18,6) NOT NULL,
  threshold numeric(18,6) NOT NULL,
  device_id uuid REFERENCES ponto.rep_device(rep_device_id) ON DELETE SET NULL,
  matched boolean NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT biometric_match_pkey PRIMARY KEY (id),
  CONSTRAINT biometric_match_score_chk CHECK (score >= 0 AND score <= 1),
  CONSTRAINT biometric_match_threshold_chk CHECK (threshold >= 0 AND threshold <= 1)
);

CREATE INDEX biometric_consent_employee_idx
  ON ponto.biometric_consent(tenant_id, employee_id, consent_at DESC)
  WHERE withdrawn_at IS NULL;
CREATE INDEX employee_biometric_template_employee_kind_idx
  ON ponto.employee_biometric_template(tenant_id, employee_id, kind, status, captured_at DESC);
CREATE INDEX biometric_match_time_record_idx
  ON ponto.biometric_match(tenant_id, time_record_id);
CREATE INDEX biometric_match_employee_idx
  ON ponto.biometric_match(tenant_id, employee_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION ponto.ponto08_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.ponto08_audit_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
  v_metadata jsonb;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_resource_id := v_row.id::text;
  v_metadata := jsonb_build_object(
    'tenantId', v_row.tenant_id::text,
    'operation', TG_OP,
    'employeeId', v_row.employee_id::text
  );

  IF TG_TABLE_NAME = 'employee_biometric_template' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'kind', v_row.kind::text,
      'status', v_row.status::text,
      'qualityScore', v_row.quality_score::text,
      'templateEncrypted', true,
      'kmsKeyIdPresent', NULLIF(v_row.template_kms_key_id, '') IS NOT NULL
    );
  ELSIF TG_TABLE_NAME = 'biometric_match' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'timeRecordId', v_row.time_record_id::text,
      'kind', v_row.kind::text,
      'score', v_row.score::text,
      'threshold', v_row.threshold::text,
      'matched', v_row.matched
    );
  ELSIF TG_TABLE_NAME = 'biometric_consent' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'consentVersion', v_row.consent_version,
      'withdrawn', v_row.withdrawn_at IS NOT NULL
    );
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
    v_metadata,
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER biometric_consent_touch_updated_at
  BEFORE UPDATE ON ponto.biometric_consent
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_touch_updated_at();
CREATE TRIGGER employee_biometric_template_touch_updated_at
  BEFORE UPDATE ON ponto.employee_biometric_template
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_touch_updated_at();

CREATE TRIGGER biometric_consent_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.biometric_consent
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_audit_row();
CREATE TRIGGER employee_biometric_template_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.employee_biometric_template
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_audit_row();
CREATE TRIGGER biometric_match_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.biometric_match
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_audit_row();

ALTER TABLE ponto.biometric_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.biometric_consent FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.employee_biometric_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.employee_biometric_template FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.biometric_match ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.biometric_match FORCE ROW LEVEL SECURITY;

CREATE POLICY biometric_consent_rw ON ponto.biometric_consent
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.read', 'ponto.biometric.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.write']));

CREATE POLICY employee_biometric_template_rw ON ponto.employee_biometric_template
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.read', 'ponto.biometric.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.write']));

CREATE POLICY biometric_match_rw ON ponto.biometric_match
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.read', 'ponto.biometric.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.write']));

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('ponto.biometric.read', 'ponto', 'biometric', 'read', '/api/v1/ponto/biometria/**', 'Read employee biometric consent, template metadata, and match decisions.'),
  ('ponto.biometric.write', 'ponto', 'biometric', 'write', '/api/v1/ponto/biometria/**', 'Enroll, match, revoke, and crypto-shred employee biometrics for REP clock-in.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;
