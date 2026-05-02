DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'posse_status'
  ) THEN
    CREATE TYPE recrutamento.posse_status AS ENUM (
      'AGENDADA',
      'POSSE_REALIZADA',
      'EXERCICIO',
      'PRORROGADA',
      'CANCELADA'
    );
  END IF;
END
$$;

ALTER TABLE hr.employee
  ADD COLUMN IF NOT EXISTS recruitment_concurso_id uuid,
  ADD COLUMN IF NOT EXISTS recruitment_nomeacao_id uuid;

CREATE INDEX IF NOT EXISTS employee_recruitment_origin_idx
  ON hr.employee (tenant_id, recruitment_concurso_id, recruitment_nomeacao_id)
  WHERE recruitment_concurso_id IS NOT NULL;

CREATE TABLE recrutamento.posse (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nomeacao_id uuid NOT NULL,
  posse_at timestamptz NOT NULL,
  exercicio_at timestamptz,
  exercicio_due_at date NOT NULL,
  lotacao_id uuid NOT NULL,
  employee_id uuid,
  status recrutamento.posse_status NOT NULL DEFAULT 'AGENDADA',
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posse_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT posse_nomeacao_fk FOREIGN KEY (tenant_id, nomeacao_id)
    REFERENCES recrutamento.nomeacao(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT posse_lotacao_fk FOREIGN KEY (lotacao_id)
    REFERENCES hr.work_location(id) ON DELETE RESTRICT,
  CONSTRAINT posse_employee_fk FOREIGN KEY (employee_id)
    REFERENCES hr.employee(id) ON DELETE RESTRICT,
  CONSTRAINT posse_nomeacao_uq UNIQUE (tenant_id, nomeacao_id),
  CONSTRAINT posse_employee_uq UNIQUE (tenant_id, employee_id),
  CONSTRAINT posse_exercicio_after_posse_check CHECK (exercicio_at IS NULL OR exercicio_at >= posse_at),
  CONSTRAINT posse_cancel_reason_check CHECK (status <> 'CANCELADA' OR length(trim(coalesce(cancellation_reason, ''))) > 0)
);

CREATE INDEX posse_status_due_idx
  ON recrutamento.posse (tenant_id, status, exercicio_due_at);
CREATE INDEX posse_employee_idx
  ON recrutamento.posse (tenant_id, employee_id)
  WHERE employee_id IS NOT NULL;

CREATE OR REPLACE FUNCTION recrutamento.sgp_posse_audit()
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

CREATE OR REPLACE FUNCTION recrutamento.touch_posse_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION recrutamento.add_business_days(p_start date, p_days integer)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
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

CREATE OR REPLACE FUNCTION recrutamento.efetivar_posse(p_posse_id uuid)
RETURNS TABLE(tenant_id uuid, posse_id uuid, nomeacao_id uuid, employee_id uuid)
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

DROP TRIGGER IF EXISTS posse_touch_updated_at ON recrutamento.posse;
CREATE TRIGGER posse_touch_updated_at BEFORE UPDATE ON recrutamento.posse
  FOR EACH ROW EXECUTE FUNCTION recrutamento.touch_posse_updated_at();

DROP TRIGGER IF EXISTS posse_audit ON recrutamento.posse;
CREATE TRIGGER posse_audit AFTER INSERT OR UPDATE OR DELETE ON recrutamento.posse
  FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_posse_audit();

ALTER TABLE recrutamento.posse ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.posse FORCE ROW LEVEL SECURITY;

CREATE POLICY posse_select ON recrutamento.posse FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['recrutamento.posse.read', 'recrutamento.posse.write', 'recrutamento:read', 'recrutamento:write', 'rh:write'])
    )
  );

CREATE POLICY posse_write ON recrutamento.posse FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['recrutamento.posse.write', 'recrutamento:write', 'rh:write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['recrutamento.posse.write', 'recrutamento:write', 'rh:write'])
    )
  );

WITH posse_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('recrutamento.posse.read', 'recrutamento', 'posse', 'read', '/api/v1/admin/posses/**', 'Read public contest possession and exercise records.'),
    ('recrutamento.posse.write', 'recrutamento', 'posse', 'write', '/api/v1/admin/posses/**', 'Schedule possession, confirm possession, start exercise, prorogue exercise, and cancel possession.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM posse_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT profile.id, permission.id, true
FROM public.access_profile profile
JOIN public.permission permission ON permission.key IN ('recrutamento.posse.read', 'recrutamento.posse.write')
WHERE profile.code IN ('ADMIN', 'RH_OPERADOR')
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;
