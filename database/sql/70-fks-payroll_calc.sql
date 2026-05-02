ALTER TABLE ONLY payroll_calc.formula_cache
    ADD CONSTRAINT formula_cache_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON DELETE CASCADE;

ALTER TABLE ONLY payroll_calc.formula_cache
    ADD CONSTRAINT formula_cache_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;
