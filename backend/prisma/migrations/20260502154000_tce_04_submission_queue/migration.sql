CREATE SCHEMA IF NOT EXISTS tce;

DO $$
BEGIN
  IF to_regtype('tce.submission_queue_status') IS NULL THEN
    CREATE TYPE tce.submission_queue_status AS ENUM (
      'PENDING',
      'LOCKED',
      'SUCCEEDED',
      'FAILED',
      'RETRY',
      'DEAD_LETTER'
    );
  END IF;
  IF to_regtype('tce.submission_error_kind') IS NULL THEN
    CREATE TYPE tce.submission_error_kind AS ENUM (
      'TRANSIENT',
      'DEFINITIVE',
      'TIMEOUT',
      'VALIDATION'
    );
  END IF;
  IF to_regtype('tce.adapter_circuit_state_status') IS NULL THEN
    CREATE TYPE tce.adapter_circuit_state_status AS ENUM (
      'CLOSED',
      'HALF_OPEN',
      'OPEN'
    );
  END IF;
  IF to_regtype('tce.submission_attempt_outcome') IS NULL THEN
    CREATE TYPE tce.submission_attempt_outcome AS ENUM (
      'SUCCESS',
      'TRANSIENT_FAIL',
      'DEFINITIVE_FAIL',
      'TIMEOUT',
      'CIRCUIT_OPEN'
    );
  END IF;
END
$$;

CREATE TABLE tce.submission_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  submission_id uuid NOT NULL REFERENCES tce.submission(id) ON DELETE CASCADE,
  adapter_id text NOT NULL,
  endpoint_url text,
  status tce.submission_queue_status NOT NULL DEFAULT 'PENDING',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 8,
  next_attempt_at timestamptz,
  locked_by text,
  locked_at timestamptz,
  last_error_kind tce.submission_error_kind,
  last_error_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_queue_attempts_chk CHECK (attempts >= 0),
  CONSTRAINT submission_queue_max_attempts_chk CHECK (max_attempts > 0),
  CONSTRAINT submission_queue_adapter_chk CHECK (adapter_id ~ '^[a-z0-9][a-z0-9._-]{1,62}$'),
  CONSTRAINT submission_queue_last_error_payload_chk CHECK (
    last_error_payload IS NULL OR jsonb_typeof(last_error_payload) = 'object'
  )
);

CREATE INDEX submission_queue_claim_idx
  ON tce.submission_queue (status, next_attempt_at);

CREATE INDEX submission_queue_submission_idx
  ON tce.submission_queue (submission_id);

CREATE INDEX submission_queue_tenant_adapter_idx
  ON tce.submission_queue (tenant_id, adapter_id, created_at DESC);

CREATE TABLE tce.adapter_circuit_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_id text NOT NULL,
  endpoint_url text NOT NULL DEFAULT '',
  state tce.adapter_circuit_state_status NOT NULL DEFAULT 'CLOSED',
  failure_count int NOT NULL DEFAULT 0,
  opened_at timestamptz,
  last_failure_at timestamptz,
  last_success_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adapter_circuit_state_adapter_chk CHECK (adapter_id ~ '^[a-z0-9][a-z0-9._-]{1,62}$'),
  CONSTRAINT adapter_circuit_state_failure_count_chk CHECK (failure_count >= 0),
  CONSTRAINT adapter_circuit_state_unique UNIQUE (adapter_id, endpoint_url)
);

CREATE TABLE tce.submission_attempt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES tce.submission_queue(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  attempt_number int NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  outcome tce.submission_attempt_outcome NOT NULL,
  error_payload jsonb,
  CONSTRAINT submission_attempt_number_chk CHECK (attempt_number > 0),
  CONSTRAINT submission_attempt_error_payload_chk CHECK (
    error_payload IS NULL OR jsonb_typeof(error_payload) = 'object'
  )
);

CREATE INDEX submission_attempt_queue_idx
  ON tce.submission_attempt (queue_id, started_at DESC);

CREATE OR REPLACE FUNCTION tce.sgp_tce_queue_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION tce.sgp_tce_queue_audit()
RETURNS trigger
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

DROP TRIGGER IF EXISTS submission_queue_touch_updated_at ON tce.submission_queue;
CREATE TRIGGER submission_queue_touch_updated_at
  BEFORE UPDATE ON tce.submission_queue
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_touch_updated_at();

DROP TRIGGER IF EXISTS submission_queue_audit ON tce.submission_queue;
CREATE TRIGGER submission_queue_audit
  AFTER INSERT OR UPDATE OR DELETE ON tce.submission_queue
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_audit();

DROP TRIGGER IF EXISTS submission_attempt_audit ON tce.submission_attempt;
CREATE TRIGGER submission_attempt_audit
  AFTER INSERT OR UPDATE OR DELETE ON tce.submission_attempt
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_audit();

CREATE OR REPLACE FUNCTION tce.sgp_tce_circuit_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS adapter_circuit_state_touch_updated_at ON tce.adapter_circuit_state;
CREATE TRIGGER adapter_circuit_state_touch_updated_at
  BEFORE UPDATE ON tce.adapter_circuit_state
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_circuit_touch_updated_at();

ALTER TABLE tce.submission_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE tce.submission_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE tce.submission_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE tce.submission_attempt FORCE ROW LEVEL SECURITY;
ALTER TABLE tce.adapter_circuit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tce.adapter_circuit_state FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submission_queue_select ON tce.submission_queue;
CREATE POLICY submission_queue_select ON tce.submission_queue
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.read', 'tce.submission.manage'])
    )
  );

DROP POLICY IF EXISTS submission_queue_write ON tce.submission_queue;
CREATE POLICY submission_queue_write ON tce.submission_queue
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.read', 'tce.submission.manage'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.read', 'tce.submission.manage'])
    )
  );

DROP POLICY IF EXISTS submission_attempt_select ON tce.submission_attempt;
CREATE POLICY submission_attempt_select ON tce.submission_attempt
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.read', 'tce.submission.manage'])
    )
  );

DROP POLICY IF EXISTS submission_attempt_write ON tce.submission_attempt;
CREATE POLICY submission_attempt_write ON tce.submission_attempt
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.read', 'tce.submission.manage'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.read', 'tce.submission.manage'])
    )
  );

DROP POLICY IF EXISTS adapter_circuit_state_select ON tce.adapter_circuit_state;
CREATE POLICY adapter_circuit_state_select ON tce.adapter_circuit_state
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR public.sgp_has_any_permission(ARRAY['tce.submission.read', 'tce.submission.manage'])
  );

DROP POLICY IF EXISTS adapter_circuit_state_worker_write ON tce.adapter_circuit_state;
CREATE POLICY adapter_circuit_state_worker_write ON tce.adapter_circuit_state
  FOR ALL
  USING (public.sgp_bypass_rls())
  WITH CHECK (public.sgp_bypass_rls());

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('tce.submission.read', 'tce', 'submission', 'read', '/api/v1/tce/**', 'Read TCE submissions, queues, attempts, and circuit diagnostics.'),
  ('tce.submission.manage', 'tce', 'submission', 'manage', '#!/tce/queue', 'Manage TCE submissions, replay queue jobs, and reset adapter circuits.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA tce TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.submission_queue TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.submission_attempt TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.adapter_circuit_state TO sgp_app_role;
  END IF;
END
$$;
