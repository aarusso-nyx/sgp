CREATE TYPE hr.job_position_category AS ENUM (
  'efetivo',
  'comissionado',
  'temporario',
  'eletivo',
  'emprego_publico'
);

ALTER TABLE hr.job_position
  ADD COLUMN IF NOT EXISTS category hr.job_position_category NOT NULL DEFAULT 'efetivo',
  ADD COLUMN IF NOT EXISTS legal_regime text NOT NULL DEFAULT 'estatutario',
  ADD COLUMN IF NOT EXISTS creation_law text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vacancies_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary_range_id uuid;

ALTER TABLE hr.job_position
  ADD CONSTRAINT job_position_vacancies_count_non_negative CHECK (vacancies_count >= 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_position_salary_range_fkey'
  ) THEN
    ALTER TABLE hr.job_position
      ADD CONSTRAINT job_position_salary_range_fkey
      FOREIGN KEY (salary_range_id) REFERENCES hr.salary_range(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS job_position_salary_range_idx
  ON hr.job_position(salary_range_id);

ALTER TABLE hr.salary_range
  ADD COLUMN IF NOT EXISTS starts_on date NOT NULL DEFAULT DATE '1900-01-01',
  ADD COLUMN IF NOT EXISTS ends_on date;

ALTER TABLE hr.salary_range_level
  ADD COLUMN IF NOT EXISTS class_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS level_number_fol02 integer,
  ADD COLUMN IF NOT EXISTS base_salary numeric(14,2);

UPDATE hr.salary_range_level
SET
  level_number_fol02 = COALESCE(level_number_fol02, level_number),
  base_salary = COALESCE(base_salary, amount_override, 0)
WHERE level_number_fol02 IS NULL
   OR base_salary IS NULL;

ALTER TABLE hr.salary_range_level
  ALTER COLUMN level_number_fol02 SET NOT NULL,
  ALTER COLUMN base_salary SET NOT NULL,
  ADD CONSTRAINT salary_range_level_class_positive CHECK (class_number > 0),
  ADD CONSTRAINT salary_range_level_level_positive CHECK (level_number_fol02 > 0),
  ADD CONSTRAINT salary_range_level_base_salary_non_negative CHECK (base_salary >= 0);

DROP INDEX IF EXISTS hr.salary_range_level_tenant_salary_range_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS salary_range_level_tenant_range_class_level_key
  ON hr.salary_range_level(tenant_id, salary_range_id, class_number, level_number_fol02);

INSERT INTO public.permission (
  key, module_key, resource_key, action_key, route_pattern, description
) VALUES
  ('gestao.cargo.read', 'gestao', 'cargo', 'read', '/api/v1/gestao/cargos/**', 'Read job positions and salary range grids.'),
  ('gestao.cargo.write', 'gestao', 'cargo', 'write', '/api/v1/gestao/cargos/**', 'Mutate job positions and salary range grids.')
ON CONFLICT (key) DO UPDATE SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('RH_OPERADOR', 'gestao.cargo.read'),
    ('RH_OPERADOR', 'gestao.cargo.write'),
    ('FOLHA_OPERADOR', 'gestao.cargo.read'),
    ('AUDITOR', 'gestao.cargo.read')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile
  ON access_profile.code = profile_permissions.profile_code
 AND access_profile.tenant_id = public.sgp_current_tenant_uuid()
JOIN public.permission
  ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['job_position', 'salary_range', 'salary_range_level']
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'fol02_' || table_name || '_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'fol02_' || table_name || '_write', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.cargo.read'', ''gestao.cargo.write''])))',
      'fol02_' || table_name || '_select',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.cargo.write'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.cargo.write''])))',
      'fol02_' || table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;
