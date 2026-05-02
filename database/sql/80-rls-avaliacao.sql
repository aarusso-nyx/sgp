ALTER TABLE ONLY avaliacao.career_plan FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY avaliacao.career_plan_job_position FORCE ROW LEVEL SECURITY;

ALTER TABLE avaliacao.career_plan ENABLE ROW LEVEL SECURITY;

ALTER TABLE avaliacao.career_plan_job_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_plan_job_position_select ON avaliacao.career_plan_job_position FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.read'::text, 'avaliacao.pccs.write'::text]))));

CREATE POLICY career_plan_job_position_write ON avaliacao.career_plan_job_position USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'::text]))));

CREATE POLICY career_plan_select ON avaliacao.career_plan FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.read'::text, 'avaliacao.pccs.write'::text]))));

CREATE POLICY career_plan_write ON avaliacao.career_plan USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'::text]))));
