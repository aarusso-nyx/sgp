ALTER TABLE ONLY payroll_calc.formula_cache FORCE ROW LEVEL SECURITY;

CREATE POLICY calc01_formula_cache_select ON payroll_calc.formula_cache FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.formula.read'::text, 'payroll.formula.write'::text]))));

CREATE POLICY calc01_formula_cache_write ON payroll_calc.formula_cache USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.formula.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.formula.write'::text]))));

ALTER TABLE payroll_calc.formula_cache ENABLE ROW LEVEL SECURITY;
