CREATE TABLE payroll_calc.formula_cache (
    tenant_id uuid NOT NULL,
    earning_deduction_id uuid NOT NULL,
    version integer NOT NULL,
    compiled_sql text NOT NULL,
    compiled_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT formula_cache_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY payroll_calc.formula_cache
    ADD CONSTRAINT formula_cache_pkey PRIMARY KEY (tenant_id, earning_deduction_id, version);
