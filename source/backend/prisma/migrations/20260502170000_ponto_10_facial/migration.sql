CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'ponto' AND t.typname = 'face_template_status'
  ) THEN
    CREATE TYPE ponto.face_template_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'ponto' AND t.typname = 'face_match_decision'
  ) THEN
    CREATE TYPE ponto.face_match_decision AS ENUM ('ACCEPT', 'REJECT', 'MANUAL_REVIEW');
  END IF;
END
$$;

CREATE TABLE ponto.employee_face_template (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  embedding_cipher bytea NOT NULL,
  embedding_kms_key_id text NOT NULL,
  model_id text NOT NULL,
  model_version text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  status ponto.face_template_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_face_template_pkey PRIMARY KEY (id),
  CONSTRAINT employee_face_template_kms_chk CHECK (NULLIF(embedding_kms_key_id, '') IS NOT NULL),
  CONSTRAINT employee_face_template_model_chk CHECK (NULLIF(model_id, '') IS NOT NULL AND NULLIF(model_version, '') IS NOT NULL)
);

CREATE TABLE ponto.face_match (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  time_record_id uuid REFERENCES ponto.time_record(time_record_id) ON DELETE SET NULL,
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  score numeric(18,6) NOT NULL,
  threshold numeric(18,6) NOT NULL,
  liveness_passed boolean NOT NULL DEFAULT false,
  decision ponto.face_match_decision NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT face_match_pkey PRIMARY KEY (id),
  CONSTRAINT face_match_score_chk CHECK (score >= 0 AND score <= 1),
  CONSTRAINT face_match_threshold_chk CHECK (threshold >= 0 AND threshold <= 1),
  CONSTRAINT face_match_accept_chk CHECK (
    (decision = 'ACCEPT'::ponto.face_match_decision AND liveness_passed = true)
    OR decision <> 'ACCEPT'::ponto.face_match_decision
  )
);

CREATE TABLE ponto.face_threshold_config (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  threshold numeric(18,6) NOT NULL DEFAULT 0.700000,
  liveness_required boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT face_threshold_config_pkey PRIMARY KEY (tenant_id),
  CONSTRAINT face_threshold_config_threshold_chk CHECK (threshold >= 0 AND threshold <= 1)
);

CREATE TABLE ponto.face_consent (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  consent_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT face_consent_pkey PRIMARY KEY (id),
  CONSTRAINT face_consent_version_chk CHECK (NULLIF(consent_version, '') IS NOT NULL)
);

CREATE INDEX employee_face_template_employee_idx
  ON ponto.employee_face_template(tenant_id, employee_id, status, captured_at DESC);
CREATE INDEX face_match_employee_idx
  ON ponto.face_match(tenant_id, employee_id, occurred_at DESC);
CREATE INDEX face_match_time_record_idx
  ON ponto.face_match(tenant_id, time_record_id);
CREATE INDEX face_consent_employee_idx
  ON ponto.face_consent(tenant_id, employee_id, consent_at DESC)
  WHERE withdrawn_at IS NULL;

CREATE OR REPLACE FUNCTION ponto.ponto10_face_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.ponto10_face_audit_row()
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
  v_resource_id := COALESCE((to_jsonb(v_row) ->> 'id'), v_row.tenant_id::text);
  v_metadata := jsonb_build_object(
    'tenantId', v_row.tenant_id::text,
    'operation', TG_OP
  );

  IF TG_TABLE_NAME = 'employee_face_template' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'employeeId', v_row.employee_id::text,
      'status', v_row.status::text,
      'modelId', v_row.model_id,
      'modelVersion', v_row.model_version,
      'embeddingEncrypted', true,
      'kmsKeyIdPresent', NULLIF(v_row.embedding_kms_key_id, '') IS NOT NULL
    );
  ELSIF TG_TABLE_NAME = 'face_match' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'employeeId', v_row.employee_id::text,
      'timeRecordId', v_row.time_record_id::text,
      'score', v_row.score::text,
      'threshold', v_row.threshold::text,
      'livenessPassed', v_row.liveness_passed,
      'decision', v_row.decision::text,
      'deviceIdPresent', NULLIF(v_row.device_id, '') IS NOT NULL
    );
  ELSIF TG_TABLE_NAME = 'face_threshold_config' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'threshold', v_row.threshold::text,
      'livenessRequired', v_row.liveness_required
    );
  ELSIF TG_TABLE_NAME = 'face_consent' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'employeeId', v_row.employee_id::text,
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

CREATE TRIGGER employee_face_template_touch_updated_at
  BEFORE UPDATE ON ponto.employee_face_template
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_touch_updated_at();
CREATE TRIGGER face_consent_touch_updated_at
  BEFORE UPDATE ON ponto.face_consent
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_touch_updated_at();

CREATE TRIGGER employee_face_template_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.employee_face_template
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_audit_row();
CREATE TRIGGER face_match_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.face_match
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_audit_row();
CREATE TRIGGER face_threshold_config_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.face_threshold_config
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_audit_row();
CREATE TRIGGER face_consent_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.face_consent
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_audit_row();

ALTER TABLE ponto.employee_face_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.employee_face_template FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.face_match ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.face_match FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.face_threshold_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.face_threshold_config FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.face_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.face_consent FORCE ROW LEVEL SECURITY;

CREATE POLICY employee_face_template_rw ON ponto.employee_face_template
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.read', 'ponto.face.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.write']));

CREATE POLICY face_match_rw ON ponto.face_match
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.read', 'ponto.face.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.write']));

CREATE POLICY face_threshold_config_rw ON ponto.face_threshold_config
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.read', 'ponto.face.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.write']));

CREATE POLICY face_consent_rw ON ponto.face_consent
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.read', 'ponto.face.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.write']));

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('ponto.face.read', 'ponto', 'face', 'read', '/api/v1/ponto/face/**', 'Read facial recognition consent, templates, threshold, and match decisions.'),
  ('ponto.face.write', 'ponto', 'face', 'write', '/api/v1/ponto/face/**', 'Enroll, match, configure threshold, revoke, and crypto-shred facial recognition data.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;
