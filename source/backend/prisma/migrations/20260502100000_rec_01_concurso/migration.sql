CREATE SCHEMA IF NOT EXISTS recrutamento;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'concurso_status'
  ) THEN
    CREATE TYPE recrutamento.concurso_status AS ENUM (
      'DRAFT',
      'PUBLISHED',
      'OPEN',
      'CLOSED',
      'CANCELLED',
      'HOMOLOGATED'
    );
  END IF;
END
$$;

CREATE TABLE recrutamento.concurso (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  status recrutamento.concurso_status NOT NULL DEFAULT 'DRAFT',
  valid_until date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid,
  CONSTRAINT concurso_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT concurso_code_uq UNIQUE (tenant_id, code)
);

CREATE TABLE recrutamento.edital (
  tenant_id uuid NOT NULL,
  concurso_id uuid NOT NULL,
  version integer NOT NULL,
  document_ref text NOT NULL,
  administrative_act text NOT NULL,
  administrative_act_date date NOT NULL,
  published_at timestamptz,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT edital_pkey PRIMARY KEY (tenant_id, concurso_id, version),
  CONSTRAINT edital_concurso_fk FOREIGN KEY (tenant_id, concurso_id)
    REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT edital_version_positive_check CHECK (version > 0),
  CONSTRAINT edital_public_url_required_check CHECK (published_at IS NULL OR public_url IS NOT NULL)
);

ALTER TABLE hr.job_position
  DROP CONSTRAINT IF EXISTS job_position_tenant_id_id_uq,
  ADD CONSTRAINT job_position_tenant_id_id_uq UNIQUE (tenant_id, id);

CREATE TABLE recrutamento.vaga (
  tenant_id uuid NOT NULL,
  concurso_id uuid NOT NULL,
  position_id uuid NOT NULL,
  total_seats integer NOT NULL,
  pcd_seats integer NOT NULL DEFAULT 0,
  racial_seats integer NOT NULL DEFAULT 0,
  indigenous_seats integer NOT NULL DEFAULT 0,
  requirement jsonb NOT NULL DEFAULT '{}'::jsonb,
  base_salary numeric(14, 2) NOT NULL,
  CONSTRAINT vaga_pkey PRIMARY KEY (tenant_id, concurso_id, position_id),
  CONSTRAINT vaga_concurso_fk FOREIGN KEY (tenant_id, concurso_id)
    REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT vaga_position_fk FOREIGN KEY (tenant_id, position_id)
    REFERENCES hr.job_position(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT vaga_total_seats_positive_check CHECK (total_seats > 0),
  CONSTRAINT vaga_reserve_nonnegative_check CHECK (pcd_seats >= 0 AND racial_seats >= 0 AND indigenous_seats >= 0),
  CONSTRAINT vaga_reserve_total_check CHECK ((pcd_seats + racial_seats + indigenous_seats) <= total_seats),
  CONSTRAINT vaga_base_salary_positive_check CHECK (base_salary >= 0)
);

CREATE INDEX concurso_status_idx ON recrutamento.concurso (tenant_id, status, valid_until);
CREATE INDEX edital_public_lookup_idx ON recrutamento.edital (tenant_id, concurso_id, version DESC) WHERE published_at IS NOT NULL;

CREATE OR REPLACE FUNCTION recrutamento.sgp_concurso_audit()
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

DROP TRIGGER IF EXISTS concurso_audit ON recrutamento.concurso;
CREATE TRIGGER concurso_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.concurso
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_concurso_audit();

DROP TRIGGER IF EXISTS edital_audit ON recrutamento.edital;
CREATE TRIGGER edital_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.edital
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_concurso_audit();

DROP TRIGGER IF EXISTS vaga_audit ON recrutamento.vaga;
CREATE TRIGGER vaga_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.vaga
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_concurso_audit();

ALTER TABLE recrutamento.concurso ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.concurso FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.edital ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.edital FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.vaga ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.vaga FORCE ROW LEVEL SECURITY;

CREATE POLICY concurso_select ON recrutamento.concurso FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.read', 'recrutamento.concurso.write', 'recrutamento.read', 'recrutamento.write'])));
CREATE POLICY concurso_write ON recrutamento.concurso FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write', 'recrutamento.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write', 'recrutamento.write'])));

CREATE POLICY edital_select ON recrutamento.edital FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.read', 'recrutamento.concurso.write', 'recrutamento.read', 'recrutamento.write'])));
CREATE POLICY edital_write ON recrutamento.edital FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write', 'recrutamento.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write', 'recrutamento.write'])));

CREATE POLICY vaga_select ON recrutamento.vaga FOR SELECT
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.read', 'recrutamento.concurso.write', 'recrutamento.read', 'recrutamento.write'])));
CREATE POLICY vaga_write ON recrutamento.vaga FOR ALL
  USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write', 'recrutamento.write'])))
  WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write', 'recrutamento.write'])));

CREATE OR REPLACE FUNCTION recrutamento.get_public_concurso(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = recrutamento, hr, public, pg_catalog
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
  WHERE c.code = p_slug AND c.status IN ('PUBLISHED', 'OPEN')
  GROUP BY c.tenant_id, c.id, c.code, c.name, c.status, c.valid_until, e.version, e.document_ref, e.published_at, e.public_url
$$;
