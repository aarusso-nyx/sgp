CREATE SCHEMA IF NOT EXISTS avaliacao;

CREATE TABLE IF NOT EXISTS avaliacao.career_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  name text NOT NULL,
  instituting_law text NOT NULL,
  starts_on date NOT NULL,
  ends_on date,
  class_count integer NOT NULL,
  reference_count integer NOT NULL,
  progression_rule text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_plan_class_count_positive CHECK (class_count > 0),
  CONSTRAINT career_plan_reference_count_positive CHECK (reference_count > 0),
  CONSTRAINT career_plan_dates_valid CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

ALTER TABLE avaliacao.career_plan
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenant(id),
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS instituting_law text,
  ADD COLUMN IF NOT EXISTS starts_on date,
  ADD COLUMN IF NOT EXISTS ends_on date,
  ADD COLUMN IF NOT EXISTS class_count integer,
  ADD COLUMN IF NOT EXISTS reference_count integer,
  ADD COLUMN IF NOT EXISTS progression_rule text,
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE avaliacao.career_plan
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN instituting_law SET NOT NULL,
  ALTER COLUMN starts_on SET NOT NULL,
  ALTER COLUMN class_count SET NOT NULL,
  ALTER COLUMN reference_count SET NOT NULL,
  ALTER COLUMN progression_rule SET NOT NULL,
  ALTER COLUMN active SET DEFAULT true,
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_plan_class_count_positive'
  ) THEN
    ALTER TABLE avaliacao.career_plan
      ADD CONSTRAINT career_plan_class_count_positive CHECK (class_count > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_plan_reference_count_positive'
  ) THEN
    ALTER TABLE avaliacao.career_plan
      ADD CONSTRAINT career_plan_reference_count_positive CHECK (reference_count > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_plan_dates_valid'
  ) THEN
    ALTER TABLE avaliacao.career_plan
      ADD CONSTRAINT career_plan_dates_valid CHECK (ends_on IS NULL OR ends_on >= starts_on);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS career_plan_tenant_name_starts_key
  ON avaliacao.career_plan(tenant_id, name, starts_on);
CREATE INDEX IF NOT EXISTS career_plan_tenant_active_idx
  ON avaliacao.career_plan(tenant_id, active, starts_on);

CREATE TABLE IF NOT EXISTS avaliacao.career_plan_job_position (
  career_plan_id uuid NOT NULL REFERENCES avaliacao.career_plan(id) ON DELETE CASCADE,
  job_position_id uuid NOT NULL REFERENCES hr.job_position(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (career_plan_id, job_position_id)
);

CREATE INDEX IF NOT EXISTS career_plan_job_position_tenant_idx
  ON avaliacao.career_plan_job_position(tenant_id);
CREATE INDEX IF NOT EXISTS career_plan_job_position_job_idx
  ON avaliacao.career_plan_job_position(job_position_id);

ALTER TABLE hr.salary_range
  ADD COLUMN IF NOT EXISTS career_plan_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_range_career_plan_id_fkey'
  ) THEN
    ALTER TABLE hr.salary_range
      ADD CONSTRAINT salary_range_career_plan_id_fkey
      FOREIGN KEY (career_plan_id) REFERENCES avaliacao.career_plan(id) ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS salary_range_career_plan_idx
  ON hr.salary_range(career_plan_id);

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('avaliacao.pccs.read', 'avaliacao', 'pccs', 'read', '/api/v1/avaliacao/career-plan/**', 'Read PCCS career plans and progression trails.'),
  ('avaliacao.pccs.write', 'avaliacao', 'pccs', 'write', '/api/v1/avaliacao/career-plan/**', 'Mutate PCCS career plans and job-position links.')
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
  AND ap.tenant_id = public.sgp_current_tenant_uuid()
  AND p.key = 'avaliacao.pccs.read'
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT ap.id, p.id, true
FROM public.access_profile ap
CROSS JOIN public.permission p
WHERE ap.code IN ('ADMIN', 'RH_OPERADOR')
  AND ap.tenant_id = public.sgp_current_tenant_uuid()
  AND p.key = 'avaliacao.pccs.write'
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

ALTER TABLE avaliacao.career_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao.career_plan FORCE ROW LEVEL SECURITY;
ALTER TABLE avaliacao.career_plan_job_position ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao.career_plan_job_position FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS career_plan_select ON avaliacao.career_plan;
CREATE POLICY career_plan_select ON avaliacao.career_plan
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.read', 'avaliacao.pccs.write'])
    )
  );

DROP POLICY IF EXISTS career_plan_write ON avaliacao.career_plan;
CREATE POLICY career_plan_write ON avaliacao.career_plan
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'])
    )
  );

DROP POLICY IF EXISTS career_plan_job_position_select ON avaliacao.career_plan_job_position;
CREATE POLICY career_plan_job_position_select ON avaliacao.career_plan_job_position
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.read', 'avaliacao.pccs.write'])
    )
  );

DROP POLICY IF EXISTS career_plan_job_position_write ON avaliacao.career_plan_job_position;
CREATE POLICY career_plan_job_position_write ON avaliacao.career_plan_job_position
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'])
    )
  );
