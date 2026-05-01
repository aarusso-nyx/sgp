-- XCUT-03: strict RLS hardening for dependent PII and payroll formula cache.

ALTER TABLE IF EXISTS hr.employee_dependent ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hr.employee_dependent FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_dependent_select ON hr.employee_dependent;
DROP POLICY IF EXISTS employee_dependent_write ON hr.employee_dependent;
DROP POLICY IF EXISTS p_employee_dependent_rw ON hr.employee_dependent;
CREATE POLICY p_employee_dependent_rw ON hr.employee_dependent
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.dependent.read', 'rh.dependent.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.dependent.write'])
  );

CREATE SCHEMA IF NOT EXISTS payroll_calc;

DROP TABLE IF EXISTS payroll_calc.formula_cache CASCADE;
CREATE TABLE payroll_calc.formula_cache (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  earning_deduction_id uuid NOT NULL REFERENCES payroll.payroll_earning_deduction(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  compiled_sql text NOT NULL,
  compiled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, earning_deduction_id, version)
);

CREATE INDEX IF NOT EXISTS formula_cache_tenant_updated_at_idx
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
