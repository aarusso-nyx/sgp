DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'nomeacao_status'
  ) THEN
    CREATE TYPE recrutamento.nomeacao_status AS ENUM (
      'NOMEADO',
      'CONVOCADO',
      'POSSE_EM_ANDAMENTO',
      'POSSE',
      'EXERCICIO',
      'DESISTENTE',
      'EXONERADO_POR_NAO_POSSE'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'convocacao_channel'
  ) THEN
    CREATE TYPE recrutamento.convocacao_channel AS ENUM (
      'PUBLICACAO_OFICIAL',
      'EMAIL',
      'POSTAL'
    );
  END IF;
END
$$;

CREATE TABLE recrutamento.nomeacao (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL,
  vaga_id uuid NOT NULL,
  inscricao_id uuid NOT NULL,
  ato_administrativo text NOT NULL,
  published_at timestamptz NOT NULL,
  comparecimento_until date NOT NULL,
  status recrutamento.nomeacao_status NOT NULL DEFAULT 'NOMEADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nomeacao_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT nomeacao_concurso_fk FOREIGN KEY (tenant_id, concurso_id)
    REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT nomeacao_vaga_fk FOREIGN KEY (tenant_id, concurso_id, vaga_id)
    REFERENCES recrutamento.vaga(tenant_id, concurso_id, position_id) ON DELETE RESTRICT,
  CONSTRAINT nomeacao_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id)
    REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT nomeacao_inscricao_uq UNIQUE (tenant_id, inscricao_id),
  CONSTRAINT nomeacao_comparecimento_until_check CHECK (comparecimento_until >= published_at::date)
);

CREATE TABLE recrutamento.convocacao (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nomeacao_id uuid NOT NULL,
  channel recrutamento.convocacao_channel NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  evidence_ref text NOT NULL,
  CONSTRAINT convocacao_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT convocacao_nomeacao_fk FOREIGN KEY (tenant_id, nomeacao_id)
    REFERENCES recrutamento.nomeacao(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT convocacao_evidence_ref_check CHECK (length(trim(evidence_ref)) > 0)
);

CREATE INDEX nomeacao_concurso_vaga_status_idx
  ON recrutamento.nomeacao (tenant_id, concurso_id, vaga_id, status);
CREATE INDEX nomeacao_expiration_idx
  ON recrutamento.nomeacao (tenant_id, comparecimento_until, status)
  WHERE status IN ('NOMEADO', 'CONVOCADO');
CREATE INDEX convocacao_nomeacao_idx
  ON recrutamento.convocacao (tenant_id, nomeacao_id, sent_at DESC);

CREATE OR REPLACE FUNCTION recrutamento.sgp_nomeacao_audit()
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
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id', after_json ->> 'nomeacao_id', before_json ->> 'nomeacao_id');
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

CREATE OR REPLACE FUNCTION recrutamento.touch_nomeacao_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION recrutamento.proxima_chamada(p_concurso_id uuid, p_vaga_id uuid)
RETURNS TABLE(
  tenant_id uuid,
  concurso_id uuid,
  vaga_id uuid,
  inscricao_id uuid,
  call_order integer,
  allocation_bucket text,
  rank_general integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    item.tenant_id,
    snapshot.concurso_id,
    item.vaga_id,
    item.inscricao_id,
    item.call_order,
    item.allocation_bucket,
    item.rank_general
  FROM recrutamento.classificacao_snapshot snapshot
  JOIN recrutamento.classificacao_item item
    ON item.tenant_id = snapshot.tenant_id
   AND item.snapshot_id = snapshot.id
  WHERE snapshot.concurso_id = p_concurso_id
    AND snapshot.status = 'PUBLISHED'::recrutamento.classificacao_snapshot_status
    AND item.vaga_id = p_vaga_id
    AND item.eliminated_reason IS NULL
    AND item.call_order IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM recrutamento.nomeacao n
      WHERE n.tenant_id = item.tenant_id
        AND n.inscricao_id = item.inscricao_id
    )
  ORDER BY snapshot.generated_at DESC, item.call_order ASC, item.rank_general ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION recrutamento.expirar_prazo_nomeacao(p_nomeacao_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  changed_id uuid;
BEGIN
  UPDATE recrutamento.nomeacao n
  SET status = 'EXONERADO_POR_NAO_POSSE'::recrutamento.nomeacao_status
  WHERE n.id = p_nomeacao_id
    AND n.status IN ('NOMEADO', 'CONVOCADO')
    AND n.comparecimento_until < CURRENT_DATE
  RETURNING n.id INTO changed_id;

  RETURN changed_id IS NOT NULL;
END
$$;

DROP TRIGGER IF EXISTS nomeacao_touch_updated_at ON recrutamento.nomeacao;
CREATE TRIGGER nomeacao_touch_updated_at BEFORE UPDATE ON recrutamento.nomeacao
  FOR EACH ROW EXECUTE FUNCTION recrutamento.touch_nomeacao_updated_at();

DROP TRIGGER IF EXISTS nomeacao_audit ON recrutamento.nomeacao;
CREATE TRIGGER nomeacao_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.nomeacao
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_nomeacao_audit();

DROP TRIGGER IF EXISTS convocacao_audit ON recrutamento.convocacao;
CREATE TRIGGER convocacao_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.convocacao
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_nomeacao_audit();

ALTER TABLE recrutamento.nomeacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.nomeacao FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.convocacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.convocacao FORCE ROW LEVEL SECURITY;

CREATE POLICY nomeacao_select ON recrutamento.nomeacao FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.read', 'recrutamento.nomeacao.write', 'recrutamento.read', 'recrutamento.write', 'recrutamento:read', 'recrutamento:write'])));
CREATE POLICY nomeacao_write ON recrutamento.nomeacao FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.write', 'recrutamento.write', 'recrutamento:write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.write', 'recrutamento.write', 'recrutamento:write'])));

CREATE POLICY convocacao_select ON recrutamento.convocacao FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.read', 'recrutamento.nomeacao.write', 'recrutamento.read', 'recrutamento.write', 'recrutamento:read', 'recrutamento:write'])));
CREATE POLICY convocacao_write ON recrutamento.convocacao FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.write', 'recrutamento.write', 'recrutamento:write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.write', 'recrutamento.write', 'recrutamento:write'])));

WITH nomeacao_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
  ('recrutamento.nomeacao.read', 'recrutamento', 'nomeacao', 'read', '/api/v1/**/nomeacoes/**', 'Read public contest appointment and notice records.'),
  ('recrutamento.nomeacao.write', 'recrutamento', 'nomeacao', 'write', '/api/v1/admin/nomeacoes/**', 'Mutate public contest appointments, notices, withdrawals, and deadline expiration.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM nomeacao_permissions
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description,
  updated_at = now();
