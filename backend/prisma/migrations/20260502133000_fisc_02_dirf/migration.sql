CREATE SCHEMA IF NOT EXISTS fiscal;
CREATE SCHEMA IF NOT EXISTS payment;

DO $$
BEGIN
  IF to_regtype('payment.dirf_beneficiary_kind') IS NULL THEN
    CREATE TYPE payment.dirf_beneficiary_kind AS ENUM ('CPF', 'CNPJ', 'EXTERIOR');
  END IF;
  IF to_regtype('fiscal.dirf_arquivo_kind') IS NULL THEN
    CREATE TYPE fiscal.dirf_arquivo_kind AS ENUM ('ORIGINAL', 'RETIFICADORA');
  END IF;
  IF to_regtype('fiscal.dirf_arquivo_status') IS NULL THEN
    CREATE TYPE fiscal.dirf_arquivo_status AS ENUM ('DRAFT', 'GENERATED', 'VALIDATED', 'TRANSMITTED');
  END IF;
END
$$;

CREATE TABLE payment.dirf_payment_source (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year_base integer NOT NULL,
  beneficiary_kind payment.dirf_beneficiary_kind NOT NULL,
  beneficiary_document text NOT NULL,
  beneficiary_name text NOT NULL,
  revenue_code text NOT NULL,
  month_year date NOT NULL,
  amount numeric(14,2) NOT NULL,
  irrf numeric(14,2) NOT NULL DEFAULT 0,
  deductions jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dirf_payment_source_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT dirf_payment_source_year_chk CHECK (year_base BETWEEN 2000 AND 2100),
  CONSTRAINT dirf_payment_source_month_chk CHECK (
    month_year = date_trunc('month', month_year)::date
    AND extract(year FROM month_year)::integer = year_base
  ),
  CONSTRAINT dirf_payment_source_amount_chk CHECK (amount >= 0 AND irrf >= 0),
  CONSTRAINT dirf_payment_source_document_chk CHECK (length(trim(beneficiary_document)) > 0),
  CONSTRAINT dirf_payment_source_name_chk CHECK (length(trim(beneficiary_name)) > 0),
  CONSTRAINT dirf_payment_source_revenue_code_chk CHECK (length(trim(revenue_code)) > 0),
  CONSTRAINT dirf_payment_source_deductions_chk CHECK (jsonb_typeof(deductions) = 'object')
);

CREATE INDEX dirf_payment_source_year_idx
  ON payment.dirf_payment_source (tenant_id, year_base, beneficiary_document, revenue_code);

