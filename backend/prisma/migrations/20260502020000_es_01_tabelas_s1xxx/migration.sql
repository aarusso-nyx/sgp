CREATE SCHEMA IF NOT EXISTS esocial;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_row
    JOIN pg_namespace namespace_row ON namespace_row.oid = type_row.typnamespace
    WHERE namespace_row.nspname = 'esocial'
      AND type_row.typname = 's1xxx_event_kind'
  ) THEN
    CREATE TYPE esocial.s1xxx_event_kind AS ENUM (
      'S-1000',
      'S-1005',
      'S-1010',
      'S-1020',
      'S-1050',
      'S-1070'
    );
  END IF;
END
$$;

ALTER TABLE public.esocial_event
  ADD COLUMN IF NOT EXISTS event_kind esocial.s1xxx_event_kind,
  ADD COLUMN IF NOT EXISTS source_entity_kind text,
  ADD COLUMN IF NOT EXISTS source_entity_id text,
  ADD COLUMN IF NOT EXISTS xml_signed bytea,
  ADD COLUMN IF NOT EXISTS xml_hash char(64);

UPDATE public.esocial_event
SET event_kind = event_type::esocial.s1xxx_event_kind
WHERE event_kind IS NULL
  AND event_type IN ('S-1000', 'S-1005', 'S-1010', 'S-1020', 'S-1050', 'S-1070');

CREATE INDEX IF NOT EXISTS esocial_event_s1xxx_source_idx
  ON public.esocial_event (tenant_id, event_kind, source_entity_kind, source_entity_id);
CREATE INDEX IF NOT EXISTS esocial_event_xml_hash_idx
  ON public.esocial_event (tenant_id, xml_hash)
  WHERE xml_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS esocial.s1xxx_dispatch_state (
  tenant_id uuid NOT NULL,
  event_kind esocial.s1xxx_event_kind NOT NULL,
  source_entity_id text NOT NULL,
  last_emitted_at timestamptz,
  last_payload_hash char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT s1xxx_dispatch_state_pkey
    PRIMARY KEY (tenant_id, event_kind, source_entity_id),
  CONSTRAINT s1xxx_dispatch_state_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenant(id)
);

ALTER TABLE esocial.s1xxx_dispatch_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s1xxx_dispatch_state FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS s1xxx_dispatch_state_select ON esocial.s1xxx_dispatch_state;
CREATE POLICY s1xxx_dispatch_state_select ON esocial.s1xxx_dispatch_state
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
    )
  );

DROP POLICY IF EXISTS s1xxx_dispatch_state_write ON esocial.s1xxx_dispatch_state;
CREATE POLICY s1xxx_dispatch_state_write ON esocial.s1xxx_dispatch_state
  FOR ALL
  USING (
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

DROP POLICY IF EXISTS esocial_event_select ON public.esocial_event;
CREATE POLICY esocial_event_select ON public.esocial_event
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
    )
  );

DROP POLICY IF EXISTS esocial_event_write ON public.esocial_event;
CREATE POLICY esocial_event_write ON public.esocial_event
  FOR ALL
  USING (
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

CREATE OR REPLACE FUNCTION esocial.audit_s1xxx_dispatch_state_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after esocial.s1xxx_dispatch_state;
  row_before esocial.s1xxx_dispatch_state;
  audit_action text;
BEGIN
  row_after := NEW;
  row_before := OLD;
  audit_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;

  PERFORM set_config(
    'app.current_tenant_id',
    COALESCE(row_after.tenant_id, row_before.tenant_id)::text,
    true
  );

  PERFORM public.sgp_append_audit_event(
    audit_action,
    'esocial.s1xxx_dispatch_state',
    COALESCE(row_after.source_entity_id, row_before.source_entity_id),
    NULL::uuid,
    NULL::text,
    NULL::text,
    'esocial.s1xxx_dispatch_state',
    NULL::text,
    jsonb_build_object(
      'eventKind', COALESCE(row_after.event_kind, row_before.event_kind)::text,
      'lastPayloadHash', COALESCE(row_after.last_payload_hash, row_before.last_payload_hash)
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_s1xxx_dispatch_state_audit ON esocial.s1xxx_dispatch_state;
CREATE TRIGGER trg_s1xxx_dispatch_state_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s1xxx_dispatch_state
  FOR EACH ROW EXECUTE FUNCTION esocial.audit_s1xxx_dispatch_state_mutation();

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('esocial.event.read', 'esocial', 'event', 'read', '/api/v1/esocial/tabelas-iniciais/**', 'Read eSocial event queue and S-1xxx table dispatch status.'),
  ('esocial.event.write', 'esocial', 'event', 'write', '/api/v1/esocial/tabelas-iniciais/**', 'Emit eSocial XML events after XSD validation and XML-DSig signature.')
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'esocial.event.read'),
    ('ADMIN', 'esocial.event.write'),
    ('FOLHA_OPERADOR', 'esocial.event.read'),
    ('FOLHA_OPERADOR', 'esocial.event.write'),
    ('AUDITOR', 'esocial.event.read')
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
