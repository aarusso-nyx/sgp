DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'prova_kind'
  ) THEN
    CREATE TYPE recrutamento.prova_kind AS ENUM ('OBJETIVA', 'DISCURSIVA', 'PRATICA', 'TITULOS');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'gabarito_status'
  ) THEN
    CREATE TYPE recrutamento.gabarito_status AS ENUM ('PRELIMINARY', 'FINAL', 'SUPERSEDED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'recurso_status'
  ) THEN
    CREATE TYPE recrutamento.recurso_status AS ENUM ('OPEN', 'UPHELD', 'REJECTED');
  END IF;
END
$$;

ALTER TABLE recrutamento.edital
  ADD COLUMN IF NOT EXISTS resource_deadline_at timestamptz;

CREATE TABLE recrutamento.prova (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL,
  kind recrutamento.prova_kind NOT NULL,
  applied_at timestamptz NOT NULL,
  weight numeric(18, 6) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prova_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT prova_concurso_fk FOREIGN KEY (tenant_id, concurso_id)
    REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT prova_weight_nonnegative_check CHECK (weight >= 0)
);

CREATE TABLE recrutamento.questao (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prova_id uuid NOT NULL,
  number integer NOT NULL,
  statement text NOT NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT questao_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT questao_prova_fk FOREIGN KEY (tenant_id, prova_id)
    REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT questao_number_positive_check CHECK (number > 0),
  CONSTRAINT questao_number_uq UNIQUE (tenant_id, prova_id, number)
);

CREATE TABLE recrutamento.gabarito (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prova_id uuid NOT NULL,
  version integer NOT NULL,
  status recrutamento.gabarito_status NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT gabarito_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT gabarito_prova_fk FOREIGN KEY (tenant_id, prova_id)
    REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT gabarito_version_positive_check CHECK (version > 0),
  CONSTRAINT gabarito_version_uq UNIQUE (tenant_id, prova_id, version)
);

CREATE TABLE recrutamento.resposta_candidato (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL,
  prova_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  answer text NOT NULL,
  is_correct boolean,
  score numeric(18, 6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resposta_candidato_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT resposta_candidato_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id)
    REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT resposta_candidato_prova_fk FOREIGN KEY (tenant_id, prova_id)
    REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT resposta_candidato_questao_fk FOREIGN KEY (tenant_id, questao_id)
    REFERENCES recrutamento.questao(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT resposta_candidato_score_nonnegative_check CHECK (score >= 0),
  CONSTRAINT resposta_candidato_uq UNIQUE (tenant_id, inscricao_id, prova_id, questao_id)
);

CREATE TABLE recrutamento.recurso (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL,
  prova_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  reason text NOT NULL,
  status recrutamento.recurso_status NOT NULL DEFAULT 'OPEN',
  parecer text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurso_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT recurso_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id)
    REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT recurso_prova_fk FOREIGN KEY (tenant_id, prova_id)
    REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT recurso_questao_fk FOREIGN KEY (tenant_id, questao_id)
    REFERENCES recrutamento.questao(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT recurso_decision_check CHECK (
    (status = 'OPEN' AND parecer IS NULL AND decided_at IS NULL)
    OR (status IN ('UPHELD', 'REJECTED') AND parecer IS NOT NULL AND decided_at IS NOT NULL)
  )
);

CREATE TABLE recrutamento.nota (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL,
  prova_id uuid NOT NULL,
  raw_score numeric(18, 6) NOT NULL DEFAULT 0,
  weighted_score numeric(18, 6) NOT NULL DEFAULT 0,
  recomputed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nota_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT nota_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id)
    REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT nota_prova_fk FOREIGN KEY (tenant_id, prova_id)
    REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT nota_score_nonnegative_check CHECK (raw_score >= 0 AND weighted_score >= 0),
  CONSTRAINT nota_uq UNIQUE (tenant_id, inscricao_id, prova_id)
);

CREATE INDEX prova_concurso_idx ON recrutamento.prova (tenant_id, concurso_id, applied_at);
CREATE INDEX gabarito_status_idx ON recrutamento.gabarito (tenant_id, prova_id, status, version DESC);
CREATE INDEX recurso_status_idx ON recrutamento.recurso (tenant_id, prova_id, status, created_at);
CREATE INDEX nota_lookup_idx ON recrutamento.nota (tenant_id, inscricao_id, prova_id);

CREATE OR REPLACE FUNCTION recrutamento.sgp_avaliacao_audit()
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

