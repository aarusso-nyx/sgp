CREATE UNIQUE INDEX legal_basis_rule_flow_key_key ON lgpd.legal_basis_rule USING btree (flow_key);

CREATE INDEX legal_basis_rule_category_idx ON lgpd.legal_basis_rule USING btree (data_category);

CREATE INDEX legal_basis_rule_status_idx ON lgpd.legal_basis_rule USING btree (status, effective_from, effective_until);

CREATE UNIQUE INDEX ropa_entry_tenant_flow_operation_key ON lgpd.ropa_entry USING btree (tenant_id, flow_key, operation_name);

CREATE INDEX ropa_entry_tenant_status_idx ON lgpd.ropa_entry USING btree (tenant_id, status, updated_at DESC);

CREATE INDEX ropa_entry_flow_key_idx ON lgpd.ropa_entry USING btree (flow_key);

CREATE TRIGGER ropa_entry_touch_updated_at BEFORE UPDATE ON lgpd.ropa_entry FOR EACH ROW EXECUTE FUNCTION lgpd.sgp_lgpd_touch_updated_at();

CREATE INDEX public_power_treatment_tenant_status_idx ON lgpd.public_power_treatment USING btree (tenant_id, status, updated_at DESC);

CREATE INDEX public_power_treatment_flow_key_idx ON lgpd.public_power_treatment USING btree (flow_key);

CREATE TRIGGER public_power_treatment_touch_updated_at BEFORE UPDATE ON lgpd.public_power_treatment FOR EACH ROW EXECUTE FUNCTION lgpd.sgp_lgpd_touch_updated_at();

CREATE INDEX data_subject_request_tenant_status_idx ON lgpd.data_subject_request USING btree (tenant_id, status, sla_due_at ASC);

CREATE INDEX data_subject_request_flow_key_idx ON lgpd.data_subject_request USING btree (flow_key);

CREATE TRIGGER data_subject_request_touch_updated_at BEFORE UPDATE ON lgpd.data_subject_request FOR EACH ROW EXECUTE FUNCTION lgpd.sgp_lgpd_touch_updated_at();

CREATE INDEX security_incident_tenant_status_due_idx ON lgpd.security_incident USING btree (tenant_id, status, anpd_due_at ASC);

CREATE INDEX security_incident_flow_key_idx ON lgpd.security_incident USING btree (flow_key);

CREATE INDEX security_incident_anpd_alert_idx ON lgpd.security_incident USING btree (tenant_id, anpd_alert_at ASC) WHERE anpd_reported_at IS NULL;

CREATE TRIGGER security_incident_touch_updated_at BEFORE UPDATE ON lgpd.security_incident FOR EACH ROW EXECUTE FUNCTION lgpd.sgp_lgpd_touch_updated_at();

ALTER TABLE ONLY lgpd.ropa_entry
    ADD CONSTRAINT ropa_entry_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.ropa_entry
    ADD CONSTRAINT ropa_entry_legal_basis_rule_id_fkey FOREIGN KEY (legal_basis_rule_id) REFERENCES lgpd.legal_basis_rule(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.ropa_entry
    ADD CONSTRAINT ropa_entry_flow_key_fkey FOREIGN KEY (flow_key) REFERENCES lgpd.legal_basis_rule(flow_key) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.public_power_treatment
    ADD CONSTRAINT public_power_treatment_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.public_power_treatment
    ADD CONSTRAINT public_power_treatment_ropa_entry_id_fkey FOREIGN KEY (ropa_entry_id) REFERENCES lgpd.ropa_entry(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.public_power_treatment
    ADD CONSTRAINT public_power_treatment_legal_basis_rule_id_fkey FOREIGN KEY (legal_basis_rule_id) REFERENCES lgpd.legal_basis_rule(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.public_power_treatment
    ADD CONSTRAINT public_power_treatment_flow_key_fkey FOREIGN KEY (flow_key) REFERENCES lgpd.legal_basis_rule(flow_key) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.data_subject_request
    ADD CONSTRAINT data_subject_request_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.data_subject_request
    ADD CONSTRAINT data_subject_request_ropa_entry_id_fkey FOREIGN KEY (ropa_entry_id) REFERENCES lgpd.ropa_entry(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.data_subject_request
    ADD CONSTRAINT data_subject_request_legal_basis_rule_id_fkey FOREIGN KEY (legal_basis_rule_id) REFERENCES lgpd.legal_basis_rule(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.data_subject_request
    ADD CONSTRAINT data_subject_request_flow_key_fkey FOREIGN KEY (flow_key) REFERENCES lgpd.legal_basis_rule(flow_key) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.security_incident
    ADD CONSTRAINT security_incident_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY lgpd.security_incident
    ADD CONSTRAINT security_incident_ropa_entry_id_fkey FOREIGN KEY (ropa_entry_id) REFERENCES lgpd.ropa_entry(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY lgpd.security_incident
    ADD CONSTRAINT security_incident_legal_basis_rule_id_fkey FOREIGN KEY (legal_basis_rule_id) REFERENCES lgpd.legal_basis_rule(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY lgpd.security_incident
    ADD CONSTRAINT security_incident_flow_key_fkey FOREIGN KEY (flow_key) REFERENCES lgpd.legal_basis_rule(flow_key) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE lgpd.ropa_entry ENABLE ROW LEVEL SECURITY;

ALTER TABLE lgpd.public_power_treatment ENABLE ROW LEVEL SECURITY;

ALTER TABLE lgpd.data_subject_request ENABLE ROW LEVEL SECURITY;

ALTER TABLE lgpd.security_incident ENABLE ROW LEVEL SECURITY;

CREATE POLICY ropa_entry_select ON lgpd.ropa_entry FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['auditoria.read'::text, 'gestao.read'::text, 'gestao.write'::text])));

CREATE POLICY ropa_entry_write ON lgpd.ropa_entry USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])));

