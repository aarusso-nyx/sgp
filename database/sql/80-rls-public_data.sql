ALTER TABLE ONLY public_data.transparency_access_log FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public_data.transparency_payroll_snapshot FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public_data.transparency_publish_event FORCE ROW LEVEL SECURITY;

ALTER TABLE public_data.transparency_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY transparency_access_log_write ON public_data.transparency_access_log FOR INSERT WITH CHECK ((public.sgp_bypass_rls() OR public.sgp_tenant_matches(tenant_id)));

ALTER TABLE public_data.transparency_payroll_snapshot ENABLE ROW LEVEL SECURITY;

ALTER TABLE public_data.transparency_publish_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY transparency_publish_event_select ON public_data.transparency_publish_event FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text]))));

CREATE POLICY transparency_publish_event_write ON public_data.transparency_publish_event USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text]))));

CREATE POLICY transparency_snapshot_public_read ON public_data.transparency_payroll_snapshot FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['public.read'::text, 'transparency.publish'::text]))));
