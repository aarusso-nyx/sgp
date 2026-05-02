DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'classificacao_snapshot_status'
  ) THEN
    CREATE TYPE recrutamento.classificacao_snapshot_status AS ENUM (
      'DRAFT',
      'PUBLISHED',
      'SUPERSEDED'
    );
  END IF;
END
$$;

ALTER TABLE recrutamento.prova
  ADD COLUMN IF NOT EXISTS required_for_classification boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS minimum_raw_score numeric(18, 6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_weighted_score numeric(18, 6) NOT NULL DEFAULT 0;

CREATE TABLE recrutamento.classificacao_snapshot (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  status recrutamento.classificacao_snapshot_status NOT NULL DEFAULT 'DRAFT',
  tiebreak_rules jsonb NOT NULL DEFAULT jsonb_build_array(
    jsonb_build_object('kind', 'ELDERLY_PRIORITY', 'legalBasis', 'Lei 10.741/2003 art. 27 paragrafo unico'),
    jsonb_build_object('kind', 'OLDER_AGE'),
    jsonb_build_object('kind', 'INSCRICAO_ID')
  ),
  CONSTRAINT classificacao_snapshot_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT classificacao_snapshot_concurso_fk FOREIGN KEY (tenant_id, concurso_id)
    REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE recrutamento.classificacao_item (
  tenant_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  vaga_id uuid NOT NULL,
  inscricao_id uuid NOT NULL,
  total_score numeric(18, 6) NOT NULL,
  rank_general integer,
  rank_pcd integer,
  rank_racial integer,
  call_order integer,
  allocation_bucket text NOT NULL DEFAULT 'GENERAL',
  eliminated_reason text,
  CONSTRAINT classificacao_item_pkey PRIMARY KEY (tenant_id, snapshot_id, vaga_id, inscricao_id),
  CONSTRAINT classificacao_item_snapshot_fk FOREIGN KEY (tenant_id, snapshot_id)
    REFERENCES recrutamento.classificacao_snapshot(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT classificacao_item_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id)
    REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT classificacao_item_rank_check CHECK (
    (eliminated_reason IS NULL AND rank_general IS NOT NULL)
    OR (eliminated_reason IS NOT NULL AND call_order IS NULL)
  ),
  CONSTRAINT classificacao_item_allocation_bucket_check CHECK (
    allocation_bucket IN ('GENERAL', 'PCD', 'RACIAL', 'INDIGENOUS')
  )
);

ALTER TABLE recrutamento.classificacao_snapshot
  DROP CONSTRAINT IF EXISTS classificacao_snapshot_tenant_id_id_concurso_id_uq,
  ADD CONSTRAINT classificacao_snapshot_tenant_id_id_concurso_id_uq UNIQUE (tenant_id, id, concurso_id);

ALTER TABLE recrutamento.classificacao_item
  ADD CONSTRAINT classificacao_item_vaga_fk FOREIGN KEY (tenant_id, vaga_id)
    REFERENCES hr.job_position(tenant_id, id) ON DELETE RESTRICT;

CREATE INDEX classificacao_snapshot_concurso_idx
  ON recrutamento.classificacao_snapshot (tenant_id, concurso_id, generated_at DESC);
CREATE INDEX classificacao_snapshot_public_idx
  ON recrutamento.classificacao_snapshot (concurso_id, status, generated_at DESC)
  WHERE status = 'PUBLISHED';
CREATE INDEX classificacao_item_rank_idx
  ON recrutamento.classificacao_item (tenant_id, snapshot_id, vaga_id, rank_general);
CREATE INDEX classificacao_item_call_order_idx
  ON recrutamento.classificacao_item (tenant_id, snapshot_id, vaga_id, call_order)
  WHERE call_order IS NOT NULL;

CREATE OR REPLACE FUNCTION recrutamento.sgp_classificacao_audit()
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
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id', after_json ->> 'snapshot_id', before_json ->> 'snapshot_id');
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

CREATE OR REPLACE FUNCTION recrutamento.prevent_published_classificacao_snapshot_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status IN ('PUBLISHED', 'SUPERSEDED') THEN
    RAISE EXCEPTION 'Published classification snapshots are immutable';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'PUBLISHED' THEN
    IF NEW.status = 'SUPERSEDED'
       AND NEW.tenant_id = OLD.tenant_id
       AND NEW.id = OLD.id
       AND NEW.concurso_id = OLD.concurso_id
       AND NEW.generated_at = OLD.generated_at
       AND NEW.tiebreak_rules = OLD.tiebreak_rules THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Published classification snapshots are immutable';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'SUPERSEDED' THEN
    RAISE EXCEPTION 'Superseded classification snapshots are immutable';
  END IF;

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE OR REPLACE FUNCTION recrutamento.prevent_published_classificacao_item_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  snapshot_status recrutamento.classificacao_snapshot_status;
BEGIN
  SELECT s.status
    INTO snapshot_status
  FROM recrutamento.classificacao_snapshot s
  WHERE s.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    AND s.id = COALESCE(NEW.snapshot_id, OLD.snapshot_id);

  IF snapshot_status IN ('PUBLISHED', 'SUPERSEDED') THEN
    RAISE EXCEPTION 'Published classification items are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE OR REPLACE FUNCTION recrutamento.gerar_classificacao(p_concurso_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot_id uuid;
  v_vaga record;
  v_slot integer;
  v_candidate uuid;
  v_bucket text;
BEGIN
  SELECT c.tenant_id
    INTO v_tenant_id
  FROM recrutamento.concurso c
  WHERE c.id = p_concurso_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Concurso % not found', p_concurso_id;
  END IF;

  INSERT INTO recrutamento.classificacao_snapshot (tenant_id, concurso_id)
  VALUES (v_tenant_id, p_concurso_id)
  RETURNING id INTO v_snapshot_id;

  CREATE TEMP TABLE tmp_classificacao_candidates (
    tenant_id uuid,
    vaga_id uuid,
    inscricao_id uuid,
    total_score numeric(18, 6),
    rank_general integer,
    rank_pcd integer,
    rank_racial integer,
    eliminated_reason text,
    is_pcd boolean,
    is_racial boolean,
    is_indigenous boolean,
    is_elderly boolean,
    birth_date date
  ) ON COMMIT DROP;

  INSERT INTO tmp_classificacao_candidates (
    tenant_id,
    vaga_id,
    inscricao_id,
    total_score,
    eliminated_reason,
    is_pcd,
    is_racial,
    is_indigenous,
    is_elderly,
    birth_date
  )
  WITH prova_requirements AS (
    SELECT
      p.tenant_id,
      p.concurso_id,
      p.id AS prova_id,
      p.required_for_classification,
      p.minimum_raw_score,
      p.minimum_weighted_score
    FROM recrutamento.prova p
    WHERE p.concurso_id = p_concurso_id
  ), scored AS (
    SELECT
      i.tenant_id,
      i.vaga_id,
      i.id AS inscricao_id,
      COALESCE(sum(n.weighted_score), 0)::numeric(18, 6) AS total_score,
      bool_or(pr.required_for_classification AND n.id IS NULL) AS missing_required,
      bool_or(
        n.id IS NOT NULL
        AND (n.raw_score < pr.minimum_raw_score OR n.weighted_score < pr.minimum_weighted_score)
      ) AS below_minimum,
      NULLIF(v.requirement ->> 'minimumTotalScore', '')::numeric(18, 6) AS minimum_total_score,
      i.quota_self_declaration,
      c.birth_date
    FROM recrutamento.inscricao i
    JOIN recrutamento.candidato c ON c.tenant_id = i.tenant_id AND c.id = i.candidato_id
    JOIN recrutamento.vaga v
      ON v.tenant_id = i.tenant_id
     AND v.concurso_id = i.concurso_id
     AND v.position_id = i.vaga_id
    LEFT JOIN prova_requirements pr ON pr.tenant_id = i.tenant_id AND pr.concurso_id = i.concurso_id
    LEFT JOIN recrutamento.nota n
      ON n.tenant_id = i.tenant_id
     AND n.inscricao_id = i.id
     AND n.prova_id = pr.prova_id
    WHERE i.tenant_id = v_tenant_id
      AND i.concurso_id = p_concurso_id
      AND i.status IN ('CONFIRMED', 'EXEMPT')
    GROUP BY i.tenant_id, i.vaga_id, i.id, i.quota_self_declaration, c.birth_date, v.requirement
  )
  SELECT
    tenant_id,
    vaga_id,
    inscricao_id,
    total_score,
    CASE
      WHEN missing_required THEN 'MISSING_REQUIRED_PROVA'
      WHEN below_minimum THEN 'BELOW_MINIMUM_PROVA_SCORE'
      WHEN minimum_total_score IS NOT NULL AND total_score < minimum_total_score THEN 'BELOW_MINIMUM_TOTAL_SCORE'
      ELSE NULL
    END AS eliminated_reason,
    COALESCE((quota_self_declaration ->> 'pcd')::boolean, false) AS is_pcd,
    COALESCE((quota_self_declaration ->> 'racial')::boolean, false) AS is_racial,
    COALESCE((quota_self_declaration ->> 'indigenous')::boolean, false) AS is_indigenous,
    birth_date <= (CURRENT_DATE - INTERVAL '60 years')::date AS is_elderly,
    birth_date
  FROM scored;

  WITH ranked AS (
    SELECT
      inscricao_id,
      row_number() OVER (
        PARTITION BY vaga_id
        ORDER BY total_score DESC, is_elderly DESC, birth_date ASC, inscricao_id ASC
      ) AS rank_general
    FROM tmp_classificacao_candidates
    WHERE eliminated_reason IS NULL
  )
  UPDATE tmp_classificacao_candidates c
  SET rank_general = ranked.rank_general
  FROM ranked
  WHERE ranked.inscricao_id = c.inscricao_id;

  WITH ranked AS (
    SELECT
      inscricao_id,
      row_number() OVER (
        PARTITION BY vaga_id
        ORDER BY total_score DESC, is_elderly DESC, birth_date ASC, inscricao_id ASC
      ) AS rank_pcd
    FROM tmp_classificacao_candidates
    WHERE eliminated_reason IS NULL AND is_pcd
  )
  UPDATE tmp_classificacao_candidates c
  SET rank_pcd = ranked.rank_pcd
  FROM ranked
  WHERE ranked.inscricao_id = c.inscricao_id;

  WITH ranked AS (
    SELECT
      inscricao_id,
      row_number() OVER (
        PARTITION BY vaga_id
        ORDER BY total_score DESC, is_elderly DESC, birth_date ASC, inscricao_id ASC
      ) AS rank_racial
    FROM tmp_classificacao_candidates
    WHERE eliminated_reason IS NULL AND is_racial
  )
  UPDATE tmp_classificacao_candidates c
  SET rank_racial = ranked.rank_racial
  FROM ranked
  WHERE ranked.inscricao_id = c.inscricao_id;

  INSERT INTO recrutamento.classificacao_item (
    tenant_id,
    snapshot_id,
    vaga_id,
    inscricao_id,
    total_score,
    rank_general,
    rank_pcd,
    rank_racial,
    eliminated_reason
  )
  SELECT
    tenant_id,
    v_snapshot_id,
    vaga_id,
    inscricao_id,
    total_score,
    rank_general,
    rank_pcd,
    rank_racial,
    eliminated_reason
  FROM tmp_classificacao_candidates;

  FOR v_vaga IN
    SELECT position_id, total_seats, pcd_seats, racial_seats, indigenous_seats
    FROM recrutamento.vaga
    WHERE tenant_id = v_tenant_id AND concurso_id = p_concurso_id
  LOOP
    FOR v_slot IN 1..v_vaga.total_seats LOOP
      v_candidate := NULL;
      v_bucket := 'GENERAL';

      IF v_vaga.racial_seats > 0 AND v_slot >= 3 AND ((v_slot - 3) % 5) = 0 THEN
        SELECT item.inscricao_id
          INTO v_candidate
        FROM recrutamento.classificacao_item item
        WHERE item.tenant_id = v_tenant_id
          AND item.snapshot_id = v_snapshot_id
          AND item.vaga_id = v_vaga.position_id
          AND item.eliminated_reason IS NULL
          AND item.rank_racial IS NOT NULL
          AND item.call_order IS NULL
        ORDER BY item.rank_racial
        LIMIT 1;
        IF v_candidate IS NOT NULL THEN
          v_bucket := 'RACIAL';
          v_vaga.racial_seats := v_vaga.racial_seats - 1;
        END IF;
      END IF;

      IF v_candidate IS NULL AND v_vaga.pcd_seats > 0 AND v_slot >= 5 AND ((v_slot - 5) % 20) = 0 THEN
        SELECT item.inscricao_id
          INTO v_candidate
        FROM recrutamento.classificacao_item item
        WHERE item.tenant_id = v_tenant_id
          AND item.snapshot_id = v_snapshot_id
          AND item.vaga_id = v_vaga.position_id
          AND item.eliminated_reason IS NULL
          AND item.rank_pcd IS NOT NULL
          AND item.call_order IS NULL
        ORDER BY item.rank_pcd
        LIMIT 1;
        IF v_candidate IS NOT NULL THEN
          v_bucket := 'PCD';
          v_vaga.pcd_seats := v_vaga.pcd_seats - 1;
        END IF;
      END IF;

      IF v_candidate IS NULL THEN
        SELECT item.inscricao_id
          INTO v_candidate
        FROM recrutamento.classificacao_item item
        WHERE item.tenant_id = v_tenant_id
          AND item.snapshot_id = v_snapshot_id
          AND item.vaga_id = v_vaga.position_id
          AND item.eliminated_reason IS NULL
          AND item.call_order IS NULL
        ORDER BY item.rank_general
        LIMIT 1;
      END IF;

      IF v_candidate IS NULL THEN
        EXIT;
      END IF;

      UPDATE recrutamento.classificacao_item
      SET call_order = v_slot,
          allocation_bucket = v_bucket
      WHERE tenant_id = v_tenant_id
        AND snapshot_id = v_snapshot_id
        AND vaga_id = v_vaga.position_id
        AND inscricao_id = v_candidate;
    END LOOP;
  END LOOP;

  RETURN v_snapshot_id;
END
$$;

CREATE OR REPLACE FUNCTION recrutamento.get_public_classificacao(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = recrutamento, hr, public, pg_catalog
AS $$
  SELECT jsonb_build_object(
    'concursoId', c.id::text,
    'code', c.code,
    'name', c.name,
    'snapshotId', s.id::text,
    'generatedAt', s.generated_at,
    'items', COALESCE(jsonb_agg(jsonb_build_object(
      'vagaId', item.vaga_id::text,
      'inscricaoId', item.inscricao_id::text,
      'candidateName', cand.full_name,
      'totalScore', item.total_score::text,
      'rankGeneral', item.rank_general,
      'rankPcd', item.rank_pcd,
      'rankRacial', item.rank_racial,
      'callOrder', item.call_order,
      'allocationBucket', item.allocation_bucket
    ) ORDER BY item.vaga_id, item.rank_general) FILTER (WHERE item.eliminated_reason IS NULL), '[]'::jsonb)
  )
  FROM recrutamento.concurso c
  JOIN LATERAL (
    SELECT *
    FROM recrutamento.classificacao_snapshot s
    WHERE s.tenant_id = c.tenant_id
      AND s.concurso_id = c.id
      AND s.status = 'PUBLISHED'
    ORDER BY s.generated_at DESC
    LIMIT 1
  ) s ON true
  JOIN recrutamento.classificacao_item item ON item.tenant_id = s.tenant_id AND item.snapshot_id = s.id
  JOIN recrutamento.inscricao i ON i.tenant_id = item.tenant_id AND i.id = item.inscricao_id
  JOIN recrutamento.candidato cand ON cand.tenant_id = i.tenant_id AND cand.id = i.candidato_id
  WHERE c.code = p_slug
    AND c.status IN ('PUBLISHED', 'OPEN', 'CLOSED', 'HOMOLOGATED')
  GROUP BY c.id, c.code, c.name, s.id, s.generated_at
$$;

DROP TRIGGER IF EXISTS classificacao_snapshot_immutable ON recrutamento.classificacao_snapshot;
CREATE TRIGGER classificacao_snapshot_immutable BEFORE UPDATE OR DELETE ON recrutamento.classificacao_snapshot
  FOR EACH ROW EXECUTE FUNCTION recrutamento.prevent_published_classificacao_snapshot_change();

DROP TRIGGER IF EXISTS classificacao_item_immutable ON recrutamento.classificacao_item;
CREATE TRIGGER classificacao_item_immutable BEFORE INSERT OR UPDATE OR DELETE ON recrutamento.classificacao_item
  FOR EACH ROW EXECUTE FUNCTION recrutamento.prevent_published_classificacao_item_change();

DROP TRIGGER IF EXISTS classificacao_snapshot_audit ON recrutamento.classificacao_snapshot;
CREATE TRIGGER classificacao_snapshot_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.classificacao_snapshot
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_classificacao_audit();

DROP TRIGGER IF EXISTS classificacao_item_audit ON recrutamento.classificacao_item;
CREATE TRIGGER classificacao_item_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.classificacao_item
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_classificacao_audit();

ALTER TABLE recrutamento.classificacao_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.classificacao_snapshot FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.classificacao_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.classificacao_item FORCE ROW LEVEL SECURITY;

CREATE POLICY classificacao_snapshot_select ON recrutamento.classificacao_snapshot FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.read', 'recrutamento.classificacao.write', 'recrutamento.read', 'recrutamento.write', 'recrutamento:read', 'recrutamento:write'])));
CREATE POLICY classificacao_snapshot_write ON recrutamento.classificacao_snapshot FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.write', 'recrutamento.write', 'recrutamento:write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.write', 'recrutamento.write', 'recrutamento:write'])));

CREATE POLICY classificacao_item_select ON recrutamento.classificacao_item FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.read', 'recrutamento.classificacao.write', 'recrutamento.read', 'recrutamento.write', 'recrutamento:read', 'recrutamento:write'])));
CREATE POLICY classificacao_item_write ON recrutamento.classificacao_item FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.write', 'recrutamento.write', 'recrutamento:write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.write', 'recrutamento.write', 'recrutamento:write'])));

WITH classificacao_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
  ('recrutamento.classificacao.read', 'recrutamento', 'classificacao', 'read', '/api/v1/**/concursos/*/classificacao', 'Read recruitment classification snapshots.'),
  ('recrutamento.classificacao.write', 'recrutamento', 'classificacao', 'write', '/api/v1/admin/concursos/*/classificacao', 'Generate and publish recruitment classification snapshots.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM classificacao_permissions
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description,
  updated_at = now();
