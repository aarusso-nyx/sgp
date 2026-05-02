ALTER TABLE ONLY payroll_calc.formula_cache
    ADD CONSTRAINT formula_cache_pkey PRIMARY KEY (tenant_id, earning_deduction_id, version);
