CREATE SCHEMA IF NOT EXISTS tce;

DO $$
BEGIN
  IF to_regtype('tce.state_sphere') IS NULL THEN
    CREATE TYPE tce.state_sphere AS ENUM ('STATE', 'FEDERAL_DISTRICT', 'MUNICIPAL');
  END IF;
  IF to_regtype('tce.layout_status') IS NULL THEN
    CREATE TYPE tce.layout_status AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED');
  END IF;
  IF to_regtype('tce.layout_field_data_type') IS NULL THEN
    CREATE TYPE tce.layout_field_data_type AS ENUM (
      'STRING',
      'INT',
      'DECIMAL',
      'DATE',
      'DATETIME',
      'BOOLEAN',
      'ENUM',
      'XML_NODE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'tce' AND pg_type.typname = 'semver'
  ) THEN
    CREATE DOMAIN tce.semver AS text
      CHECK (VALUE ~ '^[0-9]+[.][0-9]+[.][0-9]+([+-][0-9A-Za-z.-]+)?$');
  END IF;
END
$$;

CREATE TABLE tce.state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code char(2) NOT NULL UNIQUE,
  name text NOT NULL,
  sphere tce.state_sphere NOT NULL,
  parent_state_code char(2),
  organ_kind tce.organ_kind NOT NULL,
  organ_name text NOT NULL,
  organ_official_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT state_code_chk CHECK (code ~ '^[A-Z]{2}$'),
  CONSTRAINT state_parent_code_chk CHECK (
    parent_state_code IS NULL OR parent_state_code ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT state_parent_fk FOREIGN KEY (parent_state_code) REFERENCES tce.state(code),
  CONSTRAINT state_municipal_parent_chk CHECK (
    (sphere = 'MUNICIPAL' AND parent_state_code IS NOT NULL)
    OR (sphere <> 'MUNICIPAL' AND parent_state_code IS NULL)
  )
);

CREATE TABLE tce.layout_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL REFERENCES tce.state(id) ON DELETE RESTRICT,
  system_name text NOT NULL,
  version tce.semver NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  status tce.layout_status NOT NULL DEFAULT 'DRAFT',
  publication_url text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT layout_version_dates_chk CHECK (
    effective_to IS NULL OR effective_to >= effective_from
  ),
  CONSTRAINT layout_version_system_chk CHECK (length(trim(system_name)) > 0),
  CONSTRAINT layout_version_unique UNIQUE (state_id, system_name, version)
);

CREATE INDEX layout_version_state_system_idx
  ON tce.layout_version (state_id, system_name, status, effective_from);

CREATE TABLE tce.layout_field (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_version_id uuid NOT NULL REFERENCES tce.layout_version(id) ON DELETE CASCADE,
  field_path text NOT NULL,
  data_type tce.layout_field_data_type NOT NULL,
  required boolean NOT NULL DEFAULT false,
  max_length int,
  decimal_precision int,
  decimal_scale int,
  transform_rule text,
  source_hint text,
  ordering int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT layout_field_path_chk CHECK (length(trim(field_path)) > 0),
  CONSTRAINT layout_field_ordering_chk CHECK (ordering >= 0),
  CONSTRAINT layout_field_length_chk CHECK (max_length IS NULL OR max_length > 0),
  CONSTRAINT layout_field_decimal_chk CHECK (
    (
      data_type = 'DECIMAL'
      AND decimal_precision IS NOT NULL
      AND decimal_scale IS NOT NULL
      AND decimal_precision > 0
      AND decimal_scale >= 0
      AND decimal_scale <= decimal_precision
    )
    OR (
      data_type <> 'DECIMAL'
      AND decimal_precision IS NULL
      AND decimal_scale IS NULL
    )
  ),
  CONSTRAINT layout_field_unique UNIQUE (layout_version_id, field_path)
);

CREATE INDEX layout_field_version_order_idx
  ON tce.layout_field (layout_version_id, ordering, field_path);

