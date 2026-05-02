DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'inscricao_status'
  ) THEN
    CREATE TYPE recrutamento.inscricao_status AS ENUM (
      'DRAFT',
      'PENDING_PAYMENT',
      'EXEMPT',
      'CONFIRMED',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'exemption_kind'
  ) THEN
    CREATE TYPE recrutamento.exemption_kind AS ENUM (
      'NONE',
      'CADUNICO',
      'BONE_MARROW_DONOR'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'payment_gateway_kind'
  ) THEN
    CREATE TYPE recrutamento.payment_gateway_kind AS ENUM ('BOLETO', 'PIX', 'OTHER');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'payment_charge_status'
  ) THEN
    CREATE TYPE recrutamento.payment_charge_status AS ENUM (
      'OPEN',
      'PAID',
      'EXPIRED',
      'CANCELLED'
    );
  END IF;
END
$$;

CREATE TABLE recrutamento.candidato (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cpf text NOT NULL,
  full_name text NOT NULL,
  birth_date date NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  lgpd_consent_at timestamptz NOT NULL,
  lgpd_consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidato_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT candidato_cpf_uq UNIQUE (tenant_id, cpf),
  CONSTRAINT candidato_cpf_digits_check CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE TABLE recrutamento.inscricao (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL,
  vaga_id uuid NOT NULL,
  candidato_id uuid NOT NULL,
  status recrutamento.inscricao_status NOT NULL DEFAULT 'DRAFT',
  exemption_kind recrutamento.exemption_kind NOT NULL DEFAULT 'NONE',
  exemption_evidence_ref text,
  payment_charge_id text,
  access_token_hash text NOT NULL,
  quota_self_declaration jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inscricao_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT inscricao_concurso_fk FOREIGN KEY (tenant_id, concurso_id)
    REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT inscricao_vaga_fk FOREIGN KEY (tenant_id, concurso_id, vaga_id)
    REFERENCES recrutamento.vaga(tenant_id, concurso_id, position_id) ON DELETE RESTRICT,
  CONSTRAINT inscricao_candidato_fk FOREIGN KEY (tenant_id, candidato_id)
    REFERENCES recrutamento.candidato(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT inscricao_candidate_vaga_uq UNIQUE (tenant_id, concurso_id, vaga_id, candidato_id)
);

CREATE TABLE recrutamento.payment_charge (
  tenant_id uuid NOT NULL,
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  inscricao_id uuid NOT NULL,
  gateway recrutamento.payment_gateway_kind NOT NULL,
  amount numeric(14, 2) NOT NULL,
  external_id text NOT NULL,
  status recrutamento.payment_charge_status NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_charge_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT payment_charge_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id)
    REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT payment_charge_amount_nonnegative_check CHECK (amount >= 0)
);

ALTER TABLE recrutamento.inscricao
  ADD CONSTRAINT inscricao_payment_charge_fk FOREIGN KEY (tenant_id, payment_charge_id)
    REFERENCES recrutamento.payment_charge(tenant_id, id) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX candidato_lookup_idx ON recrutamento.candidato (tenant_id, cpf);
CREATE INDEX inscricao_public_lookup_idx ON recrutamento.inscricao (id, access_token_hash);
CREATE INDEX inscricao_status_idx ON recrutamento.inscricao (tenant_id, concurso_id, status);
CREATE INDEX payment_charge_status_idx ON recrutamento.payment_charge (tenant_id, status);

CREATE OR REPLACE FUNCTION recrutamento.sgp_inscricao_audit()
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

DROP TRIGGER IF EXISTS candidato_audit ON recrutamento.candidato;
CREATE TRIGGER candidato_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.candidato
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_inscricao_audit();

DROP TRIGGER IF EXISTS inscricao_audit ON recrutamento.inscricao;
CREATE TRIGGER inscricao_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.inscricao
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_inscricao_audit();

DROP TRIGGER IF EXISTS payment_charge_audit ON recrutamento.payment_charge;
CREATE TRIGGER payment_charge_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.payment_charge
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_inscricao_audit();

ALTER TABLE recrutamento.candidato ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.candidato FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.inscricao ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.inscricao FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.payment_charge ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.payment_charge FORCE ROW LEVEL SECURITY;

CREATE POLICY candidato_select ON recrutamento.candidato FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read', 'recrutamento.write'])));
CREATE POLICY candidato_write ON recrutamento.candidato FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'])));

CREATE POLICY inscricao_select ON recrutamento.inscricao FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read', 'recrutamento.write'])));
CREATE POLICY inscricao_write ON recrutamento.inscricao FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'])));

CREATE POLICY payment_charge_select ON recrutamento.payment_charge FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read', 'recrutamento.write'])));
CREATE POLICY payment_charge_write ON recrutamento.payment_charge FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'])));
