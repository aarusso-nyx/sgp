CREATE SCHEMA IF NOT EXISTS tce;

DO $$
BEGIN
  IF to_regtype('tce.organ_kind') IS NULL THEN
    CREATE TYPE tce.organ_kind AS ENUM ('TCE', 'TCM', 'TCU');
  END IF;
  IF to_regtype('tce.adapter_status') IS NULL THEN
    CREATE TYPE tce.adapter_status AS ENUM (
      'REGISTERED',
      'ENABLED',
      'DISABLED',
      'DEPRECATED'
    );
  END IF;
  IF to_regtype('tce.adapter_lifecycle_event_kind') IS NULL THEN
    CREATE TYPE tce.adapter_lifecycle_event_kind AS ENUM (
      'REGISTERED',
      'ENABLED',
      'DISABLED',
      'VALIDATION_OK',
      'VALIDATION_FAIL',
      'SUBMISSION_OK',
      'SUBMISSION_FAIL',
      'HEALTH_OK',
      'HEALTH_FAIL'
    );
  END IF;
END
$$;

CREATE TABLE tce.adapter_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_id text NOT NULL UNIQUE,
  state_code char(2) NOT NULL,
  municipal_code text,
  organ_kind tce.organ_kind NOT NULL,
  version text NOT NULL,
  status tce.adapter_status NOT NULL DEFAULT 'REGISTERED',
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_health_check_at timestamptz,
  last_health_status text,
  CONSTRAINT adapter_registry_adapter_id_chk CHECK (adapter_id ~ '^[a-z0-9][a-z0-9._-]{1,62}$'),
  CONSTRAINT adapter_registry_state_code_chk CHECK (state_code ~ '^[A-Z]{2}$'),
  CONSTRAINT adapter_registry_municipal_code_chk CHECK (
    municipal_code IS NULL OR length(trim(municipal_code)) > 0
  ),
  CONSTRAINT adapter_registry_version_semver_chk CHECK (
    version ~ '^[0-9]+[.][0-9]+[.][0-9]+([+-][0-9A-Za-z.-]+)?$'
  ),
  CONSTRAINT adapter_registry_capabilities_chk CHECK (jsonb_typeof(capabilities) = 'object')
);

CREATE INDEX adapter_registry_state_organ_idx
  ON tce.adapter_registry (state_code, organ_kind, status);

CREATE TABLE tce.adapter_lifecycle_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_id text NOT NULL,
  event tce.adapter_lifecycle_event_kind NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adapter_lifecycle_event_adapter_fk FOREIGN KEY (adapter_id)
    REFERENCES tce.adapter_registry(adapter_id) ON DELETE CASCADE,
  CONSTRAINT adapter_lifecycle_event_payload_chk CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX adapter_lifecycle_event_adapter_time_idx
  ON tce.adapter_lifecycle_event (adapter_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION tce.sgp_tce_adapter_audit()
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

DROP TRIGGER IF EXISTS adapter_registry_audit ON tce.adapter_registry;
CREATE TRIGGER adapter_registry_audit
  AFTER INSERT OR UPDATE OR DELETE ON tce.adapter_registry
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_adapter_audit();

DROP TRIGGER IF EXISTS adapter_lifecycle_event_audit ON tce.adapter_lifecycle_event;
CREATE TRIGGER adapter_lifecycle_event_audit
  AFTER INSERT OR UPDATE OR DELETE ON tce.adapter_lifecycle_event
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_adapter_audit();

ALTER TABLE tce.adapter_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE tce.adapter_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE tce.adapter_lifecycle_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE tce.adapter_lifecycle_event FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS adapter_registry_select ON tce.adapter_registry;
CREATE POLICY adapter_registry_select ON tce.adapter_registry
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR public.sgp_has_any_permission(ARRAY['tce.adapter.read', 'tce.adapter.manage'])
  );

DROP POLICY IF EXISTS adapter_registry_worker_write ON tce.adapter_registry;
CREATE POLICY adapter_registry_worker_write ON tce.adapter_registry
  FOR ALL
  USING (public.sgp_bypass_rls())
  WITH CHECK (public.sgp_bypass_rls());

DROP POLICY IF EXISTS adapter_lifecycle_event_select ON tce.adapter_lifecycle_event;
CREATE POLICY adapter_lifecycle_event_select ON tce.adapter_lifecycle_event
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR public.sgp_has_any_permission(ARRAY['tce.adapter.read', 'tce.adapter.manage'])
  );

DROP POLICY IF EXISTS adapter_lifecycle_event_worker_write ON tce.adapter_lifecycle_event;
CREATE POLICY adapter_lifecycle_event_worker_write ON tce.adapter_lifecycle_event
  FOR ALL
  USING (public.sgp_bypass_rls())
  WITH CHECK (public.sgp_bypass_rls());

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  (
    'tce.adapter.read',
    'tce',
    'adapter',
    'read',
    '/api/v1/tce/adapters/**',
    'Read registered Court of Accounts adapters and lifecycle events.'
  ),
  (
    'tce.adapter.manage',
    'tce',
    'adapter',
    'manage',
    '#!/tce/adapters',
    'Enable and disable Court of Accounts adapters through the registry.'
  )
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'tce.adapter.read'),
    ('ADMIN', 'tce.adapter.manage'),
    ('AUDITOR', 'tce.adapter.read')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile
  ON access_profile.code = profile_permissions.profile_code
JOIN public.permission
  ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA tce TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.adapter_registry TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.adapter_lifecycle_event TO sgp_app_role;
  END IF;
END
$$;
