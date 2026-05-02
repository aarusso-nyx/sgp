CREATE SCHEMA IF NOT EXISTS fiscal;

DO $$
BEGIN
  IF to_regtype('fiscal.gps_payment_code_scope') IS NULL THEN
    CREATE TYPE fiscal.gps_payment_code_scope AS ENUM ('EMPLOYER', 'EMPLOYEE', 'BOTH');
  END IF;
  IF to_regtype('fiscal.gps_remittance_reason') IS NULL THEN
    CREATE TYPE fiscal.gps_remittance_reason AS ENUM ('TRANSITION', 'RETROACTIVE', 'MALHA_FINA');
  END IF;
  IF to_regtype('fiscal.gps_remittance_status') IS NULL THEN
    CREATE TYPE fiscal.gps_remittance_status AS ENUM ('DRAFT', 'GENERATED', 'PAID', 'CANCELLED');
  END IF;
END
$$;

CREATE TABLE fiscal.gps_payment_code (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text NOT NULL,
  applies_to fiscal.gps_payment_code_scope NOT NULL,
  active boolean NOT NULL DEFAULT true,
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gps_payment_code_pkey PRIMARY KEY (id),
  CONSTRAINT gps_payment_code_code_uq UNIQUE (code),
  CONSTRAINT gps_payment_code_code_chk CHECK (code ~ '^[0-9]{4}$'),
  CONSTRAINT gps_payment_code_validity_chk CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE fiscal.gps_remittance (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  competence date NOT NULL,
  payment_code_id uuid NOT NULL REFERENCES fiscal.gps_payment_code(id),
  reason fiscal.gps_remittance_reason NOT NULL,
  reason_detail text NOT NULL,
  base_amount numeric(14,2) NOT NULL,
  amount numeric(14,2) NOT NULL,
  interest_amount numeric(14,2) NOT NULL DEFAULT 0,
  fine_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL,
  status fiscal.gps_remittance_status NOT NULL DEFAULT 'DRAFT',
  file_uri text,
  txt_content text NOT NULL,
  txt_hash text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gps_remittance_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT gps_remittance_month_chk CHECK (competence = date_trunc('month', competence)::date),
  CONSTRAINT gps_remittance_money_chk CHECK (
    base_amount >= 0
    AND amount >= 0
    AND interest_amount >= 0
    AND fine_amount >= 0
    AND total_amount = (amount + interest_amount + fine_amount)::numeric(14,2)
  ),
  CONSTRAINT gps_remittance_txt_hash_chk CHECK (txt_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT gps_remittance_paid_status_chk CHECK (
    (status = 'PAID' AND paid_at IS NOT NULL)
    OR (status <> 'PAID' AND paid_at IS NULL)
  )
);

CREATE UNIQUE INDEX gps_remittance_competence_code_uq
  ON fiscal.gps_remittance (tenant_id, competence, payment_code_id);

CREATE INDEX gps_remittance_reason_status_idx
  ON fiscal.gps_remittance (tenant_id, reason, status, competence DESC);

CREATE OR REPLACE VIEW fiscal.v_gps_remittance_summary
WITH (security_invoker = true) AS
SELECT
  remittance.tenant_id,
  remittance.id,
  remittance.competence,
  remittance.payment_code_id,
  code.code AS payment_code,
  code.description AS payment_code_description,
  remittance.reason,
  remittance.reason_detail,
  remittance.base_amount,
  remittance.amount,
  remittance.interest_amount,
  remittance.fine_amount,
  remittance.total_amount,
  remittance.status,
  remittance.file_uri,
  remittance.txt_hash,
  remittance.generated_at,
  remittance.paid_at,
  remittance.created_at,
  remittance.updated_at
FROM fiscal.gps_remittance remittance
JOIN fiscal.gps_payment_code code ON code.id = remittance.payment_code_id
WHERE public.sgp_tenant_matches(remittance.tenant_id)
  AND public.sgp_has_any_permission(ARRAY['fiscal.gps.read', 'fiscal.gps.write']);

CREATE OR REPLACE FUNCTION fiscal.assert_no_dctfweb_for_competence(
  p_tenant_id uuid,
  p_competence date
)
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM fiscal.dctfweb_declaration declaration
    WHERE declaration.tenant_id = p_tenant_id
      AND declaration.competence = date_trunc('month', p_competence)::date
      AND declaration.status IN ('TRANSMITTED'::fiscal.dctfweb_declaration_status, 'ACCEPTED'::fiscal.dctfweb_declaration_status)
  ) THEN
    RAISE EXCEPTION 'GPS residual duplicates transmitted or accepted DCTFWeb for competence %', p_competence
      USING ERRCODE = 'P0001', HINT = 'GPSDuplicatesDCTFWebError';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION fiscal.sgp_gps_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS gps_payment_code_touch_updated_at ON fiscal.gps_payment_code;
CREATE TRIGGER gps_payment_code_touch_updated_at
  BEFORE UPDATE ON fiscal.gps_payment_code
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_touch_updated_at();

DROP TRIGGER IF EXISTS gps_remittance_touch_updated_at ON fiscal.gps_remittance;
CREATE TRIGGER gps_remittance_touch_updated_at
  BEFORE UPDATE ON fiscal.gps_remittance
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_touch_updated_at();

CREATE OR REPLACE FUNCTION fiscal.sgp_gps_audit()
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
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
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

DROP TRIGGER IF EXISTS gps_remittance_audit ON fiscal.gps_remittance;
CREATE TRIGGER gps_remittance_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiscal.gps_remittance
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_audit();

ALTER TABLE fiscal.gps_remittance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.gps_remittance FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gps_remittance_select ON fiscal.gps_remittance;
CREATE POLICY gps_remittance_select ON fiscal.gps_remittance
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.gps.read', 'fiscal.gps.write'])
  );