CREATE TABLE fiscal.dirf_arquivo (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year_base integer NOT NULL,
  kind fiscal.dirf_arquivo_kind NOT NULL DEFAULT 'ORIGINAL',
  status fiscal.dirf_arquivo_status NOT NULL DEFAULT 'DRAFT',
  original_arquivo_id uuid,
  txt_ref text NOT NULL,
  txt_content text NOT NULL,
  txt_hash text NOT NULL,
  layout_version text NOT NULL,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dirf_arquivo_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT dirf_arquivo_original_fk FOREIGN KEY (tenant_id, original_arquivo_id)
    REFERENCES fiscal.dirf_arquivo(tenant_id, id),
  CONSTRAINT dirf_arquivo_year_chk CHECK (year_base BETWEEN 2000 AND 2100),
  CONSTRAINT dirf_arquivo_original_kind_chk CHECK (
    (kind = 'ORIGINAL' AND original_arquivo_id IS NULL)
    OR (kind = 'RETIFICADORA' AND original_arquivo_id IS NOT NULL)
  ),
  CONSTRAINT dirf_arquivo_txt_hash_chk CHECK (txt_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT dirf_arquivo_layout_version_chk CHECK (length(trim(layout_version)) > 0)
);

CREATE UNIQUE INDEX dirf_arquivo_original_uq
  ON fiscal.dirf_arquivo (tenant_id, year_base)
  WHERE kind = 'ORIGINAL';

CREATE INDEX dirf_arquivo_year_idx
  ON fiscal.dirf_arquivo (tenant_id, year_base, status);

CREATE TABLE fiscal.dirf_beneficiario (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dirf_arquivo_id uuid NOT NULL,
  cpf_cnpj text NOT NULL,
  kind payment.dirf_beneficiary_kind NOT NULL,
  name text NOT NULL,
  totals jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dirf_beneficiario_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT dirf_beneficiario_arquivo_fk FOREIGN KEY (tenant_id, dirf_arquivo_id)
    REFERENCES fiscal.dirf_arquivo(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT dirf_beneficiario_document_chk CHECK (length(trim(cpf_cnpj)) > 0),
  CONSTRAINT dirf_beneficiario_name_chk CHECK (length(trim(name)) > 0),
  CONSTRAINT dirf_beneficiario_totals_chk CHECK (jsonb_typeof(totals) = 'object')
);

CREATE UNIQUE INDEX dirf_beneficiario_document_uq
  ON fiscal.dirf_beneficiario (tenant_id, dirf_arquivo_id, cpf_cnpj);

CREATE TABLE fiscal.dirf_pagamento (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dirf_beneficiario_id uuid NOT NULL,
  code text NOT NULL,
  month_year date NOT NULL,
  amount numeric(14,2) NOT NULL,
  irrf numeric(14,2) NOT NULL DEFAULT 0,
  deductions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dirf_pagamento_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT dirf_pagamento_beneficiario_fk FOREIGN KEY (tenant_id, dirf_beneficiario_id)
    REFERENCES fiscal.dirf_beneficiario(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT dirf_pagamento_amount_chk CHECK (amount >= 0 AND irrf >= 0),
  CONSTRAINT dirf_pagamento_month_chk CHECK (month_year = date_trunc('month', month_year)::date),
  CONSTRAINT dirf_pagamento_deductions_chk CHECK (jsonb_typeof(deductions) = 'object')
);

CREATE INDEX dirf_pagamento_beneficiario_idx
  ON fiscal.dirf_pagamento (tenant_id, dirf_beneficiario_id, code, month_year);

CREATE OR REPLACE VIEW fiscal.v_dirf_summary
WITH (security_invoker = true) AS
SELECT
  arquivo.tenant_id,
  arquivo.id AS arquivo_id,
  arquivo.year_base,
  arquivo.kind,
  arquivo.status,
  arquivo.original_arquivo_id,
  arquivo.txt_ref,
  arquivo.txt_content,
  arquivo.txt_hash,
  arquivo.layout_version,
  arquivo.generated_at,
  count(DISTINCT beneficiario.id)::integer AS beneficiary_count,
  count(pagamento.id)::integer AS payment_count,
  COALESCE(sum(pagamento.amount), 0)::numeric(14,2) AS total_amount,
  COALESCE(sum(pagamento.irrf), 0)::numeric(14,2) AS total_irrf,
  arquivo.created_at,
  arquivo.updated_at
FROM fiscal.dirf_arquivo arquivo
LEFT JOIN fiscal.dirf_beneficiario beneficiario
  ON beneficiario.tenant_id = arquivo.tenant_id
 AND beneficiario.dirf_arquivo_id = arquivo.id
LEFT JOIN fiscal.dirf_pagamento pagamento
  ON pagamento.tenant_id = beneficiario.tenant_id
 AND pagamento.dirf_beneficiario_id = beneficiario.id
WHERE public.sgp_tenant_matches(arquivo.tenant_id)
  AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.read', 'fiscal.dirf.write'])
GROUP BY
  arquivo.tenant_id,
  arquivo.id,
  arquivo.year_base,
  arquivo.kind,
  arquivo.status,
  arquivo.original_arquivo_id,
  arquivo.txt_ref,
  arquivo.txt_content,
  arquivo.txt_hash,
  arquivo.layout_version,
  arquivo.generated_at,
  arquivo.created_at,
  arquivo.updated_at;

CREATE OR REPLACE FUNCTION fiscal.sgp_dirf_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS dirf_payment_source_touch_updated_at ON payment.dirf_payment_source;
CREATE TRIGGER dirf_payment_source_touch_updated_at
  BEFORE UPDATE ON payment.dirf_payment_source
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_touch_updated_at();

DROP TRIGGER IF EXISTS dirf_arquivo_touch_updated_at ON fiscal.dirf_arquivo;
CREATE TRIGGER dirf_arquivo_touch_updated_at
  BEFORE UPDATE ON fiscal.dirf_arquivo
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_touch_updated_at();

CREATE OR REPLACE FUNCTION fiscal.sgp_dirf_audit()
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
    after_json ->> 'dirf_arquivo_id',
    before_json ->> 'dirf_arquivo_id',
    after_json ->> 'dirf_beneficiario_id',
    before_json ->> 'dirf_beneficiario_id'
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

DROP TRIGGER IF EXISTS dirf_payment_source_audit ON payment.dirf_payment_source;
CREATE TRIGGER dirf_payment_source_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.dirf_payment_source
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

DROP TRIGGER IF EXISTS dirf_arquivo_audit ON fiscal.dirf_arquivo;
CREATE TRIGGER dirf_arquivo_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiscal.dirf_arquivo
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

DROP TRIGGER IF EXISTS dirf_beneficiario_audit ON fiscal.dirf_beneficiario;
CREATE TRIGGER dirf_beneficiario_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiscal.dirf_beneficiario
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

DROP TRIGGER IF EXISTS dirf_pagamento_audit ON fiscal.dirf_pagamento;
CREATE TRIGGER dirf_pagamento_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiscal.dirf_pagamento
  FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

ALTER TABLE payment.dirf_payment_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.dirf_payment_source FORCE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dirf_arquivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dirf_arquivo FORCE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dirf_beneficiario ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dirf_beneficiario FORCE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dirf_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.dirf_pagamento FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dirf_payment_source_select ON payment.dirf_payment_source;
CREATE POLICY dirf_payment_source_select ON payment.dirf_payment_source
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.read', 'fiscal.dirf.write'])
  );

DROP POLICY IF EXISTS dirf_payment_source_write ON payment.dirf_payment_source;
CREATE POLICY dirf_payment_source_write ON payment.dirf_payment_source
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'])
  );

DO $$
DECLARE
  target_table regclass;
  policy_prefix text;
BEGIN
  FOR target_table, policy_prefix IN
    VALUES
      ('fiscal.dirf_arquivo'::regclass, 'dirf_arquivo'),
      ('fiscal.dirf_beneficiario'::regclass, 'dirf_beneficiario'),
      ('fiscal.dirf_pagamento'::regclass, 'dirf_pagamento')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %s', policy_prefix, target_table);
    EXECUTE format(
      'CREATE POLICY %I_select ON %s FOR SELECT USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''fiscal.dirf.read'', ''fiscal.dirf.write'']))',
      policy_prefix,
      target_table
    );
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON %s', policy_prefix, target_table);
    EXECUTE format(
      'CREATE POLICY %I_write ON %s FOR ALL USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''fiscal.dirf.write''])) WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''fiscal.dirf.write'']))',
      policy_prefix,
      target_table
    );
  END LOOP;
END
$$;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  (
    'fiscal.dirf.read',
    'fiscal',
    'dirf',
    'read',
    '/api/v1/admin/fiscal/dirf/**',
    'Read DIRF files, beneficiaries, payments, layout version, and validation status.'
  ),
  (
    'fiscal.dirf.write',
    'fiscal',
    'dirf',
    'write',
    '#!/fiscal/dirf',
    'Generate annual DIRF original and retificadora files for third-party payments.'
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
    ('ADMIN', 'fiscal.dirf.read'),
    ('ADMIN', 'fiscal.dirf.write'),
    ('FOLHA_OPERADOR', 'fiscal.dirf.read'),
    ('FOLHA_OPERADOR', 'fiscal.dirf.write'),
    ('AUDITOR', 'fiscal.dirf.read')
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
    GRANT USAGE ON SCHEMA payment, fiscal TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.dirf_payment_source TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON fiscal.dirf_arquivo TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON fiscal.dirf_beneficiario TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON fiscal.dirf_pagamento TO sgp_app_role;
    GRANT SELECT ON fiscal.v_dirf_summary TO sgp_app_role;
  END IF;
END
$$;
