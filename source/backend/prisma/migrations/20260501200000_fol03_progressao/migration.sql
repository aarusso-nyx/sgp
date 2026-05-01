DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'progression_type' AND typnamespace = 'hr'::regnamespace
  ) THEN
    CREATE TYPE hr.progression_type AS ENUM ('merit_horizontal', 'vertical_promotion');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'progression_status' AND typnamespace = 'hr'::regnamespace
  ) THEN
    CREATE TYPE hr.progression_status AS ENUM ('eligible', 'simulated', 'applied', 'revoked');
  END IF;
END
$$;

ALTER TABLE hr.employee
  ADD COLUMN IF NOT EXISTS salary_range_level_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_salary_range_level_id_fkey'
  ) THEN
    ALTER TABLE hr.employee
      ADD CONSTRAINT employee_salary_range_level_id_fkey
      FOREIGN KEY (salary_range_level_id) REFERENCES hr.salary_range_level(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

UPDATE hr.employee e
SET salary_range_level_id = srl.id
FROM hr.job_position jp
JOIN hr.salary_range_level srl ON srl.salary_range_id = jp.salary_range_id
WHERE e.job_position_id = jp.id
  AND e.salary_range_level_id IS NULL
  AND srl.id = (
    SELECT first_level.id
    FROM hr.salary_range_level first_level
    WHERE first_level.salary_range_id = jp.salary_range_id
      AND first_level.tenant_id = e.tenant_id
    ORDER BY first_level.class_number, first_level.level_number_fol02
    LIMIT 1
  );

CREATE INDEX IF NOT EXISTS employee_salary_range_level_idx
  ON hr.employee(tenant_id, salary_range_level_id)
  WHERE salary_range_level_id IS NOT NULL;

ALTER TABLE hr.merit_progression
  ADD COLUMN IF NOT EXISTS progression_type hr.progression_type NOT NULL DEFAULT 'merit_horizontal',
  ADD COLUMN IF NOT EXISTS data_efeito date,
  ADD COLUMN IF NOT EXISTS source_salary_range_level_id uuid,
  ADD COLUMN IF NOT EXISTS target_salary_range_level_id uuid,
  ADD COLUMN IF NOT EXISTS administrative_process_id uuid,
  ADD COLUMN IF NOT EXISTS status hr.progression_status NOT NULL DEFAULT 'eligible',
  ADD COLUMN IF NOT EXISTS applied_at timestamptz(6);

UPDATE hr.merit_progression
SET data_efeito = COALESCE(data_efeito, effective_on)
WHERE data_efeito IS NULL;

ALTER TABLE hr.merit_progression
  ALTER COLUMN data_efeito SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'merit_progression_source_salary_range_level_id_fkey'
  ) THEN
    ALTER TABLE hr.merit_progression
      ADD CONSTRAINT merit_progression_source_salary_range_level_id_fkey
      FOREIGN KEY (source_salary_range_level_id) REFERENCES hr.salary_range_level(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'merit_progression_target_salary_range_level_id_fkey'
  ) THEN
    ALTER TABLE hr.merit_progression
      ADD CONSTRAINT merit_progression_target_salary_range_level_id_fkey
      FOREIGN KEY (target_salary_range_level_id) REFERENCES hr.salary_range_level(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS merit_progression_status_idx
  ON hr.merit_progression(tenant_id, status, data_efeito);
CREATE INDEX IF NOT EXISTS merit_progression_level_idx
  ON hr.merit_progression(source_salary_range_level_id, target_salary_range_level_id);

ALTER TABLE hr.salary_simulation
  ADD COLUMN IF NOT EXISTS progression_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_simulation_progression_id_fkey'
  ) THEN
    ALTER TABLE hr.salary_simulation
      ADD CONSTRAINT salary_simulation_progression_id_fkey
      FOREIGN KEY (progression_id) REFERENCES hr.merit_progression(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS salary_simulation_progression_idx
  ON hr.salary_simulation(tenant_id, progression_id)
  WHERE progression_id IS NOT NULL;

CREATE OR REPLACE FUNCTION avaliacao.apply_merit_progression()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_salary numeric(14,2);
  v_level_code text;
  v_level_name text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status <> 'applied'::hr.progression_status THEN
    RETURN NEW;
  END IF;

  IF NEW.target_salary_range_level_id IS NULL THEN
    RAISE EXCEPTION 'Applied progression % must have target_salary_range_level_id', NEW.id;
  END IF;

  SELECT
    avaliacao.fn_get_vencimento_vigente(NEW.target_salary_range_level_id, NEW.data_efeito),
    level.code,
    level.name
  INTO v_target_salary, v_level_code, v_level_name
  FROM hr.salary_range_level level
  WHERE level.id = NEW.target_salary_range_level_id
    AND level.tenant_id = NEW.tenant_id;

  IF v_target_salary IS NULL THEN
    RAISE EXCEPTION 'Target salary range level % not found for tenant %', NEW.target_salary_range_level_id, NEW.tenant_id;
  END IF;

  INSERT INTO hr.salary_level_history (
    tenant_id,
    employee_id,
    salary_range_level_id,
    salary_reference_id,
    level_code,
    level_description,
    adjustment_amount,
    effective_on,
    vigencia_inicio,
    vigencia_fim,
    vencimento_basico,
    motivo,
    lei_referencia
  )
  VALUES (
    NEW.tenant_id,
    NEW.employee_id,
    NULL::uuid,
    NEW.target_salary_reference_id,
    v_level_code,
    v_level_name,
    0,
    NEW.data_efeito,
    NEW.data_efeito,
    NULL,
    v_target_salary,
    'reestruturacao',
    COALESCE(NEW.appointment_act, '')
  )
  ON CONFLICT DO NOTHING;

  UPDATE hr.employee
  SET salary_range_level_id = NEW.target_salary_range_level_id,
    salary_reference_id = COALESCE(NEW.target_salary_reference_id, salary_reference_id),
    updated_at = now()
  WHERE id = NEW.employee_id
    AND tenant_id = NEW.tenant_id;

  NEW.applied_at = COALESCE(NEW.applied_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_merit_progression ON hr.merit_progression;
CREATE TRIGGER trg_apply_merit_progression
  BEFORE UPDATE OF status ON hr.merit_progression
  FOR EACH ROW
  EXECUTE FUNCTION avaliacao.apply_merit_progression();

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('avaliacao.progressao.read', 'avaliacao', 'progressao', 'read', '/api/v1/avaliacao/progression/**', 'Read functional progression records.'),
  ('avaliacao.progressao.simulate', 'avaliacao', 'progressao', 'simulate', '/api/v1/avaliacao/progression/**/simulate', 'Simulate functional progression salary impact.'),
  ('avaliacao.progressao.apply', 'avaliacao', 'progressao', 'apply', '/api/v1/avaliacao/progression/**/apply', 'Apply functional progression to the employee current salary level.'),
  ('avaliacao.progressao.revoke', 'avaliacao', 'progressao', 'revoke', '/api/v1/avaliacao/progression/**/revoke', 'Revoke non-retroactive functional progression records.')
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT ap.id, p.id, true
FROM public.access_profile ap
CROSS JOIN public.permission p
WHERE ap.code IN ('ADMIN', 'RH_OPERADOR', 'FOLHA_OPERADOR', 'AUDITOR')
  AND p.key = 'avaliacao.progressao.read'
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT ap.id, p.id, true
FROM public.access_profile ap
CROSS JOIN public.permission p
WHERE ap.code IN ('ADMIN', 'RH_OPERADOR', 'FOLHA_OPERADOR')
  AND p.key IN ('avaliacao.progressao.simulate', 'avaliacao.progressao.apply')
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT ap.id, p.id, true
FROM public.access_profile ap
CROSS JOIN public.permission p
WHERE ap.code = 'ADMIN'
  AND p.key = 'avaliacao.progressao.revoke'
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

ALTER TABLE hr.merit_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.merit_progression FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.salary_simulation ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.salary_simulation FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merit_progression_select ON hr.merit_progression;
DROP POLICY IF EXISTS merit_progression_write ON hr.merit_progression;
CREATE POLICY merit_progression_select ON hr.merit_progression
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'avaliacao.progressao.read',
        'avaliacao.progressao.simulate',
        'avaliacao.progressao.apply',
        'avaliacao.progressao.revoke'
      ])
    )
  );
CREATE POLICY merit_progression_write ON hr.merit_progression
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'avaliacao.progressao.simulate',
        'avaliacao.progressao.apply',
        'avaliacao.progressao.revoke'
      ])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'avaliacao.progressao.simulate',
        'avaliacao.progressao.apply',
        'avaliacao.progressao.revoke'
      ])
    )
  );

DROP POLICY IF EXISTS salary_simulation_select ON hr.salary_simulation;
DROP POLICY IF EXISTS salary_simulation_write ON hr.salary_simulation;
CREATE POLICY salary_simulation_select ON hr.salary_simulation
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'avaliacao.progressao.read',
        'avaliacao.progressao.simulate',
        'avaliacao.progressao.apply',
        'avaliacao.progressao.revoke'
      ])
    )
  );
CREATE POLICY salary_simulation_write ON hr.salary_simulation
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.progressao.simulate'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.progressao.simulate'])
    )
  );
