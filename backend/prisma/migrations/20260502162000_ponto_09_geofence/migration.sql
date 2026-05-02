CREATE SCHEMA IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA postgis;

ALTER TYPE ponto.time_record_source ADD VALUE IF NOT EXISTS 'MOBILE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'ponto' AND t.typname = 'mobile_clock_in_result'
  ) THEN
    CREATE TYPE ponto.mobile_clock_in_result AS ENUM (
      'ACCEPTED',
      'OUT_OF_FENCE',
      'MOCK_DETECTED',
      'IMPOSSIBLE_VELOCITY',
      'LOW_PRECISION',
      'NO_GEOLOCATION_CONSENT'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'ponto' AND t.typname = 'mobile_platform'
  ) THEN
    CREATE TYPE ponto.mobile_platform AS ENUM ('IOS', 'ANDROID');
  END IF;
END
$$;

ALTER TABLE hr.work_location
  ADD COLUMN IF NOT EXISTS geofence_polygon postgis.geometry(POLYGON, 4326);

CREATE INDEX IF NOT EXISTS work_location_geofence_gist_idx
  ON hr.work_location USING gist (geofence_polygon);

CREATE TABLE ponto.mobile_device_registration (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  device_id text NOT NULL,
  platform ponto.mobile_platform NOT NULL,
  public_key text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobile_device_registration_pkey PRIMARY KEY (id),
  CONSTRAINT mobile_device_registration_device_chk CHECK (NULLIF(device_id, '') IS NOT NULL),
  CONSTRAINT mobile_device_registration_public_key_chk CHECK (NULLIF(public_key, '') IS NOT NULL),
  CONSTRAINT mobile_device_registration_employee_device_uq UNIQUE (tenant_id, employee_id, device_id)
);

CREATE TABLE ponto.mobile_geolocation_consent (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  consent_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobile_geolocation_consent_pkey PRIMARY KEY (id),
  CONSTRAINT mobile_geolocation_consent_version_chk CHECK (NULLIF(consent_version, '') IS NOT NULL)
);

CREATE TABLE ponto.mobile_clock_in_attempt (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL,
  lat numeric(18,6) NOT NULL,
  lon numeric(18,6) NOT NULL,
  gps_precision_m numeric(18,6) NOT NULL,
  mock_location boolean NOT NULL DEFAULT false,
  device_id text NOT NULL,
  work_location_id uuid REFERENCES hr.work_location(id) ON DELETE RESTRICT,
  result ponto.mobile_clock_in_result NOT NULL,
  time_record_id uuid REFERENCES ponto.time_record(time_record_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobile_clock_in_attempt_pkey PRIMARY KEY (id),
  CONSTRAINT mobile_clock_in_attempt_lat_chk CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT mobile_clock_in_attempt_lon_chk CHECK (lon BETWEEN -180 AND 180),
  CONSTRAINT mobile_clock_in_attempt_precision_chk CHECK (gps_precision_m >= 0),
  CONSTRAINT mobile_clock_in_attempt_device_chk CHECK (NULLIF(device_id, '') IS NOT NULL),
  CONSTRAINT mobile_clock_in_attempt_accept_record_chk CHECK (
    (result = 'ACCEPTED'::ponto.mobile_clock_in_result AND time_record_id IS NOT NULL)
    OR (result <> 'ACCEPTED'::ponto.mobile_clock_in_result AND time_record_id IS NULL)
  )
);

CREATE INDEX mobile_device_registration_employee_idx
  ON ponto.mobile_device_registration(tenant_id, employee_id, revoked_at);
CREATE INDEX mobile_geolocation_consent_employee_idx
  ON ponto.mobile_geolocation_consent(tenant_id, employee_id, consent_at DESC)
  WHERE withdrawn_at IS NULL;
CREATE INDEX mobile_clock_in_attempt_employee_idx
  ON ponto.mobile_clock_in_attempt(tenant_id, employee_id, occurred_at DESC);
CREATE INDEX mobile_clock_in_attempt_result_idx
  ON ponto.mobile_clock_in_attempt(tenant_id, result, occurred_at DESC);

CREATE OR REPLACE FUNCTION ponto.ponto09_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.ponto09_audit_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
  v_metadata jsonb;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_metadata := jsonb_build_object(
    'tenantId', v_row.tenant_id::text,
    'operation', TG_OP,
    'employeeId', v_row.employee_id::text
  );

  IF TG_TABLE_NAME = 'mobile_clock_in_attempt' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'result', v_row.result::text,
      'mockLocation', v_row.mock_location,
      'deviceIdPresent', NULLIF(v_row.device_id, '') IS NOT NULL,
      'workLocationId', v_row.work_location_id::text,
      'timeRecordId', v_row.time_record_id::text,
      'gpsPrecisionM', v_row.gps_precision_m::text
    );
  ELSIF TG_TABLE_NAME = 'mobile_device_registration' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'platform', v_row.platform::text,
      'deviceIdPresent', NULLIF(v_row.device_id, '') IS NOT NULL,
      'publicKeyPresent', NULLIF(v_row.public_key, '') IS NOT NULL,
      'revoked', v_row.revoked_at IS NOT NULL
    );
  ELSIF TG_TABLE_NAME = 'mobile_geolocation_consent' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'consentVersion', v_row.consent_version,
      'withdrawn', v_row.withdrawn_at IS NOT NULL
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.id::text,
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

