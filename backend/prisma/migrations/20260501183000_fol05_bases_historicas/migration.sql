CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'salary_history_reason' AND typnamespace = 'hr'::regnamespace) THEN
    CREATE TYPE hr.salary_history_reason AS ENUM (
      'reajuste_data_base',
      'correcao',
      'reestruturacao'
    );
  END IF;
END
$$;

ALTER TABLE hr.salary_level_history
  ADD COLUMN IF NOT EXISTS salary_range_level_id uuid,
  ADD COLUMN IF NOT EXISTS vigencia_inicio date,
  ADD COLUMN IF NOT EXISTS vigencia_fim date,
  ADD COLUMN IF NOT EXISTS vencimento_basico numeric(14,2),
  ADD COLUMN IF NOT EXISTS motivo hr.salary_history_reason NOT NULL DEFAULT 'reajuste_data_base',
  ADD COLUMN IF NOT EXISTS lei_referencia text NOT NULL DEFAULT '';

UPDATE hr.salary_level_history
SET
  vigencia_inicio = COALESCE(vigencia_inicio, effective_on),
  vencimento_basico = COALESCE(vencimento_basico, adjustment_amount, 0)
WHERE vigencia_inicio IS NULL
   OR vencimento_basico IS NULL;

ALTER TABLE hr.salary_level_history
  ALTER COLUMN employee_id DROP NOT NULL,
  ALTER COLUMN vigencia_inicio SET NOT NULL,
  ALTER COLUMN vencimento_basico SET NOT NULL,
  ADD CONSTRAINT salary_level_history_vigencia_valid
    CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio),
  ADD CONSTRAINT salary_level_history_employee_or_level_required
    CHECK (employee_id IS NOT NULL OR salary_range_level_id IS NOT NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_level_history_salary_range_level_id_fkey'
  ) THEN
    ALTER TABLE hr.salary_level_history
      ADD CONSTRAINT salary_level_history_salary_range_level_id_fkey
      FOREIGN KEY (salary_range_level_id) REFERENCES hr.salary_range_level(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS salary_level_history_level_vigencia_idx
  ON hr.salary_level_history(tenant_id, salary_range_level_id, vigencia_inicio DESC)
  WHERE salary_range_level_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_level_history_level_vigencia_excl'
  ) THEN
    ALTER TABLE hr.salary_level_history
      ADD CONSTRAINT salary_level_history_level_vigencia_excl
      EXCLUDE USING gist (
        tenant_id WITH =,
        salary_range_level_id WITH =,
        daterange(vigencia_inicio, COALESCE(vigencia_fim, 'infinity'::date), '[]') WITH &&
      )
      WHERE (salary_range_level_id IS NOT NULL);
  END IF;
END
$$;

ALTER TABLE hr.salary_reference
  ADD COLUMN IF NOT EXISTS vigencia_inicio date NOT NULL DEFAULT DATE '1900-01-01',
  ADD COLUMN IF NOT EXISTS vigencia_fim date,
  ADD COLUMN IF NOT EXISTS motivo hr.salary_history_reason NOT NULL DEFAULT 'reajuste_data_base',
  ADD COLUMN IF NOT EXISTS lei_referencia text NOT NULL DEFAULT '';

ALTER TABLE hr.salary_reference
  ADD CONSTRAINT salary_reference_vigencia_valid
    CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio);

CREATE INDEX IF NOT EXISTS salary_reference_vigencia_idx
  ON hr.salary_reference(tenant_id, range_id, code, vigencia_inicio DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salary_reference_vigencia_excl'
  ) THEN
    ALTER TABLE hr.salary_reference
      ADD CONSTRAINT salary_reference_vigencia_excl
      EXCLUDE USING gist (
        tenant_id WITH =,
        code WITH =,
        daterange(vigencia_inicio, COALESCE(vigencia_fim, 'infinity'::date), '[]') WITH &&
      );
  END IF;
END
$$;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('avaliacao.salary_history.read', 'avaliacao', 'salary_history', 'read', '/api/v1/avaliacao/salary-history/**', 'Read historical salary bases.'),
  ('avaliacao.salary_history.write', 'avaliacao', 'salary_history', 'write', '/api/v1/avaliacao/salary-history/**', 'Apply mass salary-base adjustments.')
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
  AND p.key = 'avaliacao.salary_history.read'
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT ap.id, p.id, true
FROM public.access_profile ap
CROSS JOIN public.permission p
WHERE ap.code IN ('ADMIN', 'RH_OPERADOR', 'FOLHA_OPERADOR')
  AND p.key = 'avaliacao.salary_history.write'
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

ALTER TABLE hr.salary_level_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.salary_level_history FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.salary_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.salary_reference FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS salary_level_history_select ON hr.salary_level_history;
DROP POLICY IF EXISTS salary_level_history_write ON hr.salary_level_history;
DROP POLICY IF EXISTS fol05_salary_level_history_select ON hr.salary_level_history;
DROP POLICY IF EXISTS fol05_salary_level_history_write ON hr.salary_level_history;
CREATE POLICY fol05_salary_level_history_select ON hr.salary_level_history
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.read', 'avaliacao.salary_history.write'])
    )
  );
CREATE POLICY fol05_salary_level_history_write ON hr.salary_level_history
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.write'])
    )
  );

DROP POLICY IF EXISTS salary_reference_select ON hr.salary_reference;
DROP POLICY IF EXISTS salary_reference_write ON hr.salary_reference;
DROP POLICY IF EXISTS fol05_salary_reference_select ON hr.salary_reference;
DROP POLICY IF EXISTS fol05_salary_reference_write ON hr.salary_reference;
CREATE POLICY fol05_salary_reference_select ON hr.salary_reference
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.read', 'avaliacao.salary_history.write'])
    )
  );
CREATE POLICY fol05_salary_reference_write ON hr.salary_reference
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.write'])
    )
  );

INSERT INTO public.system_parameter (
  tenant_id, key, value, description, module_key
)
SELECT
  tenant.id,
  'global:reajuste.data_base_padrao',
  '{"month":1,"day":1,"lastAdjustmentId":null}'::jsonb,
  'Default annual salary adjustment date and last applied adjustment link.',
  'global'
FROM public.tenant
ON CONFLICT (tenant_id, key) DO NOTHING;
