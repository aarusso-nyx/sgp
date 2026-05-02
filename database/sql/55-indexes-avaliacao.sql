CREATE INDEX career_plan_job_position_job_idx ON avaliacao.career_plan_job_position USING btree (job_position_id);

CREATE INDEX career_plan_job_position_tenant_idx ON avaliacao.career_plan_job_position USING btree (tenant_id);

CREATE INDEX career_plan_tenant_active_idx ON avaliacao.career_plan USING btree (tenant_id, active, starts_on);

CREATE UNIQUE INDEX career_plan_tenant_name_starts_key ON avaliacao.career_plan USING btree (tenant_id, name, starts_on);
