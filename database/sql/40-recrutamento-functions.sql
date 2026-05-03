CREATE FUNCTION recrutamento.add_business_days(p_start date, p_days integer) RETURNS date
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_current date := p_start;
  v_added integer := 0;
BEGIN
  IF p_days <= 0 THEN
    RETURN p_start;
  END IF;

  WHILE v_added < p_days LOOP
    v_current := v_current + 1;
    IF EXTRACT(ISODOW FROM v_current) < 6 THEN
      v_added := v_added + 1;
    END IF;
  END LOOP;
  RETURN v_current;
END
$$;

CREATE FUNCTION recrutamento.efetivar_posse(p_posse_id uuid) RETURNS TABLE(tenant_id uuid, posse_id uuid, nomeacao_id uuid, employee_id uuid)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_posse recrutamento.posse;
  v_nomeacao recrutamento.nomeacao;
  v_candidate recrutamento.candidato;
  v_position_id uuid;
  v_functional_status_id uuid;
  v_employment_link_id uuid;
  v_contract_type_id uuid;
  v_employee_id uuid;
  v_registration text;
BEGIN
  SELECT * INTO v_posse
  FROM recrutamento.posse
  WHERE id = p_posse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POSSE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_posse.status NOT IN ('POSSE_REALIZADA', 'PRORROGADA') THEN
    RAISE EXCEPTION 'POSSE_MUST_BE_REALIZADA' USING ERRCODE = '23514';
  END IF;
  IF v_posse.employee_id IS NOT NULL THEN
    RAISE EXCEPTION 'POSSE_ALREADY_EFFECTIVE' USING ERRCODE = '23505';
  END IF;

  SELECT * INTO v_nomeacao
  FROM recrutamento.nomeacao
  WHERE tenant_id = v_posse.tenant_id
    AND id = v_posse.nomeacao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOMEACAO_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_nomeacao.status <> 'POSSE'::recrutamento.nomeacao_status THEN
    RAISE EXCEPTION 'NOMEACAO_MUST_BE_POSSE' USING ERRCODE = '23514';
  END IF;

  SELECT c.* INTO v_candidate
  FROM recrutamento.inscricao i
  JOIN recrutamento.candidato c
    ON c.tenant_id = i.tenant_id
   AND c.id = i.candidato_id
  WHERE i.tenant_id = v_nomeacao.tenant_id
    AND i.id = v_nomeacao.inscricao_id;

  SELECT position_id INTO v_position_id
  FROM recrutamento.vaga
  WHERE tenant_id = v_nomeacao.tenant_id
    AND concurso_id = v_nomeacao.concurso_id
    AND position_id = v_nomeacao.vaga_id;

  INSERT INTO hr.functional_status (
    tenant_id, code, description, modality, kind, enters_payroll, lifecycle_status, status
  )
  VALUES (
    v_posse.tenant_id, 'EM_EXERCICIO', 'Em exercicio', 'ATIVO', 'EXERCICIO', true, 'ACTIVE'::"EmployeeLifecycleStatus", 'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT (tenant_id, code) DO UPDATE
  SET description = EXCLUDED.description,
      modality = EXCLUDED.modality,
      kind = EXCLUDED.kind,
      enters_payroll = EXCLUDED.enters_payroll,
      lifecycle_status = EXCLUDED.lifecycle_status,
      status = EXCLUDED.status,
      updated_at = now()
  RETURNING id INTO v_functional_status_id;

  INSERT INTO hr.employment_link (
    tenant_id, code, name, contract_type, regime_law_reference, functional_status_id, status
  )
  VALUES (
    v_posse.tenant_id, 'ESTATUTARIO', 'Estatutario', 'statutory', 'Lei 8.112/1990 arts. 13-15', v_functional_status_id, 'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name,
      contract_type = EXCLUDED.contract_type,
      regime_law_reference = EXCLUDED.regime_law_reference,
      functional_status_id = EXCLUDED.functional_status_id,
      status = EXCLUDED.status,
      updated_at = now()
  RETURNING id INTO v_employment_link_id;

  INSERT INTO hr.contract_type (tenant_id, code, name, status)
  VALUES (v_posse.tenant_id, 'EFETIVO', 'Efetivo', 'ACTIVE'::"RecordStatus")
  ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name,
      status = EXCLUDED.status,
      updated_at = now()
  RETURNING id INTO v_contract_type_id;

  v_registration := 'REC-' || replace(v_nomeacao.id::text, '-', '')::text;

  INSERT INTO hr.employee (
    tenant_id,
    registration,
    name,
    cpf,
    birth_date,
    email,
    phone,
    address,
    work_location_id,
    job_position_id,
    functional_status_id,
    employment_link_id,
    contract_type_id,
    hired_on,
    lifecycle_status,
    recruitment_concurso_id,
    recruitment_nomeacao_id
  )
  VALUES (
    v_posse.tenant_id,
    v_registration,
    v_candidate.full_name,
    v_candidate.cpf,
    v_candidate.birth_date,
    v_candidate.email,
    v_candidate.phone,
    v_candidate.address,
    v_posse.lotacao_id,
    v_position_id,
    v_functional_status_id,
    v_employment_link_id,
    v_contract_type_id,
    COALESCE(v_posse.exercicio_at::date, CURRENT_DATE),
    'ACTIVE'::"EmployeeLifecycleStatus",
    v_nomeacao.concurso_id,
    v_nomeacao.id
  )
  RETURNING id INTO v_employee_id;

  INSERT INTO hr.employment_contract (
    tenant_id,
    employee_id,
    employment_link_id,
    contract_type_id,
    appointed_on,
    possession_on,
    exercise_on,
    starts_on,
    legal_basis,
    status
  )
  VALUES (
    v_posse.tenant_id,
    v_employee_id,
    v_employment_link_id,
    v_contract_type_id,
    v_nomeacao.published_at::date,
    v_posse.posse_at::date,
    COALESCE(v_posse.exercicio_at::date, CURRENT_DATE),
    COALESCE(v_posse.exercicio_at::date, CURRENT_DATE),
    'Lei 8.112/1990 arts. 13-15',
    'ACTIVE'::"RecordStatus"
  );

  UPDATE recrutamento.posse
  SET status = 'EXERCICIO'::recrutamento.posse_status,
      exercicio_at = COALESCE(exercicio_at, now()),
      employee_id = v_employee_id
  WHERE tenant_id = v_posse.tenant_id
    AND id = v_posse.id;

  UPDATE recrutamento.nomeacao
  SET status = 'EXERCICIO'::recrutamento.nomeacao_status
  WHERE tenant_id = v_nomeacao.tenant_id
    AND id = v_nomeacao.id;

  PERFORM public.sgp_append_audit_event(
    'PROCESS',
    'recrutamento.posse.exercicio',
    v_posse.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'recrutamento.posse',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'nomeacaoId', v_nomeacao.id::text,
      'employeeId', v_employee_id::text,
      'event', 'recrutamento.posse.exercicio'
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN QUERY SELECT v_posse.tenant_id, v_posse.id, v_nomeacao.id, v_employee_id;
END
$$;

CREATE FUNCTION recrutamento.expirar_prazo_nomeacao(p_nomeacao_id uuid) RETURNS boolean
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

CREATE FUNCTION recrutamento.gerar_classificacao(p_concurso_id uuid) RETURNS uuid
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

CREATE FUNCTION recrutamento.get_public_classificacao(p_slug text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'recrutamento', 'hr', 'public', 'pg_catalog'
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

CREATE FUNCTION recrutamento.get_public_concurso(p_slug text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'recrutamento', 'hr', 'public', 'pg_catalog'
    AS $$
  SELECT jsonb_build_object(
    'id', c.id::text,
    'tenantId', c.tenant_id::text,
    'code', c.code,
    'name', c.name,
    'status', c.status::text,
    'validUntil', c.valid_until,
    'edital', jsonb_build_object(
      'version', e.version,
      'documentRef', e.document_ref,
      'publishedAt', e.published_at,
      'publicUrl', e.public_url
    ),
    'vagas', COALESCE(jsonb_agg(jsonb_build_object(
      'positionId', v.position_id::text,
      'positionName', jp.name,
      'organicDefinitionId', v.organic_definition_id::text,
      'workLocationId', od.work_location_id::text,
      'totalSeats', v.total_seats,
      'pcdSeats', v.pcd_seats,
      'racialSeats', v.racial_seats,
      'indigenousSeats', v.indigenous_seats,
      'requirement', v.requirement,
      'baseSalary', v.base_salary::text
    ) ORDER BY jp.name) FILTER (WHERE v.position_id IS NOT NULL), '[]'::jsonb)
  )
  FROM recrutamento.concurso c
  JOIN LATERAL (
    SELECT * FROM recrutamento.edital e
    WHERE e.tenant_id = c.tenant_id AND e.concurso_id = c.id AND e.published_at IS NOT NULL
    ORDER BY e.version DESC
    LIMIT 1
  ) e ON true
  LEFT JOIN recrutamento.vaga v ON v.tenant_id = c.tenant_id AND v.concurso_id = c.id
  LEFT JOIN hr.job_position jp ON jp.tenant_id = v.tenant_id AND jp.id = v.position_id
  LEFT JOIN hr.organic_definition od ON od.tenant_id = v.tenant_id AND od.id = v.organic_definition_id
  WHERE c.code = p_slug AND c.status IN ('PUBLISHED', 'OPEN')
  GROUP BY c.tenant_id, c.id, c.code, c.name, c.status, c.valid_until, e.version, e.document_ref, e.published_at, e.public_url
$$;

CREATE FUNCTION recrutamento.prevent_final_gabarito_in_place() RETURNS trigger
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

CREATE FUNCTION recrutamento.prevent_published_classificacao_item_change() RETURNS trigger
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

CREATE FUNCTION recrutamento.prevent_published_classificacao_snapshot_change() RETURNS trigger
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

CREATE FUNCTION recrutamento.proxima_chamada(p_concurso_id uuid, p_vaga_id uuid) RETURNS TABLE(tenant_id uuid, concurso_id uuid, vaga_id uuid, inscricao_id uuid, call_order integer, allocation_bucket text, rank_general integer)
    LANGUAGE sql STABLE
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

CREATE FUNCTION recrutamento.recompute_notas(p_prova_id uuid, p_gabarito_version integer) RETURNS TABLE(inscricao_id uuid, old_weighted_score numeric, new_weighted_score numeric)
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

CREATE FUNCTION recrutamento.sgp_avaliacao_audit() RETURNS trigger
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

CREATE FUNCTION recrutamento.sgp_banca_audit() RETURNS trigger
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

CREATE FUNCTION recrutamento.sgp_biometric_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
  metadata jsonb;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  after_json := after_json - 'template_cipher';
  before_json := before_json - 'template_cipher';
  metadata := jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json);

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
    metadata
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_classificacao_audit() RETURNS trigger
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

CREATE FUNCTION recrutamento.sgp_concurso_audit() RETURNS trigger
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
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id', after_json ->> 'concurso_id', before_json ->> 'concurso_id');
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

CREATE FUNCTION recrutamento.sgp_inscricao_audit() RETURNS trigger
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

CREATE FUNCTION recrutamento.sgp_nomeacao_audit() RETURNS trigger
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

CREATE FUNCTION recrutamento.sgp_posse_audit() RETURNS trigger
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
    'recrutamento.posse',
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'recrutamento.posse',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION recrutamento.sgp_proctoring_audit() RETURNS trigger
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

CREATE FUNCTION recrutamento.touch_nomeacao_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION recrutamento.touch_posse_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