CREATE OR REPLACE FUNCTION tce.sgp_tce_catalog_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION tce.sgp_tce_layout_version_no_active_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND EXISTS (
    SELECT 1
    FROM tce.layout_version existing
    WHERE existing.id <> NEW.id
      AND existing.state_id = NEW.state_id
      AND lower(existing.system_name) = lower(NEW.system_name)
      AND existing.status = 'ACTIVE'
      AND daterange(existing.effective_from, COALESCE(existing.effective_to, 'infinity'::date), '[]')
        && daterange(NEW.effective_from, COALESCE(NEW.effective_to, 'infinity'::date), '[]')
  ) THEN
    RAISE EXCEPTION 'active layout version effective period overlaps for state and system'
      USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS layout_version_no_active_overlap ON tce.layout_version;
CREATE TRIGGER layout_version_no_active_overlap
  BEFORE INSERT OR UPDATE ON tce.layout_version
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_layout_version_no_active_overlap();

CREATE OR REPLACE FUNCTION tce.sgp_tce_catalog_audit()
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
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');

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

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['state', 'layout_version', 'layout_field']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON tce.%I', table_name || '_touch_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON tce.%I FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_touch_updated_at()',
      table_name || '_touch_updated_at',
      table_name
    );
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON tce.%I', table_name || '_audit', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON tce.%I FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_audit()',
      table_name || '_audit',
      table_name
    );
    EXECUTE format('ALTER TABLE tce.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE tce.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON tce.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON tce.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR public.sgp_has_any_permission(ARRAY['tce.catalog.read', 'tce.catalog.manage'])
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON tce.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON tce.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR public.sgp_has_any_permission(ARRAY['tce.catalog.manage'])
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR public.sgp_has_any_permission(ARRAY['tce.catalog.manage'])
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

INSERT INTO tce.state (code, name, sphere, parent_state_code, organ_kind, organ_name, organ_official_url)
VALUES
  ('AC', 'Acre', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Acre', 'https://www.tceac.tc.br/'),
  ('AL', 'Alagoas', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Alagoas', 'https://www.tceal.tc.br/'),
  ('AP', 'Amapa', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Amapa', 'https://www.tce.ap.gov.br/'),
  ('AM', 'Amazonas', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Amazonas', 'https://www.tce.am.gov.br/'),
  ('BA', 'Bahia', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado da Bahia', 'https://www.tce.ba.gov.br/'),
  ('CE', 'Ceara', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Ceara', 'https://www.tce.ce.gov.br/'),
  ('DF', 'Distrito Federal', 'FEDERAL_DISTRICT', NULL, 'TCE', 'Tribunal de Contas do Distrito Federal', 'https://www.tc.df.gov.br/'),
  ('ES', 'Espirito Santo', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Espirito Santo', 'https://www.tcees.tc.br/'),
  ('GO', 'Goias', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Goias', 'https://portal.tce.go.gov.br/'),
  ('MA', 'Maranhao', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Maranhao', 'https://www.tcema.tc.br/'),
  ('MT', 'Mato Grosso', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Mato Grosso', 'https://www.tce.mt.gov.br/'),
  ('MS', 'Mato Grosso do Sul', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Mato Grosso do Sul', 'https://www.tce.ms.gov.br/'),
  ('MG', 'Minas Gerais', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Minas Gerais', 'https://www.tce.mg.gov.br/'),
  ('PA', 'Para', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Para', 'https://www.tcepa.tc.br/'),
  ('PB', 'Paraiba', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado da Paraiba', 'https://tce.pb.gov.br/'),
  ('PR', 'Parana', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Parana', 'https://www.tce.pr.gov.br/'),
  ('PE', 'Pernambuco', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Pernambuco', 'https://www.tce.pe.gov.br/'),
  ('PI', 'Piaui', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Piaui', 'https://www.tcepi.tc.br/'),
  ('RJ', 'Rio de Janeiro', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Rio de Janeiro', 'https://www.tcerj.tc.br/'),
  ('RN', 'Rio Grande do Norte', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Rio Grande do Norte', 'https://www.tce.rn.gov.br/'),
  ('RS', 'Rio Grande do Sul', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Rio Grande do Sul', 'https://tcers.tc.br/'),
  ('RO', 'Rondonia', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Rondonia', 'https://tcero.tc.br/'),
  ('RR', 'Roraima', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Roraima', 'https://www.tcerr.tc.br/'),
  ('SC', 'Santa Catarina', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Santa Catarina', 'https://www.tcesc.tc.br/'),
  ('SP', 'Sao Paulo', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Sao Paulo', 'https://www.tce.sp.gov.br/'),
  ('SE', 'Sergipe', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado de Sergipe', 'https://www.tce.se.gov.br/'),
  ('TO', 'Tocantins', 'STATE', NULL, 'TCE', 'Tribunal de Contas do Estado do Tocantins', 'https://www.tceto.tc.br/'),
  ('BR', 'Brasil', 'FEDERAL_DISTRICT', NULL, 'TCU', 'Tribunal de Contas da Uniao', 'https://portal.tcu.gov.br/'),
  ('RM', 'Rio de Janeiro - Municipio', 'MUNICIPAL', 'RJ', 'TCM', 'Tribunal de Contas do Municipio do Rio de Janeiro', 'https://www.tcmrio.tc.br/'),
  ('SM', 'Sao Paulo - Municipio', 'MUNICIPAL', 'SP', 'TCM', 'Tribunal de Contas do Municipio de Sao Paulo', 'https://portal.tcm.sp.gov.br/'),
  ('PM', 'Para - Municipios', 'MUNICIPAL', 'PA', 'TCM', 'Tribunal de Contas dos Municipios do Estado do Para', 'https://www.tcm.pa.gov.br/'),
  ('GM', 'Goias - Municipios', 'MUNICIPAL', 'GO', 'TCM', 'Tribunal de Contas dos Municipios do Estado de Goias', 'https://www.tcmgo.tc.br/')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    sphere = EXCLUDED.sphere,
    parent_state_code = EXCLUDED.parent_state_code,
    organ_kind = EXCLUDED.organ_kind,
    organ_name = EXCLUDED.organ_name,
    organ_official_url = EXCLUDED.organ_official_url;

INSERT INTO tce.layout_version (state_id, system_name, version, effective_from, effective_to, status, publication_url, notes)
SELECT state.id, seed.system_name, seed.version::tce.semver, seed.effective_from::date, NULL::date, 'DRAFT'::tce.layout_status, seed.publication_url, seed.notes
FROM (
  VALUES
    ('PR', 'SIM-AM', '0.0.1', '2026-01-01', 'https://www.tce.pr.gov.br/fiscalizado/portal-e-contas-parana/', 'Placeholder publico: Sistema de Informacoes Municipais - Acompanhamento Mensal. Campos nao embarcados.'),
    ('SP', 'AUDESP', '0.0.1', '2026-01-01', 'https://www.tce.sp.gov.br/audesp', 'Placeholder publico: Auditoria Eletronica de Orgaos Publicos. Campos nao embarcados.'),
    ('PB', 'SAGRES', '0.0.1', '2026-01-01', 'https://tce.pb.gov.br/sagres-cidadao/', 'Placeholder publico: SAGRES. Campos nao embarcados.'),
    ('CE', 'SIAP', '0.0.1', '2026-01-01', 'https://www.tce.ce.gov.br/', 'Placeholder publico: sistema estadual indicado para catalogacao inicial. Campos nao embarcados.')
) AS seed(code, system_name, version, effective_from, publication_url, notes)
JOIN tce.state state ON state.code = seed.code AND state.organ_kind = 'TCE'
ON CONFLICT (state_id, system_name, version) DO UPDATE
SET effective_from = EXCLUDED.effective_from,
    effective_to = EXCLUDED.effective_to,
    status = EXCLUDED.status,
    publication_url = EXCLUDED.publication_url,
    notes = EXCLUDED.notes;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('tce.catalog.read', 'tce', 'catalog', 'read', '/api/v1/tce/**', 'Read Court of Accounts state and layout catalog metadata.'),
  ('tce.catalog.manage', 'tce', 'catalog', 'manage', '#!/tce/catalog', 'Manage Court of Accounts layout versions and field metadata.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'tce.catalog.read'),
    ('ADMIN', 'tce.catalog.manage'),
    ('AUDITOR', 'tce.catalog.read')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile ON access_profile.code = profile_permissions.profile_code
JOIN public.permission ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA tce TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.state TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.layout_version TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.layout_field TO sgp_app_role;
  END IF;
END
$$;
