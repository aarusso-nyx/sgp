-- XCUT-03: strict RLS hardening for dependent PII and payroll formula cache.

ALTER TABLE IF EXISTS hr.employee_dependent ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hr.employee_dependent FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_dependent_select ON hr.employee_dependent;
DROP POLICY IF EXISTS employee_dependent_write ON hr.employee_dependent;
DROP POLICY IF EXISTS p_employee_dependent_rw ON hr.employee_dependent;
CREATE POLICY p_employee_dependent_rw ON hr.employee_dependent
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['rh.employee.read'])
    )
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.employee.write'])
  );

CREATE SCHEMA IF NOT EXISTS payroll_calc;

CREATE TABLE IF NOT EXISTS payroll_calc.formula_cache (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  earning_deduction_id uuid NOT NULL REFERENCES payroll.payroll_earning_deduction(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE,
  competence_month integer NOT NULL CHECK (competence_month BETWEEN 1 AND 12),
  competence_year integer NOT NULL,
  amount numeric(14, 2) NOT NULL,
  signal smallint NOT NULL DEFAULT 0 CHECK (signal IN (-1, 0, 1)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (earning_deduction_id, employee_id, competence_month, competence_year)
);

ALTER TABLE payroll_calc.formula_cache
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE payroll_calc.formula_cache cache
SET tenant_id = earning.tenant_id
FROM payroll.payroll_earning_deduction earning
WHERE cache.tenant_id IS NULL
  AND cache.earning_deduction_id = earning.id;

UPDATE payroll_calc.formula_cache cache
SET tenant_id = employee.tenant_id
FROM hr.employee employee
WHERE cache.tenant_id IS NULL
  AND cache.employee_id = employee.id;

ALTER TABLE payroll_calc.formula_cache
  ALTER COLUMN tenant_id SET DEFAULT public.sgp_current_tenant_uuid(),
  ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'payroll_calc.formula_cache'::regclass
      AND conname = 'fk_formula_cache_tenant'
  ) THEN
    ALTER TABLE payroll_calc.formula_cache
      ADD CONSTRAINT fk_formula_cache_tenant
      FOREIGN KEY (tenant_id)
      REFERENCES public.tenant(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS formula_cache_tenant_updated_at_idx
  ON payroll_calc.formula_cache (tenant_id, updated_at DESC);

ALTER TABLE payroll_calc.formula_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calc.formula_cache FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_formula_cache_rw ON payroll_calc.formula_cache;
CREATE POLICY p_formula_cache_rw ON payroll_calc.formula_cache
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['folha.calc.read'])
    )
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['folha.calc.write'])
  );
