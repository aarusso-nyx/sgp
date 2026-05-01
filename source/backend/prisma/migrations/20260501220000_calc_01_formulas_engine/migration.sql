CREATE SCHEMA IF NOT EXISTS payroll_calc;

ALTER TABLE payroll.payroll_earning_deduction
  ADD COLUMN IF NOT EXISTS formula_version integer NOT NULL DEFAULT 1;

DROP TABLE IF EXISTS payroll_calc.formula_cache CASCADE;
CREATE TABLE payroll_calc.formula_cache (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  earning_deduction_id uuid NOT NULL REFERENCES payroll.payroll_earning_deduction(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  compiled_sql text NOT NULL,
  compiled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, earning_deduction_id, version)
);

CREATE INDEX formula_cache_compiled_at_idx
  ON payroll_calc.formula_cache (tenant_id, compiled_at DESC);

ALTER TABLE payroll_calc.formula_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calc.formula_cache FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_formula_cache_rw ON payroll_calc.formula_cache;
DROP POLICY IF EXISTS calc01_formula_cache_select ON payroll_calc.formula_cache;
DROP POLICY IF EXISTS calc01_formula_cache_write ON payroll_calc.formula_cache;
CREATE POLICY calc01_formula_cache_select ON payroll_calc.formula_cache
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.formula.read', 'payroll.formula.write'])
    )
  );
CREATE POLICY calc01_formula_cache_write ON payroll_calc.formula_cache
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.formula.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payroll.formula.write'])
    )
  );

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('payroll.formula.read', 'payroll', 'formula', 'read', '/api/v1/payroll-engine/formulas/**', 'Read compiled payroll formula definitions and cache metadata.'),
  ('payroll.formula.write', 'payroll', 'formula', 'write', '/api/v1/payroll-engine/formulas/**', 'Compile, invalidate, and maintain payroll formula definitions.')
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('FOLHA_OPERADOR', 'payroll.formula.read'),
    ('FOLHA_OPERADOR', 'payroll.formula.write'),
    ('AUDITOR', 'payroll.formula.read')
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

WITH canonical(code, description, value_type, default_value) AS (
  VALUES
    ('SALARIO_BASE', 'Salario base vigente do servidor', 'decimal', '0'),
    ('CARGA_HORARIA', 'Carga horaria diaria do turno do servidor', 'decimal', '0'),
    ('DEPENDENTES', 'Quantidade de dependentes de IRRF ativos', 'int', '0'),
    ('BASE_RPPS', 'Base previdenciaria RPPS da competencia', 'decimal', '0'),
    ('BASE_IRRF', 'Base de IRRF da competencia', 'decimal', '0'),
    ('TEMPO_SERVICO_ANOS', 'Tempo de servico em anos completos', 'int', '0')
)
INSERT INTO payroll.formula_attribute (
  tenant_id,
  code,
  description,
  name,
  data_type,
  value_type,
  default_value,
  required,
  source_scope,
  expression_hint,
  status
)
SELECT
  tenant.id,
  canonical.code,
  canonical.description,
  canonical.code,
  canonical.value_type,
  canonical.value_type::payroll.formula_attribute_value_type,
  canonical.default_value,
  true,
  'canonical',
  canonical.code,
  'ACTIVE'::"RecordStatus"
FROM public.tenant tenant
CROSS JOIN canonical
ON CONFLICT (tenant_id, code) DO UPDATE
SET
  description = EXCLUDED.description,
  name = EXCLUDED.name,
  data_type = EXCLUDED.data_type,
  value_type = EXCLUDED.value_type,
  default_value = EXCLUDED.default_value,
  required = EXCLUDED.required,
  source_scope = EXCLUDED.source_scope,
  expression_hint = EXCLUDED.expression_hint,
  status = EXCLUDED.status,
  updated_at = now();

CREATE OR REPLACE FUNCTION payroll_calc.on_earning_formula_cache_invalidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payroll_calc, payroll, public, pg_catalog
AS $$
BEGIN
  IF OLD.formula_expression IS DISTINCT FROM NEW.formula_expression
    OR OLD.formula_alias IS DISTINCT FROM NEW.formula_alias
  THEN
    DELETE FROM payroll_calc.formula_cache
    WHERE tenant_id = OLD.tenant_id
      AND earning_deduction_id = OLD.id
      AND version = OLD.formula_version;

    PERFORM public.sgp_append_audit_event(
      'UPDATE',
      'payroll.formula',
      OLD.id::text,
      NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'payroll_calc.formula_cache',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object(
        'event', 'payroll.formula.cache_invalidated',
        'earningDeductionId', OLD.id::text,
        'previousVersion', OLD.formula_version,
        'currentVersion', NEW.formula_version
      ),
      NULL::text,
      NULL::text,
      NULL::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_earning_formula_cache_invalidate ON payroll.payroll_earning_deduction;
CREATE TRIGGER trg_earning_formula_cache_invalidate
AFTER UPDATE OF formula_alias, formula_expression, formula_version
ON payroll.payroll_earning_deduction
FOR EACH ROW
EXECUTE FUNCTION payroll_calc.on_earning_formula_cache_invalidate();

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
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'fol01_' || table_name || '_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'fol01_' || table_name || '_write', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.read'', ''folha.rubrica.write'', ''folha.rubrica.preview'', ''payroll.formula.read'', ''payroll.formula.write''])))',
      'fol01_' || table_name || '_select',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.write'', ''payroll.formula.write'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.rubrica.write'', ''payroll.formula.write''])))',
      'fol01_' || table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;
