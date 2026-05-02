-- ES-08 real eSocial SOAP submission batches, endpoint circuit state, and RLS.

CREATE SCHEMA IF NOT EXISTS esocial;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_row
    JOIN pg_namespace namespace_row ON namespace_row.oid = type_row.typnamespace
    WHERE namespace_row.nspname = 'esocial'
      AND type_row.typname = 'submission_environment'
  ) THEN
    CREATE TYPE esocial.submission_environment AS ENUM ('PRODUCTION', 'QUALIFICATION');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_row
    JOIN pg_namespace namespace_row ON namespace_row.oid = type_row.typnamespace
    WHERE namespace_row.nspname = 'esocial'
      AND type_row.typname = 'submission_batch_status'
  ) THEN
    CREATE TYPE esocial.submission_batch_status AS ENUM (
      'PENDING',
      'SENT',
      'ACCEPTED',
      'REJECTED',
      'TIMEOUT',
      'RETRY'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_row
    JOIN pg_namespace namespace_row ON namespace_row.oid = type_row.typnamespace
    WHERE namespace_row.nspname = 'esocial'
      AND type_row.typname = 'endpoint_circuit_state_status'
  ) THEN
    CREATE TYPE esocial.endpoint_circuit_state_status AS ENUM (
      'CLOSED',
      'HALF_OPEN',
      'OPEN'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS esocial.submission_batch (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  environment esocial.submission_environment NOT NULL,
  endpoint_url text NOT NULL,
  event_ids uuid[] NOT NULL,
  soap_request_hash char(64),
  soap_response_hash char(64),
  http_status integer,
  status esocial.submission_batch_status NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_batch_pkey PRIMARY KEY (tenant_id, batch_id),
  CONSTRAINT submission_batch_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT submission_batch_event_ids_not_empty_chk CHECK (cardinality(event_ids) BETWEEN 1 AND 50),
  CONSTRAINT submission_batch_attempts_nonnegative_chk CHECK (attempts >= 0),
  CONSTRAINT submission_batch_http_status_chk CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599)
);

CREATE INDEX IF NOT EXISTS submission_batch_status_idx
  ON esocial.submission_batch (tenant_id, status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS submission_batch_event_ids_gin_idx
  ON esocial.submission_batch USING gin (event_ids);

CREATE TABLE IF NOT EXISTS esocial.endpoint_circuit_state (
  endpoint_url text PRIMARY KEY,
  opened_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  state esocial.endpoint_circuit_state_status NOT NULL DEFAULT 'CLOSED',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT endpoint_circuit_failure_count_nonnegative_chk CHECK (failure_count >= 0),
  CONSTRAINT endpoint_circuit_opened_at_chk CHECK (
    (state = 'OPEN' AND opened_at IS NOT NULL)
    OR (state <> 'OPEN')
  )
);

CREATE INDEX IF NOT EXISTS endpoint_circuit_state_state_idx
  ON esocial.endpoint_circuit_state (state, opened_at);

ALTER TABLE esocial.submission_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.submission_batch FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS submission_batch_select ON esocial.submission_batch;
CREATE POLICY submission_batch_select ON esocial.submission_batch
  FOR SELECT USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.submission.read', 'esocial.submission.retry'])
    )
  );
DROP POLICY IF EXISTS submission_batch_write ON esocial.submission_batch;
CREATE POLICY submission_batch_write ON esocial.submission_batch
  FOR ALL USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.submission.retry'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.submission.retry'])
    )
  );

ALTER TABLE esocial.endpoint_circuit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.endpoint_circuit_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS endpoint_circuit_state_select ON esocial.endpoint_circuit_state;
CREATE POLICY endpoint_circuit_state_select ON esocial.endpoint_circuit_state
  FOR SELECT USING (
    public.sgp_bypass_rls()
    OR public.sgp_has_any_permission(ARRAY['esocial.submission.read', 'esocial.submission.retry'])
  );
DROP POLICY IF EXISTS endpoint_circuit_state_worker_write ON esocial.endpoint_circuit_state;
CREATE POLICY endpoint_circuit_state_worker_write ON esocial.endpoint_circuit_state
  FOR ALL USING (public.sgp_bypass_rls())
  WITH CHECK (public.sgp_bypass_rls());

CREATE OR REPLACE FUNCTION esocial.audit_submission_batch_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row esocial.submission_batch;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;
  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.submission_batch',
    v_row.batch_id::text,
    NULL,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.submission_batch',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'environment', v_row.environment::text,
      'endpointUrl', v_row.endpoint_url,
      'status', v_row.status::text,
      'attempts', v_row.attempts,
      'eventCount', cardinality(v_row.event_ids),
      'httpStatus', v_row.http_status
    ),
    NULL,
    NULL,
    NULL
  );
  RETURN v_row;
END
$$;

DROP TRIGGER IF EXISTS trg_submission_batch_audit ON esocial.submission_batch;
CREATE TRIGGER trg_submission_batch_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.submission_batch
  FOR EACH ROW EXECUTE FUNCTION esocial.audit_submission_batch_mutation();

CREATE OR REPLACE FUNCTION esocial.audit_endpoint_circuit_state_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row esocial.endpoint_circuit_state;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.endpoint_circuit_state',
    v_row.endpoint_url,
    NULL,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.endpoint_circuit_state',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'endpointUrl', v_row.endpoint_url,
      'state', v_row.state::text,
      'failureCount', v_row.failure_count,
      'lastFailureAt', v_row.last_failure_at
    ),
    NULL,
    NULL,
    NULL
  );
  RETURN v_row;
END
$$;

DROP TRIGGER IF EXISTS trg_endpoint_circuit_state_audit ON esocial.endpoint_circuit_state;
CREATE TRIGGER trg_endpoint_circuit_state_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.endpoint_circuit_state
  FOR EACH ROW EXECUTE FUNCTION esocial.audit_endpoint_circuit_state_mutation();

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('esocial.submission.read', 'esocial', 'submission', 'read', '#!/esocial/**', 'Read eSocial SOAP submission batches, attempts, and circuit state.'),
  ('esocial.submission.retry', 'esocial', 'submission', 'retry', '#!/esocial/**', 'Force retry for eSocial SOAP submission batches.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'esocial.submission.read'),
    ('ADMIN', 'esocial.submission.retry'),
    ('FOLHA_OPERADOR', 'esocial.submission.read'),
    ('FOLHA_OPERADOR', 'esocial.submission.retry'),
    ('AUDITOR', 'esocial.submission.read')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile
  ON access_profile.code = profile_permissions.profile_code
 AND access_profile.tenant_id = public.sgp_current_tenant_uuid()
JOIN public.permission
  ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.submission_batch TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.endpoint_circuit_state TO sgp_app_role;
  END IF;
END
$$;
