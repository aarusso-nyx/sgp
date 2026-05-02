CREATE SCHEMA IF NOT EXISTS fiscal;

DO $$
BEGIN
  IF to_regtype('fiscal.dctfweb_declaration_kind') IS NULL THEN
    CREATE TYPE fiscal.dctfweb_declaration_kind AS ENUM ('ORIGINAL', 'RETIFICADORA');
  END IF;
  IF to_regtype('fiscal.dctfweb_declaration_status') IS NULL THEN
    CREATE TYPE fiscal.dctfweb_declaration_status AS ENUM (
      'DRAFT',
      'SIGNED',
      'TRANSMITTED',
      'ACCEPTED',
      'REJECTED'
    );
  END IF;
  IF to_regtype('fiscal.dctfweb_source_event') IS NULL THEN
    CREATE TYPE fiscal.dctfweb_source_event AS ENUM ('S5011', 'S5012', 'S5013');
  END IF;
END
$$;

CREATE TABLE fiscal.dctfweb_declaration (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  competence date NOT NULL,
  kind fiscal.dctfweb_declaration_kind NOT NULL DEFAULT 'ORIGINAL',
  status fiscal.dctfweb_declaration_status NOT NULL DEFAULT 'DRAFT',
  original_declaration_id uuid,
  payload_xml_ref text NOT NULL,
  payload_xml text NOT NULL,
  payload_xml_hash text NOT NULL,
  signed_xml_ref text,
  signed_xml text,
  signed_xml_hash text,
  transmitted_xml_hash text,
  receipt_number text,
  receipt_at timestamptz,
  receipt_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dctfweb_declaration_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT dctfweb_declaration_original_fk FOREIGN KEY (tenant_id, original_declaration_id)
    REFERENCES fiscal.dctfweb_declaration(tenant_id, id),
  CONSTRAINT dctfweb_declaration_original_kind_chk CHECK (
    (kind = 'ORIGINAL' AND original_declaration_id IS NULL)
    OR (kind = 'RETIFICADORA' AND original_declaration_id IS NOT NULL)
  ),
  CONSTRAINT dctfweb_declaration_payload_hash_chk CHECK (payload_xml_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT dctfweb_declaration_signed_hash_chk CHECK (
    signed_xml_hash IS NULL OR signed_xml_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT dctfweb_declaration_transmitted_hash_chk CHECK (
    transmitted_xml_hash IS NULL OR transmitted_xml_hash ~ '^[0-9a-f]{64}$'
  )
);

CREATE UNIQUE INDEX dctfweb_declaration_original_uq
  ON fiscal.dctfweb_declaration (tenant_id, competence)
  WHERE kind = 'ORIGINAL';

CREATE INDEX dctfweb_declaration_competence_idx
  ON fiscal.dctfweb_declaration (tenant_id, competence, status);

CREATE TABLE fiscal.dctfweb_item (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL,
  source_event fiscal.dctfweb_source_event NOT NULL,
  source_run_id uuid NOT NULL,
  debit_code text NOT NULL,
  base_amount numeric(14,2) NOT NULL,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dctfweb_item_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT dctfweb_item_declaration_fk FOREIGN KEY (tenant_id, declaracao_id)
    REFERENCES fiscal.dctfweb_declaration(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT dctfweb_item_amount_chk CHECK (base_amount >= 0 AND amount >= 0),
  CONSTRAINT dctfweb_item_source_uq UNIQUE (
    tenant_id,
    declaracao_id,
    source_event,
    source_run_id,
    debit_code
  )
);

CREATE INDEX dctfweb_item_declaration_idx
  ON fiscal.dctfweb_item (tenant_id, declaracao_id, source_event);

CREATE OR REPLACE VIEW fiscal.v_dctfweb_summary
WITH (security_invoker = true) AS
SELECT
  declaration.tenant_id,
  declaration.id AS declaration_id,
  declaration.competence,
  declaration.kind,
  declaration.status,
  declaration.original_declaration_id,
  declaration.payload_xml_ref,
  declaration.payload_xml,
  declaration.payload_xml_hash,
  declaration.signed_xml_ref,
  declaration.signed_xml,
  declaration.signed_xml_hash,
  declaration.transmitted_xml_hash,
  declaration.receipt_number,
  declaration.receipt_at,
  count(item.id)::integer AS item_count,
  COALESCE(sum(item.base_amount), 0)::numeric(14,2) AS total_base_amount,
  COALESCE(sum(item.amount), 0)::numeric(14,2) AS total_amount,
  declaration.created_at,
  declaration.updated_at
FROM fiscal.dctfweb_declaration declaration
LEFT JOIN fiscal.dctfweb_item item
  ON item.tenant_id = declaration.tenant_id
 AND item.declaracao_id = declaration.id
WHERE public.sgp_tenant_matches(declaration.tenant_id)
  AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read', 'fiscal.dctfweb.write'])
GROUP BY
  declaration.tenant_id,
  declaration.id,
  declaration.competence,
  declaration.kind,
  declaration.status,
  declaration.original_declaration_id,
  declaration.payload_xml_ref,
  declaration.payload_xml,
  declaration.payload_xml_hash,
  declaration.signed_xml_ref,
  declaration.signed_xml,
  declaration.signed_xml_hash,
  declaration.transmitted_xml_hash,
  declaration.receipt_number,
  declaration.receipt_at,
  declaration.created_at,
  declaration.updated_at;

CREATE OR REPLACE FUNCTION fiscal.sgp_dctfweb_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS dctfweb_declaration_touch_updated_at ON fiscal.dctfweb_declaration;
CREATE TRIGGER dctfweb_declaration_touch_updated_at
  BEFORE UPDATE ON fiscal.dctfweb_declaration
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_touch_updated_at();

CREATE OR REPLACE FUNCTION fiscal.sgp_dctfweb_audit()
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
  tenant_value uuid;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(
    after_json ->> 'id',
    before_json ->> 'id',
    after_json ->> 'declaracao_id',
    before_json ->> 'declaracao_id'
  );
  tenant_value := COALESCE(row_after.tenant_id, row_before.tenant_id);

  PERFORM set_config('app.current_tenant_id', tenant_value::text, true);
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

DROP TRIGGER IF EXISTS dctfweb_declaration_audit ON fiscal.dctfweb_declaration;
CREATE TRIGGER dctfweb_declaration_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiscal.dctfweb_declaration
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

DROP TRIGGER IF EXISTS dctfweb_item_audit ON fiscal.dctfweb_item;
CREATE TRIGGER dctfweb_item_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiscal.dctfweb_item
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

ALTER TABLE fiscal.dctfweb_declaration ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dctfweb_declaration FORCE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dctfweb_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dctfweb_item FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dctfweb_declaration_select ON fiscal.dctfweb_declaration;
CREATE POLICY dctfweb_declaration_select ON fiscal.dctfweb_declaration
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read', 'fiscal.dctfweb.write'])
  );

DROP POLICY IF EXISTS dctfweb_declaration_write ON fiscal.dctfweb_declaration;
CREATE POLICY dctfweb_declaration_write ON fiscal.dctfweb_declaration
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'])
  );

DROP POLICY IF EXISTS dctfweb_item_select ON fiscal.dctfweb_item;
CREATE POLICY dctfweb_item_select ON fiscal.dctfweb_item
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read', 'fiscal.dctfweb.write'])
  );

DROP POLICY IF EXISTS dctfweb_item_write ON fiscal.dctfweb_item;
CREATE POLICY dctfweb_item_write ON fiscal.dctfweb_item
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'])
  );

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  (
    'fiscal.dctfweb.read',
    'fiscal',
    'dctfweb',
    'read',
    '/api/v1/admin/fiscal/dctfweb/**',
    'Read DCTFWeb declarations, items, transmission status, and receipts.'
  ),
  (
    'fiscal.dctfweb.write',
    'fiscal',
    'dctfweb',
    'write',
    '#!/fiscal/dctfweb',
    'Generate, sign, transmit, and reconcile DCTFWeb declarations.'
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
    ('ADMIN', 'fiscal.dctfweb.read'),
    ('ADMIN', 'fiscal.dctfweb.write'),
    ('FOLHA_OPERADOR', 'fiscal.dctfweb.read'),
    ('FOLHA_OPERADOR', 'fiscal.dctfweb.write'),
    ('AUDITOR', 'fiscal.dctfweb.read')
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
