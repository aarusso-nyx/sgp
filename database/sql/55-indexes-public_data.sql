CREATE INDEX transparency_access_log_tenant_accessed_idx ON public_data.transparency_access_log USING btree (tenant_id, accessed_at DESC);

CREATE INDEX transparency_snapshot_lookup_idx ON public_data.transparency_payroll_snapshot USING btree (tenant_id, competence DESC, organizational_unit, position_name);
