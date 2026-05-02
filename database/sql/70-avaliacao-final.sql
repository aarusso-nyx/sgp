CREATE INDEX career_plan_job_position_job_idx ON avaliacao.career_plan_job_position USING btree (job_position_id);

CREATE INDEX career_plan_job_position_tenant_idx ON avaliacao.career_plan_job_position USING btree (tenant_id);

CREATE INDEX career_plan_tenant_active_idx ON avaliacao.career_plan USING btree (tenant_id, active, starts_on);

CREATE UNIQUE INDEX career_plan_tenant_name_starts_key ON avaliacao.career_plan USING btree (tenant_id, name, starts_on);

ALTER TABLE ONLY avaliacao.career_plan_job_position
    ADD CONSTRAINT career_plan_job_position_career_plan_id_fkey FOREIGN KEY (career_plan_id) REFERENCES avaliacao.career_plan(id) ON DELETE CASCADE;

ALTER TABLE ONLY avaliacao.career_plan_job_position
    ADD CONSTRAINT career_plan_job_position_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES hr.job_position(id) ON DELETE RESTRICT;

ALTER TABLE ONLY avaliacao.career_plan_job_position
    ADD CONSTRAINT career_plan_job_position_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY avaliacao.career_plan
    ADD CONSTRAINT career_plan_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY avaliacao.career_plan FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY avaliacao.career_plan_job_position FORCE ROW LEVEL SECURITY;

ALTER TABLE avaliacao.career_plan ENABLE ROW LEVEL SECURITY;

ALTER TABLE avaliacao.career_plan_job_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_plan_job_position_select ON avaliacao.career_plan_job_position FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.read'::text, 'avaliacao.pccs.write'::text]))));

CREATE POLICY career_plan_job_position_write ON avaliacao.career_plan_job_position USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'::text]))));

CREATE POLICY career_plan_select ON avaliacao.career_plan FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.read'::text, 'avaliacao.pccs.write'::text]))));

CREATE POLICY career_plan_write ON avaliacao.career_plan USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'::text]))));
