ALTER TABLE ONLY tce.adapter_circuit_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY tce.adapter_lifecycle_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY tce.adapter_registry FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY tce.layout_field FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY tce.layout_version FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY tce.state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY tce.submission FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY tce.submission_attempt FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY tce.submission_queue FORCE ROW LEVEL SECURITY;

ALTER TABLE tce.adapter_circuit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY adapter_circuit_state_select ON tce.adapter_circuit_state FOR SELECT USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.submission.read'::text, 'tce.submission.manage'::text])));

CREATE POLICY adapter_circuit_state_worker_write ON tce.adapter_circuit_state USING (public.sgp_bypass_rls()) WITH CHECK (public.sgp_bypass_rls());

ALTER TABLE tce.adapter_lifecycle_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY adapter_lifecycle_event_select ON tce.adapter_lifecycle_event FOR SELECT USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.adapter.read'::text, 'tce.adapter.manage'::text])));

CREATE POLICY adapter_lifecycle_event_worker_write ON tce.adapter_lifecycle_event USING (public.sgp_bypass_rls()) WITH CHECK (public.sgp_bypass_rls());

ALTER TABLE tce.adapter_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY adapter_registry_select ON tce.adapter_registry FOR SELECT USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.adapter.read'::text, 'tce.adapter.manage'::text])));

CREATE POLICY adapter_registry_worker_write ON tce.adapter_registry USING (public.sgp_bypass_rls()) WITH CHECK (public.sgp_bypass_rls());

ALTER TABLE tce.layout_field ENABLE ROW LEVEL SECURITY;

CREATE POLICY layout_field_select ON tce.layout_field FOR SELECT USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.read'::text, 'tce.catalog.manage'::text])));

CREATE POLICY layout_field_write ON tce.layout_field USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.manage'::text]))) WITH CHECK ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.manage'::text])));

ALTER TABLE tce.layout_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY layout_version_select ON tce.layout_version FOR SELECT USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.read'::text, 'tce.catalog.manage'::text])));

CREATE POLICY layout_version_write ON tce.layout_version USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.manage'::text]))) WITH CHECK ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.manage'::text])));

ALTER TABLE tce.state ENABLE ROW LEVEL SECURITY;

CREATE POLICY state_select ON tce.state FOR SELECT USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.read'::text, 'tce.catalog.manage'::text])));

CREATE POLICY state_write ON tce.state USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.manage'::text]))) WITH CHECK ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['tce.catalog.manage'::text])));

ALTER TABLE tce.submission ENABLE ROW LEVEL SECURITY;

ALTER TABLE tce.submission_attempt ENABLE ROW LEVEL SECURITY;

CREATE POLICY submission_attempt_select ON tce.submission_attempt FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.read'::text, 'tce.submission.manage'::text]))));

CREATE POLICY submission_attempt_write ON tce.submission_attempt USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.read'::text, 'tce.submission.manage'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.read'::text, 'tce.submission.manage'::text]))));

ALTER TABLE tce.submission_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY submission_queue_select ON tce.submission_queue FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.read'::text, 'tce.submission.manage'::text]))));

CREATE POLICY submission_queue_write ON tce.submission_queue USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.read'::text, 'tce.submission.manage'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.read'::text, 'tce.submission.manage'::text]))));

CREATE POLICY submission_select ON tce.submission FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.read'::text, 'tce.submission.manage'::text]))));

CREATE POLICY submission_write ON tce.submission USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.manage'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['tce.submission.manage'::text]))));