CREATE OR REPLACE FUNCTION recrutamento.prevent_final_gabarito_in_place()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'FINAL'
     AND (NEW.answers IS DISTINCT FROM OLD.answers OR NEW.version IS DISTINCT FROM OLD.version) THEN
    RAISE EXCEPTION 'FINAL gabarito cannot be altered in place; create a new version';
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION recrutamento.recompute_notas(p_prova_id uuid, p_gabarito_version integer)
RETURNS TABLE(inscricao_id uuid, old_weighted_score numeric, new_weighted_score numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  gabarito_row record;
  changed_row record;
BEGIN
  SELECT g.tenant_id, g.prova_id, g.version, g.answers, p.weight
    INTO gabarito_row
  FROM recrutamento.gabarito g
  JOIN recrutamento.prova p ON p.tenant_id = g.tenant_id AND p.id = g.prova_id
  WHERE g.prova_id = p_prova_id
    AND g.version = p_gabarito_version
    AND g.status IN ('PRELIMINARY', 'FINAL')
  LIMIT 1;

  IF gabarito_row.prova_id IS NULL THEN
    RAISE EXCEPTION 'Gabarito version % for prova % not found', p_gabarito_version, p_prova_id;
  END IF;

  UPDATE recrutamento.resposta_candidato r
  SET is_correct = COALESCE(gabarito_row.answers ->> q.number::text, '') = r.answer,
      score = CASE WHEN COALESCE(gabarito_row.answers ->> q.number::text, '') = r.answer THEN 1 ELSE 0 END
  FROM recrutamento.questao q
  WHERE q.tenant_id = r.tenant_id
    AND q.id = r.questao_id
    AND r.tenant_id = gabarito_row.tenant_id
    AND r.prova_id = gabarito_row.prova_id;

  FOR changed_row IN
    WITH scores AS (
      SELECT
        r.tenant_id,
        r.inscricao_id,
        r.prova_id,
        COALESCE(sum(r.score), 0)::numeric(18,6) AS raw_score,
        (COALESCE(sum(r.score), 0) * gabarito_row.weight)::numeric(18,6) AS weighted_score
      FROM recrutamento.resposta_candidato r
      WHERE r.tenant_id = gabarito_row.tenant_id
        AND r.prova_id = gabarito_row.prova_id
      GROUP BY r.tenant_id, r.inscricao_id, r.prova_id
    ), upserted AS (
      INSERT INTO recrutamento.nota (
        tenant_id, inscricao_id, prova_id, raw_score, weighted_score, recomputed_at
      )
      SELECT tenant_id, inscricao_id, prova_id, raw_score, weighted_score, now()
      FROM scores
      ON CONFLICT (tenant_id, inscricao_id, prova_id) DO UPDATE
      SET raw_score = EXCLUDED.raw_score,
          weighted_score = EXCLUDED.weighted_score,
          recomputed_at = now()
      WHERE recrutamento.nota.raw_score IS DISTINCT FROM EXCLUDED.raw_score
         OR recrutamento.nota.weighted_score IS DISTINCT FROM EXCLUDED.weighted_score
      RETURNING
        recrutamento.nota.tenant_id,
        recrutamento.nota.inscricao_id,
        recrutamento.nota.prova_id,
        recrutamento.nota.raw_score,
        recrutamento.nota.weighted_score
    )
    SELECT
      u.tenant_id,
      u.inscricao_id,
      u.prova_id,
      NULL::numeric AS old_weighted_score,
      u.weighted_score AS new_weighted_score
    FROM upserted u
  LOOP
    PERFORM set_config('app.current_tenant_id', changed_row.tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'PROCESS',
      'recrutamento.nota',
      changed_row.inscricao_id::text,
      NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'recrutamento.nota',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object(
        'operation', 'RECOMPUTE',
        'provaId', changed_row.prova_id::text,
        'gabaritoVersion', p_gabarito_version,
        'weightedScore', changed_row.new_weighted_score
      )
    );
    inscricao_id := changed_row.inscricao_id;
    old_weighted_score := changed_row.old_weighted_score;
    new_weighted_score := changed_row.new_weighted_score;
    RETURN NEXT;
  END LOOP;
END
$$;

DROP TRIGGER IF EXISTS gabarito_no_final_update ON recrutamento.gabarito;
CREATE TRIGGER gabarito_no_final_update BEFORE UPDATE ON recrutamento.gabarito
  FOR EACH ROW EXECUTE FUNCTION recrutamento.prevent_final_gabarito_in_place();

DO $$
DECLARE
  rel regclass;
  trigger_name text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'recrutamento.prova'::regclass,
    'recrutamento.questao'::regclass,
    'recrutamento.gabarito'::regclass,
    'recrutamento.resposta_candidato'::regclass,
    'recrutamento.recurso'::regclass,
    'recrutamento.nota'::regclass
  ]
  LOOP
    trigger_name := replace(rel::text, '.', '_') || '_audit';
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_name, rel);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_avaliacao_audit()',
      trigger_name,
      rel
    );
  END LOOP;
END
$$;

ALTER TABLE recrutamento.prova ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.prova FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.questao ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.questao FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.gabarito ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.gabarito FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.resposta_candidato ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.resposta_candidato FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.recurso ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.recurso FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.nota ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.nota FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  rel regclass;
  table_name text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'recrutamento.prova'::regclass,
    'recrutamento.questao'::regclass,
    'recrutamento.gabarito'::regclass,
    'recrutamento.resposta_candidato'::regclass,
    'recrutamento.recurso'::regclass,
    'recrutamento.nota'::regclass
  ]
  LOOP
    table_name := split_part(rel::text, '.', 2);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', table_name || '_select', rel);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', table_name || '_write', rel);
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.avaliacao.read'', ''recrutamento.avaliacao.write'', ''recrutamento.read'', ''recrutamento.write''])))',
      table_name || '_select',
      rel
    );
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.avaliacao.write'', ''recrutamento.write'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.avaliacao.write'', ''recrutamento.write''])))',
      table_name || '_write',
      rel
    );
  END LOOP;
END
$$;
