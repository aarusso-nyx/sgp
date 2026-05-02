DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'banca_membro_role'
  ) THEN
    CREATE TYPE recrutamento.banca_membro_role AS ENUM ('PRESIDENTE', 'MEMBRO', 'SECRETARIO');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'banca_cert_kind'
  ) THEN
    CREATE TYPE recrutamento.banca_cert_kind AS ENUM ('ICP_A1', 'ICP_A3', 'GOVBR_OURO', 'GOVBR_PRATA');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'signed_document_kind'
  ) THEN
    CREATE TYPE recrutamento.signed_document_kind AS ENUM ('GABARITO', 'ATA_BANCA', 'LISTA_APROVADOS', 'OUTRO');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'signed_document_format'
  ) THEN
    CREATE TYPE recrutamento.signed_document_format AS ENUM ('XADES', 'PADES');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'signed_document_status'
  ) THEN
    CREATE TYPE recrutamento.signed_document_status AS ENUM ('DRAFT', 'PARTIALLY_SIGNED', 'SIGNED', 'PUBLISHED');
  END IF;
END
$$;

CREATE TABLE recrutamento.banca_membro (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL,
  full_name text NOT NULL,
  cpf text NOT NULL,
  role recrutamento.banca_membro_role NOT NULL,
  cert_kind recrutamento.banca_cert_kind NOT NULL,
  cert_subject_dn text,
  cert_serial text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banca_membro_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT banca_membro_concurso_fk FOREIGN KEY (tenant_id, concurso_id)
    REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT banca_membro_cpf_digits_check CHECK (cpf ~ '^[0-9]{11}$'),
  CONSTRAINT banca_membro_cpf_uq UNIQUE (tenant_id, concurso_id, cpf)
);

CREATE TABLE recrutamento.signed_document (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL,
  kind recrutamento.signed_document_kind NOT NULL,
  source_ref text NOT NULL,
  content_hash text NOT NULL,
  format recrutamento.signed_document_format NOT NULL,
  signed_payload bytea NOT NULL,
  status recrutamento.signed_document_status NOT NULL DEFAULT 'DRAFT',
  published_at timestamptz,
  public_verify_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signed_document_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT signed_document_concurso_fk FOREIGN KEY (tenant_id, concurso_id)
    REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT signed_document_hash_check CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT signed_document_token_uq UNIQUE (public_verify_token),
  CONSTRAINT signed_document_published_check CHECK (
    (status = 'PUBLISHED' AND published_at IS NOT NULL)
    OR (status <> 'PUBLISHED' AND published_at IS NULL)
  )
);

CREATE TABLE recrutamento.document_signature (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  banca_membro_id uuid NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signature_value bytea NOT NULL,
  cert_chain bytea NOT NULL,
  ts_token bytea,
  signature_order integer NOT NULL,
  CONSTRAINT document_signature_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT document_signature_document_fk FOREIGN KEY (tenant_id, document_id)
    REFERENCES recrutamento.signed_document(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT document_signature_membro_fk FOREIGN KEY (tenant_id, banca_membro_id)
    REFERENCES recrutamento.banca_membro(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT document_signature_order_positive CHECK (signature_order > 0),
  CONSTRAINT document_signature_order_uq UNIQUE (tenant_id, document_id, signature_order),
  CONSTRAINT document_signature_membro_uq UNIQUE (tenant_id, document_id, banca_membro_id)
);

CREATE INDEX banca_membro_concurso_idx ON recrutamento.banca_membro (tenant_id, concurso_id, active);
CREATE INDEX signed_document_concurso_idx ON recrutamento.signed_document (tenant_id, concurso_id, status, kind);
CREATE INDEX document_signature_document_idx ON recrutamento.document_signature (tenant_id, document_id, signature_order);

CREATE OR REPLACE FUNCTION recrutamento.sgp_banca_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json)
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DO $$
DECLARE
  rel regclass;
  trigger_name text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'recrutamento.banca_membro'::regclass,
    'recrutamento.signed_document'::regclass,
    'recrutamento.document_signature'::regclass
  ]
  LOOP
    trigger_name := replace(rel::text, '.', '_') || '_audit';
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_name, rel);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_banca_audit()',
      trigger_name,
      rel
    );
  END LOOP;
END
$$;

ALTER TABLE recrutamento.banca_membro ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.banca_membro FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.signed_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.signed_document FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.document_signature ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.document_signature FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  rel regclass;
  table_name text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'recrutamento.banca_membro'::regclass,
    'recrutamento.signed_document'::regclass,
    'recrutamento.document_signature'::regclass
  ]
  LOOP
    table_name := split_part(rel::text, '.', 2);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', table_name || '_select', rel);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', table_name || '_write', rel);
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.banca.read'', ''recrutamento.banca.write''])))',
      table_name || '_select',
      rel
    );
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.banca.write'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.banca.write''])))',
      table_name || '_write',
      rel
    );
  END LOOP;
END
$$;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('recrutamento.banca.read', 'recrutamento', 'banca', 'read', '/api/v1/recrutamento/banca/**', 'Read examination board members, signed documents, and signature state.'),
  ('recrutamento.banca.write', 'recrutamento', 'banca', 'write', '/api/v1/recrutamento/banca/**', 'Maintain examination board members and execute sequential official document signatures.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;
