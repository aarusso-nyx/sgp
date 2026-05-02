-- ES-06 S-3000 exclusion/retraction requests.

ALTER TYPE public."ESocialEventStatus" ADD VALUE IF NOT EXISTS 'EXCLUIDO';
ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-3000';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_row
    JOIN pg_namespace namespace_row ON namespace_row.oid = type_row.typnamespace
    WHERE namespace_row.nspname = 'esocial'
      AND type_row.typname = 's3000_request_status'
  ) THEN
    CREATE TYPE esocial.s3000_request_status AS ENUM (
      'PENDING',
      'EMITTED',
      'ACCEPTED',
      'REJECTED',
      'BLOCKED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS esocial.s1299_emission_state (
  tenant_id uuid NOT NULL,
  competence text NOT NULL,
  status text NOT NULL,
  emitted_event_id uuid REFERENCES public.esocial_event(id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT s1299_emission_state_pkey PRIMARY KEY (tenant_id, competence),
  CONSTRAINT s1299_emission_state_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT s1299_emission_state_competence_chk CHECK (competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT s1299_emission_state_status_chk CHECK (status IN ('PENDING', 'EMITTED', 'ACCEPTED', 'REJECTED'))
);

CREATE TABLE IF NOT EXISTS esocial.s3000_request (
  tenant_id uuid NOT NULL,
  request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_event_id uuid NOT NULL,
  target_recibo text NOT NULL,
  target_event_kind text NOT NULL,
  requested_by_user_id uuid,
  justification text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status esocial.s3000_request_status NOT NULL DEFAULT 'PENDING',
  block_reason text,
  emitted_event_id uuid REFERENCES public.esocial_event(id),
  accepted_receipt text,
  accepted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT s3000_request_pkey PRIMARY KEY (tenant_id, request_id),
  CONSTRAINT s3000_request_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT s3000_request_target_event_fk FOREIGN KEY (target_event_id) REFERENCES public.esocial_event(id),
  CONSTRAINT s3000_request_justification_min_chk CHECK (char_length(btrim(justification)) >= 30),
  CONSTRAINT s3000_request_target_kind_chk CHECK (target_event_kind ~ '^S-[0-9]{4}$'),
  CONSTRAINT s3000_request_block_status_chk CHECK (
    (status = 'BLOCKED' AND block_reason IS NOT NULL)
    OR (status <> 'BLOCKED')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS s3000_request_target_open_key
  ON esocial.s3000_request (tenant_id, target_event_id)
  WHERE status IN ('PENDING', 'EMITTED', 'ACCEPTED');
CREATE INDEX IF NOT EXISTS s3000_request_status_idx
  ON esocial.s3000_request (tenant_id, status, requested_at DESC);

CREATE OR REPLACE FUNCTION esocial.sgp_s3000_is_periodic(p_event_kind text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_event_kind IN (
    'S-1200',
    'S-1202',
    'S-1207',
    'S-1210',
    'S-1280',
    'S-1300'
  )
$$;

CREATE OR REPLACE FUNCTION esocial.sgp_s3000_prepare_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_event public.esocial_event;
  v_block_reason text;
BEGIN
  SELECT * INTO v_event
  FROM public.esocial_event
  WHERE id = NEW.target_event_id
    AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'S-3000 target event not found for tenant' USING ERRCODE = '23503';
  END IF;

  IF v_event.receipt_number IS NULL AND NULLIF(btrim(v_event.reference), '') IS NULL THEN
    RAISE EXCEPTION 'S-3000 target event requires accepted receipt' USING ERRCODE = '23514';
  END IF;

  IF v_event.status <> 'PROCESSADO_COM_SUCESSO'::public."ESocialEventStatus" THEN
    RAISE EXCEPTION 'S-3000 target event must be accepted before exclusion' USING ERRCODE = '23514';
  END IF;

  NEW.target_event_kind := COALESCE(NULLIF(btrim(NEW.target_event_kind), ''), v_event.event_type);
  NEW.target_recibo := COALESCE(NULLIF(btrim(NEW.target_recibo), ''), v_event.receipt_number, v_event.reference);
  NEW.updated_at := now();

  IF esocial.sgp_s3000_is_periodic(NEW.target_event_kind) THEN
    SELECT 'periodic_competence_closed_by_s1299'
    INTO v_block_reason
    FROM esocial.s1299_emission_state state
    WHERE state.tenant_id = NEW.tenant_id
      AND state.competence = v_event.competence
      AND state.status = 'ACCEPTED'
    LIMIT 1;

    IF v_block_reason IS NOT NULL THEN
      NEW.status := 'BLOCKED';
      NEW.block_reason := v_block_reason;
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_s3000_prepare_request ON esocial.s3000_request;
CREATE TRIGGER trg_s3000_prepare_request
  BEFORE INSERT OR UPDATE OF target_event_id, target_recibo, target_event_kind, status
  ON esocial.s3000_request
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s3000_prepare_request();

CREATE OR REPLACE FUNCTION esocial.sgp_s3000_request_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row esocial.s3000_request;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.s3000_request',
    v_row.request_id::text,
    v_row.requested_by_user_id,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.s3000_request',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'targetEventId', v_row.target_event_id::text,
      'targetRecibo', v_row.target_recibo,
      'targetEventKind', v_row.target_event_kind,
      'status', v_row.status::text,
      'blockReason', v_row.block_reason,
      'requestedByUserId', v_row.requested_by_user_id,
      'justification', v_row.justification
    ),
    v_row.justification,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END
$$;

DROP TRIGGER IF EXISTS trg_s3000_request_audit ON esocial.s3000_request;
CREATE TRIGGER trg_s3000_request_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s3000_request
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s3000_request_audit();

ALTER TABLE esocial.s1299_emission_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s1299_emission_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS s1299_emission_state_select ON esocial.s1299_emission_state;
CREATE POLICY s1299_emission_state_select ON esocial.s1299_emission_state
  FOR SELECT USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
    )
  );
DROP POLICY IF EXISTS s1299_emission_state_write ON esocial.s1299_emission_state;
CREATE POLICY s1299_emission_state_write ON esocial.s1299_emission_state
  FOR ALL USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
    )
  );

ALTER TABLE esocial.s3000_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s3000_request FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS s3000_request_select ON esocial.s3000_request;
CREATE POLICY s3000_request_select ON esocial.s3000_request
  FOR SELECT USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.exclude'])
    )
  );
DROP POLICY IF EXISTS s3000_request_write ON esocial.s3000_request;
CREATE POLICY s3000_request_write ON esocial.s3000_request
  FOR ALL USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.exclude'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.exclude'])
    )
  );

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('esocial.event.exclude', 'esocial', 'event', 'exclude', '#!/esocial/**', 'Request, emit, and track S-3000 eSocial event exclusions.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'esocial.event.exclude'),
    ('FOLHA_OPERADOR', 'esocial.event.exclude')
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
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s1299_emission_state TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s3000_request TO sgp_app_role;
  END IF;
END
$$;