DROP POLICY IF EXISTS gps_remittance_write ON fiscal.gps_remittance;
CREATE POLICY gps_remittance_write ON fiscal.gps_remittance
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.gps.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.gps.write'])
  );

INSERT INTO fiscal.gps_payment_code (code, description, applies_to, active, valid_from, valid_to)
VALUES
  ('2100', 'Empresas em geral - CNPJ - recolhimento RGPS residual', 'BOTH', true, DATE '1999-01-01', NULL),
  ('2402', 'Orgaos do poder publico - CNPJ - recolhimento RGPS residual', 'BOTH', true, DATE '1999-01-01', NULL),
  ('2003', 'Empresas optantes pelo Simples - CNPJ - recolhimento residual', 'EMPLOYER', true, DATE '1999-01-01', NULL),
  ('2909', 'Reclamatoria trabalhista - CNPJ - recolhimento previdenciario', 'BOTH', true, DATE '1999-01-01', NULL)
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description,
    applies_to = EXCLUDED.applies_to,
    active = EXCLUDED.active,
    valid_from = EXCLUDED.valid_from,
    valid_to = EXCLUDED.valid_to,
    updated_at = now();

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  (
    'fiscal.gps.read',
    'fiscal',
    'gps',
    'read',
    '/api/v1/admin/fiscal/gps/**',
    'Read residual GPS remittances and RFB payment code catalog.'
  ),
  (
    'fiscal.gps.write',
    'fiscal',
    'gps',
    'write',
    '#!/fiscal/gps-residual',
    'Generate residual GPS remittances only when DCTFWeb does not cover the competence.'
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
    ('ADMIN', 'fiscal.gps.read'),
    ('ADMIN', 'fiscal.gps.write'),
    ('FOLHA_OPERADOR', 'fiscal.gps.read'),
    ('FOLHA_OPERADOR', 'fiscal.gps.write'),
    ('AUDITOR', 'fiscal.gps.read')
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
    GRANT USAGE ON SCHEMA fiscal TO sgp_app_role;
    GRANT SELECT ON fiscal.gps_payment_code TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON fiscal.gps_remittance TO sgp_app_role;
    GRANT SELECT ON fiscal.v_gps_remittance_summary TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION fiscal.assert_no_dctfweb_for_competence(uuid, date) TO sgp_app_role;
  END IF;
END
$$;