CREATE POLICY public_power_treatment_select ON lgpd.public_power_treatment FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['auditoria.read'::text, 'gestao.read'::text, 'gestao.write'::text])));

CREATE POLICY public_power_treatment_write ON lgpd.public_power_treatment USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])));

CREATE POLICY data_subject_request_select ON lgpd.data_subject_request FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.profile.read'::text, 'auditoria.read'::text, 'gestao.write'::text])));

CREATE POLICY data_subject_request_insert ON lgpd.data_subject_request FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.profile.write'::text])));

CREATE POLICY data_subject_request_update ON lgpd.data_subject_request FOR UPDATE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])));

CREATE POLICY security_incident_select ON lgpd.security_incident FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['auditoria.read'::text, 'gestao.read'::text, 'gestao.write'::text])));

CREATE POLICY security_incident_write ON lgpd.security_incident USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])));

COMMENT ON TABLE lgpd.legal_basis_rule IS 'R2-40/R4-72 LGPD legal-basis registry for PII-bearing SGP data flows. Non-tenant-scoped: rows are shared legal-basis rules; tenant-specific processing records remain in RLS-protected lgpd.ropa_entry.';

COMMENT ON TABLE lgpd.ropa_entry IS 'R2-39 LGPD Record of Processing Activities entries linked to lgpd.legal_basis_rule.';

COMMENT ON TABLE lgpd.public_power_treatment IS 'R3-031 LGPD treatment-by-public-power workflow linked to active ROPA and legal-basis evidence.';

COMMENT ON TABLE lgpd.data_subject_request IS 'R2-43 LGPD Art. 18 data-subject rights request tickets from the employee portal.';

COMMENT ON TABLE lgpd.security_incident IS 'R2-41 LGPD RCIS security-incident workflow under Resolução CD/ANPD 15/2024.';

COMMENT ON COLUMN lgpd.legal_basis_rule.flow_key IS 'Stable code used by backend services before PII reads.';

COMMENT ON COLUMN lgpd.legal_basis_rule.legal_basis_article IS 'LGPD ordinary personal-data basis, primarily Art. 7.';

COMMENT ON COLUMN lgpd.legal_basis_rule.sensitive_basis_article IS 'LGPD sensitive personal-data basis, required when data_category is SENSITIVE or MIXED.';

COMMENT ON COLUMN lgpd.ropa_entry.flow_key IS 'Stable data-flow key; legal-basis details remain in lgpd.legal_basis_rule.';

COMMENT ON COLUMN lgpd.ropa_entry.security_controls IS 'Operational safeguards evidenced for the processing operation.';

COMMENT ON COLUMN lgpd.public_power_treatment.legal_basis_reference IS 'Recorded public-power legal reference for the treatment workflow; defaults from the active legal-basis rule unless explicitly supplied by the operator.';

COMMENT ON COLUMN lgpd.public_power_treatment.evidence_refs IS 'Operational evidence anchors such as policy, publication, ROPA, or owner-review references.';

COMMENT ON COLUMN lgpd.data_subject_request.right_type IS 'LGPD Art. 18 ticket type: incisos I through VI as accepted by R2-43.';

COMMENT ON COLUMN lgpd.data_subject_request.sla_due_at IS 'Portal request SLA timer due date; initial R2-43 workflow uses a 90-day manual process timer from docs/eng/41-arquitetura-sistema.md.';

COMMENT ON COLUMN lgpd.security_incident.status IS 'RCIS state machine: DETECTED, TRIAGED, REPORTED, COMPLEMENTED, CLOSED.';

COMMENT ON COLUMN lgpd.security_incident.anpd_due_at IS 'Three-business-day communication deadline counted from controller knowledge that personal data was affected.';

COMMENT ON COLUMN lgpd.security_incident.complement_due_at IS 'Twenty-business-day complementation window counted from the initial ANPD communication.';
