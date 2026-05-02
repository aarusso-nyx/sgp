ALTER TABLE ONLY esocial.endpoint_circuit_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.esocial_totalizer FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.event_retry_schedule FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1200_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1210_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1299_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1xxx_dispatch_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2200_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2205_pending_alteration FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2210_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2220_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2230_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2240_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2298_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2299_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2306_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s3000_request FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.submission_batch FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.tenant_certificate FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.xsd_validation_failure FORCE ROW LEVEL SECURITY;

ALTER TABLE esocial.endpoint_circuit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY endpoint_circuit_state_select ON esocial.endpoint_circuit_state FOR SELECT USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['esocial.submission.read'::text, 'esocial.submission.retry'::text])));

CREATE POLICY endpoint_circuit_state_worker_write ON esocial.endpoint_circuit_state USING (public.sgp_bypass_rls()) WITH CHECK (public.sgp_bypass_rls());

ALTER TABLE esocial.esocial_totalizer ENABLE ROW LEVEL SECURITY;

CREATE POLICY esocial_totalizer_select ON esocial.esocial_totalizer FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY esocial_totalizer_write ON esocial.esocial_totalizer USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.event_retry_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_retry_schedule_select ON esocial.event_retry_schedule FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.retry'::text]))));

CREATE POLICY event_retry_schedule_write ON esocial.event_retry_schedule USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.retry'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.retry'::text]))));

CREATE POLICY p_s2230_pending_select ON esocial.s2230_pending FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY p_s2230_pending_write ON esocial.s2230_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

CREATE POLICY p_s2299_pending_select ON esocial.s2299_pending FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY p_s2299_pending_write ON esocial.s2299_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1200_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1200_emission_state_select ON esocial.s1200_emission_state FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s1200_emission_state_write ON esocial.s1200_emission_state USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1210_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1210_emission_state_select ON esocial.s1210_emission_state FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s1210_emission_state_write ON esocial.s1210_emission_state USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1299_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1299_emission_state_select ON esocial.s1299_emission_state FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s1299_emission_state_write ON esocial.s1299_emission_state USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1xxx_dispatch_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1xxx_dispatch_state_select ON esocial.s1xxx_dispatch_state FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text]))));

CREATE POLICY s1xxx_dispatch_state_write ON esocial.s1xxx_dispatch_state USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))));

ALTER TABLE esocial.s2200_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2200_emission_state_select ON esocial.s2200_emission_state FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text]))));

CREATE POLICY s2200_emission_state_write ON esocial.s2200_emission_state USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))));

ALTER TABLE esocial.s2205_pending_alteration ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2205_pending_alteration_select ON esocial.s2205_pending_alteration FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text]))));

CREATE POLICY s2205_pending_alteration_write ON esocial.s2205_pending_alteration USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))));

ALTER TABLE esocial.s2210_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2210_pending_select ON esocial.s2210_pending FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.read'::text, 'saude.cat.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s2210_pending_write ON esocial.s2210_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.write'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.write'::text, 'esocial.event.write'::text])));

ALTER TABLE esocial.s2220_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2220_pending_select ON esocial.s2220_pending FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s2220_pending_write ON esocial.s2220_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s2230_pending ENABLE ROW LEVEL SECURITY;

ALTER TABLE esocial.s2240_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2240_pending_rw ON esocial.s2240_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.write'::text, 'esocial.event.write'::text])));

ALTER TABLE esocial.s2298_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2298_event_read ON esocial.s2298_event FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s2298_event_write ON esocial.s2298_event USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

ALTER TABLE esocial.s2299_pending ENABLE ROW LEVEL SECURITY;

ALTER TABLE esocial.s2306_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2306_event_read ON esocial.s2306_event FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.read'::text, 'hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s2306_event_write ON esocial.s2306_event USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.write'::text])));

ALTER TABLE esocial.s3000_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY s3000_request_select ON esocial.s3000_request FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.exclude'::text]))));

CREATE POLICY s3000_request_write ON esocial.s3000_request USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.exclude'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.exclude'::text]))));

ALTER TABLE esocial.submission_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY submission_batch_select ON esocial.submission_batch FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.submission.read'::text, 'esocial.submission.retry'::text]))));

CREATE POLICY submission_batch_write ON esocial.submission_batch USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.submission.retry'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.submission.retry'::text]))));

ALTER TABLE esocial.tenant_certificate ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_certificate_select ON esocial.tenant_certificate FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.read'::text, 'esocial.certificate.write'::text]))));

CREATE POLICY tenant_certificate_write ON esocial.tenant_certificate USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'::text]))));

ALTER TABLE esocial.xsd_validation_failure ENABLE ROW LEVEL SECURITY;

CREATE POLICY xsd_validation_failure_select ON esocial.xsd_validation_failure FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.read'::text, 'esocial.certificate.write'::text]))));

CREATE POLICY xsd_validation_failure_write ON esocial.xsd_validation_failure USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'::text]))));
