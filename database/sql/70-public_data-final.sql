CREATE INDEX transparency_access_log_tenant_accessed_idx ON public_data.transparency_access_log USING btree (tenant_id, accessed_at DESC);

CREATE INDEX transparency_snapshot_lookup_idx ON public_data.transparency_payroll_snapshot USING btree (tenant_id, competence DESC, organizational_unit, position_name);

CREATE INDEX lai_request_tenant_status_due_idx ON public_data.lai_request USING btree (tenant_id, status, due_at);

CREATE INDEX lai_request_event_request_idx ON public_data.lai_request_event USING btree (request_id, occurred_at);

ALTER TABLE ONLY public_data.transparency_access_log
    ADD CONSTRAINT transparency_access_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY public_data.transparency_payroll_snapshot
    ADD CONSTRAINT transparency_payroll_snapshot_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY public_data.transparency_publish_event
    ADD CONSTRAINT transparency_publish_event_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public_data.transparency_publish_event
    ADD CONSTRAINT transparency_publish_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY public_data.lai_request
    ADD CONSTRAINT lai_request_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY public_data.lai_request_event
    ADD CONSTRAINT lai_request_event_request_id_fkey FOREIGN KEY (request_id) REFERENCES public_data.lai_request(id) ON DELETE CASCADE;

ALTER TABLE ONLY public_data.lai_request_event
    ADD CONSTRAINT lai_request_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY public_data.transparency_access_log FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public_data.transparency_payroll_snapshot FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public_data.transparency_publish_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public_data.lai_request FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public_data.lai_request_event FORCE ROW LEVEL SECURITY;

ALTER TABLE public_data.transparency_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY transparency_access_log_write ON public_data.transparency_access_log FOR INSERT WITH CHECK ((public.sgp_bypass_rls() OR public.sgp_tenant_matches(tenant_id)));

ALTER TABLE public_data.transparency_payroll_snapshot ENABLE ROW LEVEL SECURITY;

ALTER TABLE public_data.transparency_publish_event ENABLE ROW LEVEL SECURITY;

ALTER TABLE public_data.lai_request ENABLE ROW LEVEL SECURITY;

ALTER TABLE public_data.lai_request_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY transparency_publish_event_select ON public_data.transparency_publish_event FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text]))));

CREATE POLICY transparency_publish_event_write ON public_data.transparency_publish_event USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text]))));

CREATE POLICY transparency_snapshot_public_read ON public_data.transparency_payroll_snapshot FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['public.read'::text, 'transparency.publish'::text]))));

CREATE POLICY lai_request_operator_read ON public_data.lai_request FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text]))));

CREATE POLICY lai_request_operator_write ON public_data.lai_request USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text]))));

CREATE POLICY lai_request_event_operator_read ON public_data.lai_request_event FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text]))));

CREATE POLICY lai_request_event_operator_write ON public_data.lai_request_event USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['transparency.publish'::text]))));

CREATE TRIGGER lai_request_audit AFTER INSERT OR DELETE OR UPDATE ON public_data.lai_request FOR EACH ROW EXECUTE FUNCTION public_data.sgp_lai_request_audit();
