CREATE UNIQUE INDEX mv_employee_directory_id_idx ON portal.mv_employee_directory USING btree (id);

CREATE INDEX mv_employee_directory_tenant_id_idx ON portal.mv_employee_directory USING btree (tenant_id, id);

CREATE INDEX mv_employee_directory_tenant_slug_idx ON portal.mv_employee_directory USING btree (tenant_slug, id);

CREATE UNIQUE INDEX mv_payroll_run_summary_id_idx ON portal.mv_payroll_run_summary USING btree (id);

CREATE INDEX mv_payroll_run_summary_tenant_id_idx ON portal.mv_payroll_run_summary USING btree (tenant_id, id);

CREATE INDEX mv_payroll_run_summary_tenant_slug_idx ON portal.mv_payroll_run_summary USING btree (tenant_slug, id);
