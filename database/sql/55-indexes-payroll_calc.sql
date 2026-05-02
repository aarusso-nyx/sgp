CREATE INDEX formula_cache_tenant_updated_at_idx ON payroll_calc.formula_cache USING btree (tenant_id, compiled_at DESC);

CREATE INDEX formula_cache_updated_at_idx ON payroll_calc.formula_cache USING btree (compiled_at DESC);