DROP TRIGGER IF EXISTS mobile_device_registration_touch_updated_at ON ponto.mobile_device_registration;
CREATE TRIGGER mobile_device_registration_touch_updated_at
  BEFORE UPDATE ON ponto.mobile_device_registration
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_touch_updated_at();

DROP TRIGGER IF EXISTS mobile_geolocation_consent_touch_updated_at ON ponto.mobile_geolocation_consent;
CREATE TRIGGER mobile_geolocation_consent_touch_updated_at
  BEFORE UPDATE ON ponto.mobile_geolocation_consent
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_touch_updated_at();

DROP TRIGGER IF EXISTS mobile_device_registration_audit ON ponto.mobile_device_registration;
CREATE TRIGGER mobile_device_registration_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.mobile_device_registration
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_audit_row();

DROP TRIGGER IF EXISTS mobile_geolocation_consent_audit ON ponto.mobile_geolocation_consent;
CREATE TRIGGER mobile_geolocation_consent_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.mobile_geolocation_consent
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_audit_row();

DROP TRIGGER IF EXISTS mobile_clock_in_attempt_audit ON ponto.mobile_clock_in_attempt;
CREATE TRIGGER mobile_clock_in_attempt_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.mobile_clock_in_attempt
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_audit_row();

ALTER TABLE ponto.mobile_device_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.mobile_device_registration FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.mobile_geolocation_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.mobile_geolocation_consent FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.mobile_clock_in_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.mobile_clock_in_attempt FORCE ROW LEVEL SECURITY;

CREATE POLICY mobile_device_registration_rw ON ponto.mobile_device_registration
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.read', 'ponto.mobile.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.write']));

CREATE POLICY mobile_geolocation_consent_rw ON ponto.mobile_geolocation_consent
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.read', 'ponto.mobile.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.write']));

CREATE POLICY mobile_clock_in_attempt_rw ON ponto.mobile_clock_in_attempt
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.read', 'ponto.mobile.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.write']));

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('ponto.mobile.read', 'ponto', 'mobile', 'read', '/api/v1/ponto/mobile/**', 'Read mobile clock-in attempts, devices, and geofencing consent.'),
  ('ponto.mobile.write', 'ponto', 'mobile', 'write', '/api/v1/ponto/mobile/**', 'Register devices, consent, and mobile geofenced clock-in attempts.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;
