DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'biometric_kind'
  ) THEN
    CREATE TYPE recrutamento.biometric_kind AS ENUM ('FINGERPRINT', 'FACE');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'biometric_status'
  ) THEN
    CREATE TYPE recrutamento.biometric_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'biometric_match_decision'
  ) THEN
    CREATE TYPE recrutamento.biometric_match_decision AS ENUM ('ACCEPT', 'REJECT', 'MANUAL_REVIEW');
  END IF;
END
$$;

CREATE TABLE recrutamento.biometric_consent (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL,
  consent_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  signed_doc_ref text NOT NULL,
  withdrawn_at timestamptz,
  CONSTRAINT biometric_consent_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT biometric_consent_candidato_fk FOREIGN KEY (tenant_id, candidato_id)
    REFERENCES recrutamento.candidato(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE recrutamento.candidate_biometric (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL,
  kind recrutamento.biometric_kind NOT NULL,
  template_cipher bytea NOT NULL,
  template_kms_key_id text NOT NULL,
  quality_score numeric(18, 6) NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  capture_device_ref text NOT NULL,
  retention_until timestamptz NOT NULL,
  status recrutamento.biometric_status NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT candidate_biometric_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT candidate_biometric_candidato_fk FOREIGN KEY (tenant_id, candidato_id)
    REFERENCES recrutamento.candidato(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT candidate_biometric_quality_check CHECK (quality_score >= 0 AND quality_score <= 1)
);

CREATE TABLE recrutamento.biometric_match_attempt (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL,
  exam_session_id uuid,
  matched boolean NOT NULL,
  score numeric(18, 6) NOT NULL,
  threshold numeric(18, 6) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  decision recrutamento.biometric_match_decision NOT NULL,
  CONSTRAINT biometric_match_attempt_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT biometric_match_attempt_candidato_fk FOREIGN KEY (tenant_id, candidato_id)
    REFERENCES recrutamento.candidato(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT biometric_match_attempt_score_check CHECK (score >= 0 AND score <= 1),
  CONSTRAINT biometric_match_attempt_threshold_check CHECK (threshold >= 0 AND threshold <= 1)
);

CREATE INDEX candidate_biometric_candidate_kind_idx
  ON recrutamento.candidate_biometric (tenant_id, candidato_id, kind, status);
CREATE INDEX candidate_biometric_retention_idx
  ON recrutamento.candidate_biometric (tenant_id, retention_until)
  WHERE status = 'ACTIVE';
CREATE INDEX biometric_consent_active_idx
  ON recrutamento.biometric_consent (tenant_id, candidato_id, consent_at DESC)
  WHERE withdrawn_at IS NULL;
CREATE INDEX biometric_match_attempt_candidate_idx
  ON recrutamento.biometric_match_attempt (tenant_id, candidato_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION recrutamento.sgp_biometric_audit()
RETURNS trigger
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

DROP TRIGGER IF EXISTS candidate_biometric_audit ON recrutamento.candidate_biometric;
CREATE TRIGGER candidate_biometric_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.candidate_biometric
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_biometric_audit();

DROP TRIGGER IF EXISTS biometric_consent_audit ON recrutamento.biometric_consent;
CREATE TRIGGER biometric_consent_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.biometric_consent
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_biometric_audit();

DROP TRIGGER IF EXISTS biometric_match_attempt_audit ON recrutamento.biometric_match_attempt;
CREATE TRIGGER biometric_match_attempt_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.biometric_match_attempt
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_biometric_audit();

ALTER TABLE recrutamento.candidate_biometric ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.candidate_biometric FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.biometric_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.biometric_consent FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.biometric_match_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.biometric_match_attempt FORCE ROW LEVEL SECURITY;

CREATE POLICY candidate_biometric_select ON recrutamento.candidate_biometric FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.read', 'recrutamento.biometric.write'])));
CREATE POLICY candidate_biometric_write ON recrutamento.candidate_biometric FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'])));

CREATE POLICY biometric_consent_select ON recrutamento.biometric_consent FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.read', 'recrutamento.biometric.write'])));
CREATE POLICY biometric_consent_write ON recrutamento.biometric_consent FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'])));

CREATE POLICY biometric_match_attempt_select ON recrutamento.biometric_match_attempt FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.read', 'recrutamento.biometric.write'])));
CREATE POLICY biometric_match_attempt_write ON recrutamento.biometric_match_attempt FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'])));

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('recrutamento.biometric.read', 'recrutamento', 'biometric', 'read', '/api/v1/recrutamento/biometria/**', 'Read candidate biometric consent, capture metadata, and match decisions.'),
  ('recrutamento.biometric.write', 'recrutamento', 'biometric', 'write', '/api/v1/recrutamento/biometria/**', 'Capture, match, expire, and revoke candidate biometrics.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;
