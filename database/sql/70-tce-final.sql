CREATE INDEX adapter_lifecycle_event_adapter_time_idx ON tce.adapter_lifecycle_event USING btree (adapter_id, occurred_at DESC);

CREATE INDEX adapter_registry_state_organ_idx ON tce.adapter_registry USING btree (state_code, organ_kind, status);

CREATE INDEX layout_field_version_order_idx ON tce.layout_field USING btree (layout_version_id, ordering, field_path);

CREATE INDEX layout_version_state_system_idx ON tce.layout_version USING btree (state_id, system_name, status, effective_from);

CREATE INDEX submission_adapter_status_idx ON tce.submission USING btree (adapter_id, status);

CREATE INDEX submission_attempt_queue_idx ON tce.submission_attempt USING btree (queue_id, started_at DESC);

CREATE INDEX submission_payroll_run_idx ON tce.submission USING btree (payroll_run_id);

CREATE INDEX submission_queue_claim_idx ON tce.submission_queue USING btree (status, next_attempt_at);

CREATE INDEX submission_queue_submission_idx ON tce.submission_queue USING btree (submission_id);

CREATE INDEX submission_queue_tenant_adapter_idx ON tce.submission_queue USING btree (tenant_id, adapter_id, created_at DESC);

CREATE INDEX submission_tenant_competence_idx ON tce.submission USING btree (tenant_id, competence_year DESC, competence_month DESC);

CREATE TRIGGER adapter_circuit_state_touch_updated_at BEFORE UPDATE ON tce.adapter_circuit_state FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_circuit_touch_updated_at();

CREATE TRIGGER adapter_lifecycle_event_audit AFTER INSERT OR DELETE OR UPDATE ON tce.adapter_lifecycle_event FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_adapter_audit();

CREATE TRIGGER adapter_registry_audit AFTER INSERT OR DELETE OR UPDATE ON tce.adapter_registry FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_adapter_audit();

CREATE TRIGGER layout_field_audit AFTER INSERT OR DELETE OR UPDATE ON tce.layout_field FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_audit();

CREATE TRIGGER layout_field_touch_updated_at BEFORE UPDATE ON tce.layout_field FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_touch_updated_at();

CREATE TRIGGER layout_version_audit AFTER INSERT OR DELETE OR UPDATE ON tce.layout_version FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_audit();

CREATE TRIGGER layout_version_no_active_overlap BEFORE INSERT OR UPDATE ON tce.layout_version FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_layout_version_no_active_overlap();

CREATE TRIGGER layout_version_touch_updated_at BEFORE UPDATE ON tce.layout_version FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_touch_updated_at();

CREATE TRIGGER state_audit AFTER INSERT OR DELETE OR UPDATE ON tce.state FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_audit();

CREATE TRIGGER state_touch_updated_at BEFORE UPDATE ON tce.state FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_touch_updated_at();

CREATE TRIGGER submission_attempt_audit AFTER INSERT OR DELETE OR UPDATE ON tce.submission_attempt FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_audit();

CREATE TRIGGER submission_audit AFTER INSERT OR DELETE OR UPDATE ON tce.submission FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_submission_audit();

CREATE TRIGGER submission_queue_audit AFTER INSERT OR DELETE OR UPDATE ON tce.submission_queue FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_audit();

CREATE TRIGGER submission_queue_touch_updated_at BEFORE UPDATE ON tce.submission_queue FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_touch_updated_at();

CREATE TRIGGER submission_touch_updated_at BEFORE UPDATE ON tce.submission FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_submission_touch_updated_at();

ALTER TABLE ONLY tce.adapter_lifecycle_event
    ADD CONSTRAINT adapter_lifecycle_event_adapter_fk FOREIGN KEY (adapter_id) REFERENCES tce.adapter_registry(adapter_id) ON DELETE CASCADE;

ALTER TABLE ONLY tce.layout_field
    ADD CONSTRAINT layout_field_layout_version_id_fkey FOREIGN KEY (layout_version_id) REFERENCES tce.layout_version(id) ON DELETE CASCADE;

ALTER TABLE ONLY tce.layout_version
    ADD CONSTRAINT layout_version_state_id_fkey FOREIGN KEY (state_id) REFERENCES tce.state(id) ON DELETE RESTRICT;

ALTER TABLE ONLY tce.state
    ADD CONSTRAINT state_parent_fk FOREIGN KEY (parent_state_code) REFERENCES tce.state(code);

ALTER TABLE ONLY tce.submission_attempt
    ADD CONSTRAINT submission_attempt_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES tce.submission_queue(id) ON DELETE CASCADE;

ALTER TABLE ONLY tce.submission
    ADD CONSTRAINT submission_layout_version_id_fkey FOREIGN KEY (layout_version_id) REFERENCES tce.layout_version(id) ON DELETE RESTRICT;

ALTER TABLE ONLY tce.submission
    ADD CONSTRAINT submission_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY tce.submission_queue
    ADD CONSTRAINT submission_queue_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES tce.submission(id) ON DELETE CASCADE;

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
