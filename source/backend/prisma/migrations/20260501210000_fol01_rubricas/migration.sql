DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'payroll' AND t.typname = 'formula_attribute_value_type'
  ) THEN
    CREATE TYPE payroll.formula_attribute_value_type AS ENUM (
      'decimal',
      'int',
      'bool',
      'date',
      'text'
    );
  END IF;
END
$$;

ALTER TABLE payroll.payroll_earning_deduction
  ADD COLUMN IF NOT EXISTS incidences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS starts_on date NOT NULL DEFAULT DATE '1900-01-01',
  ADD COLUMN IF NOT EXISTS ends_on date,
  ADD COLUMN IF NOT EXISTS esocial_code text,
  ADD COLUMN IF NOT EXISTS official_rubric_code text;

COMMENT ON COLUMN payroll.payroll_earning_deduction.incidences
  IS 'Payroll incidence flags for IRRF, INSS, FGTS, RPPS, and employer contribution.';
COMMENT ON COLUMN payroll.payroll_earning_deduction.esocial_code
  IS 'eSocial S-1010 rubric code when applicable.';
COMMENT ON COLUMN payroll.payroll_earning_deduction.official_rubric_code
  IS 'Official rubric code required by the local legal/payroll catalog when applicable.';

ALTER TABLE payroll.formula_attribute
  ADD COLUMN IF NOT EXISTS earning_deduction_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS value_type payroll.formula_attribute_value_type,
  ADD COLUMN IF NOT EXISTS default_value text,
  ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false;

UPDATE payroll.formula_attribute
SET
  name = COALESCE(name, NULLIF(description, ''), code),
  value_type = COALESCE(
    value_type,
    CASE lower(data_type)
      WHEN 'decimal' THEN 'decimal'::payroll.formula_attribute_value_type
      WHEN 'number' THEN 'decimal'::payroll.formula_attribute_value_type
      WHEN 'int' THEN 'int'::payroll.formula_attribute_value_type
      WHEN 'integer' THEN 'int'::payroll.formula_attribute_value_type
      WHEN 'bool' THEN 'bool'::payroll.formula_attribute_value_type
      WHEN 'boolean' THEN 'bool'::payroll.formula_attribute_value_type
      WHEN 'date' THEN 'date'::payroll.formula_attribute_value_type
      ELSE 'text'::payroll.formula_attribute_value_type
    END
  )
WHERE name IS NULL
   OR value_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'formula_attribute_earning_deduction_id_fkey'
  ) THEN
    ALTER TABLE payroll.formula_attribute
      ADD CONSTRAINT formula_attribute_earning_deduction_id_fkey
      FOREIGN KEY (earning_deduction_id)
      REFERENCES payroll.payroll_earning_deduction(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS formula_attribute_earning_deduction_idx
  ON payroll.formula_attribute(earning_deduction_id);
CREATE UNIQUE INDEX IF NOT EXISTS formula_attribute_tenant_earning_name_key
  ON payroll.formula_attribute(tenant_id, earning_deduction_id, name)
  WHERE earning_deduction_id IS NOT NULL;

ALTER TABLE payroll.job_position_earning
  ADD COLUMN IF NOT EXISTS application_condition text NOT NULL DEFAULT '';

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('folha.rubrica.read', 'folha', 'rubrica', 'read', '/api/v1/folha/rubrica/**', 'Read payroll rubrics, formulas, attributes, and job-position links.'),
  ('folha.rubrica.write', 'folha', 'rubrica', 'write', '/api/v1/folha/rubrica/**', 'Mutate payroll rubrics, formulas, attributes, and job-position links.'),
  ('folha.rubrica.preview', 'folha', 'rubrica', 'preview', '/api/v1/folha/rubrica/*/preview', 'Preview compiled payroll rubric values for an employee and competence.')
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('FOLHA_OPERADOR', 'folha.rubrica.read'),
    ('FOLHA_OPERADOR', 'folha.rubrica.write'),
    ('FOLHA_OPERADOR', 'folha.rubrica.preview'),
    ('AUDITOR', 'folha.rubrica.read'),
    ('RH_OPERADOR', 'folha.rubrica.read')
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
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_earning_deduction',
    'formula_attribute',
    'job_position_earning'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', table_name || '_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', table_name || '_write', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'fol01_' || table_name || '_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'fol01_' || table_name || '_write', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.read'', ''folha.rubrica.write'', ''folha.rubrica.preview''])))',
      'fol01_' || table_name || '_select',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.write'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.write''])))',
      'fol01_' || table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;
