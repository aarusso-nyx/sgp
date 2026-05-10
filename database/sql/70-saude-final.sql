CREATE INDEX aso_attachment_record_idx ON saude.aso_attachment USING btree (tenant_id, aso_record_id);

CREATE INDEX aso_exam_item_record_idx ON saude.aso_exam_item USING btree (tenant_id, aso_record_id);

CREATE INDEX aso_record_employee_due_idx ON saude.aso_record USING btree (tenant_id, employee_id, next_exam_due_at);

CREATE INDEX aso_record_s2220_missing_idx ON saude.aso_record USING btree (tenant_id, status, s2220_spool_message_id) WHERE (status = 'ARCHIVED'::saude.aso_status);

CREATE INDEX aso_record_status_due_idx ON saude.aso_record USING btree (tenant_id, status, next_exam_due_at);

CREATE INDEX cat_emission_deadline_idx ON saude.cat_emission USING btree (tenant_id, deadline_at, esocial_events_message_id);

CREATE INDEX environmental_exposure_employee_period_idx ON saude.environmental_exposure USING btree (tenant_id, employee_id, exposure_start, exposure_end);

CREATE INDEX environmental_exposure_pgr_idx ON saude.environmental_exposure USING btree (tenant_id, risk_management_program_id);

CREATE INDEX epi_delivery_employee_idx ON saude.epi_delivery USING btree (tenant_id, employee_id, delivered_at DESC);

CREATE INDEX health_program_location_status_idx ON saude.health_program USING btree (tenant_id, work_location_id, status);

CREATE UNIQUE INDEX health_program_one_active_idx ON saude.health_program USING btree (tenant_id, work_location_id, kind) WHERE (status = 'ACTIVE'::saude.program_status);

CREATE INDEX cipa_committee_location_status_idx ON saude.cipa_committee USING btree (tenant_id, work_location_id, status, mandate_end);

CREATE UNIQUE INDEX cipa_committee_one_active_idx ON saude.cipa_committee USING btree (tenant_id, work_location_id) WHERE (status = 'ACTIVE'::saude.cipa_committee_status);

CREATE INDEX cipa_member_committee_idx ON saude.cipa_member USING btree (tenant_id, committee_id, status);

CREATE INDEX cipa_member_employee_idx ON saude.cipa_member USING btree (tenant_id, employee_id);

CREATE INDEX cipa_minute_committee_idx ON saude.cipa_minute USING btree (tenant_id, committee_id, meeting_at DESC);

CREATE INDEX medical_exam_active_idx ON saude.medical_exam USING btree (tenant_id, active);

CREATE INDEX pcmso_required_exam_program_idx ON saude.pcmso_required_exam USING btree (tenant_id, health_program_id);

CREATE INDEX ppp_record_employee_period_idx ON saude.ppp_record USING btree (tenant_id, employee_id, period_start, period_end);

CREATE INDEX program_revision_parent_idx ON saude.program_revision USING btree (tenant_id, parent_program_kind, parent_program_id, revision_number DESC);

CREATE INDEX risk_management_program_location_status_idx ON saude.risk_management_program USING btree (tenant_id, work_location_id, status);

CREATE UNIQUE INDEX risk_management_program_one_active_idx ON saude.risk_management_program USING btree (tenant_id, work_location_id, kind) WHERE (status = 'ACTIVE'::saude.program_status);

CREATE INDEX work_accident_employee_status_idx ON saude.work_accident USING btree (tenant_id, employee_id, status, accident_at DESC);

CREATE TRIGGER aso_attachment_audit AFTER INSERT OR DELETE OR UPDATE ON saude.aso_attachment FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER aso_attachment_touch_updated_at BEFORE UPDATE ON saude.aso_attachment FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER aso_exam_item_audit AFTER INSERT OR DELETE OR UPDATE ON saude.aso_exam_item FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER aso_exam_item_touch_updated_at BEFORE UPDATE ON saude.aso_exam_item FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER aso_record_audit AFTER INSERT OR DELETE OR UPDATE ON saude.aso_record FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER aso_record_touch_updated_at BEFORE UPDATE ON saude.aso_record FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER cat_emission_audit AFTER INSERT OR DELETE OR UPDATE ON saude.cat_emission FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER cat_emission_touch_updated_at BEFORE UPDATE ON saude.cat_emission FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER cat_emission_validate BEFORE INSERT OR UPDATE ON saude.cat_emission FOR EACH ROW EXECUTE FUNCTION saude.sst03_validate_cat_emission();

CREATE TRIGGER environmental_exposure_audit AFTER INSERT OR DELETE OR UPDATE ON saude.environmental_exposure FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER environmental_exposure_touch_updated_at BEFORE UPDATE ON saude.environmental_exposure FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER environmental_exposure_validate BEFORE INSERT OR UPDATE ON saude.environmental_exposure FOR EACH ROW EXECUTE FUNCTION saude.sst05_validate_environmental_exposure();

CREATE TRIGGER epi_delivery_audit AFTER INSERT OR DELETE OR UPDATE ON saude.epi_delivery FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER epi_delivery_touch_updated_at BEFORE UPDATE ON saude.epi_delivery FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER epi_delivery_validate BEFORE INSERT OR UPDATE ON saude.epi_delivery FOR EACH ROW EXECUTE FUNCTION saude.sst05_validate_epi_delivery();

CREATE TRIGGER epi_inventory_audit AFTER INSERT OR DELETE OR UPDATE ON saude.epi_inventory FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER epi_inventory_touch_updated_at BEFORE UPDATE ON saude.epi_inventory FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER health_program_audit AFTER INSERT OR DELETE OR UPDATE ON saude.health_program FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER health_program_touch_updated_at BEFORE UPDATE ON saude.health_program FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER cipa_committee_audit AFTER INSERT OR DELETE OR UPDATE ON saude.cipa_committee FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER cipa_committee_touch_updated_at BEFORE UPDATE ON saude.cipa_committee FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER cipa_member_audit AFTER INSERT OR DELETE OR UPDATE ON saude.cipa_member FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER cipa_member_touch_updated_at BEFORE UPDATE ON saude.cipa_member FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER cipa_minute_audit AFTER INSERT OR DELETE OR UPDATE ON saude.cipa_minute FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER cipa_minute_touch_updated_at BEFORE UPDATE ON saude.cipa_minute FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER medical_exam_audit AFTER INSERT OR DELETE OR UPDATE ON saude.medical_exam FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER medical_exam_touch_updated_at BEFORE UPDATE ON saude.medical_exam FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER pcmso_required_exam_audit AFTER INSERT OR DELETE OR UPDATE ON saude.pcmso_required_exam FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER pcmso_required_exam_touch_updated_at BEFORE UPDATE ON saude.pcmso_required_exam FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER ppp_record_audit AFTER INSERT OR DELETE ON saude.ppp_record FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER ppp_record_no_delete BEFORE DELETE ON saude.ppp_record FOR EACH ROW EXECUTE FUNCTION saude.sst05_block_ppp_record_mutation();

CREATE TRIGGER ppp_record_no_update BEFORE UPDATE ON saude.ppp_record FOR EACH ROW EXECUTE FUNCTION saude.sst05_block_ppp_record_mutation();

CREATE TRIGGER program_revision_audit AFTER INSERT OR DELETE ON saude.program_revision FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER program_revision_no_delete BEFORE DELETE ON saude.program_revision FOR EACH ROW EXECUTE FUNCTION saude.sst02_block_program_revision_mutation();

CREATE TRIGGER program_revision_no_update BEFORE UPDATE ON saude.program_revision FOR EACH ROW EXECUTE FUNCTION saude.sst02_block_program_revision_mutation();

CREATE TRIGGER risk_management_program_audit AFTER INSERT OR DELETE OR UPDATE ON saude.risk_management_program FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER risk_management_program_touch_updated_at BEFORE UPDATE ON saude.risk_management_program FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER work_accident_audit AFTER INSERT OR DELETE OR UPDATE ON saude.work_accident FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER work_accident_state_machine BEFORE UPDATE ON saude.work_accident FOR EACH ROW EXECUTE FUNCTION saude.sst03_validate_work_accident_state();

CREATE TRIGGER work_accident_touch_updated_at BEFORE UPDATE ON saude.work_accident FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

ALTER TABLE ONLY saude.aso_attachment
    ADD CONSTRAINT aso_attachment_aso_record_id_fkey FOREIGN KEY (aso_record_id) REFERENCES saude.aso_record(id) ON DELETE CASCADE;

ALTER TABLE ONLY saude.aso_attachment
    ADD CONSTRAINT aso_attachment_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.aso_exam_item
    ADD CONSTRAINT aso_exam_item_aso_record_id_fkey FOREIGN KEY (aso_record_id) REFERENCES saude.aso_record(id) ON DELETE CASCADE;

ALTER TABLE ONLY saude.aso_exam_item
    ADD CONSTRAINT aso_exam_item_medical_exam_id_fkey FOREIGN KEY (medical_exam_id) REFERENCES saude.medical_exam(id);

ALTER TABLE ONLY saude.aso_exam_item
    ADD CONSTRAINT aso_exam_item_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.aso_record
    ADD CONSTRAINT aso_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE;

ALTER TABLE ONLY saude.aso_record
    ADD CONSTRAINT aso_record_s2220_spool_message_id_fkey FOREIGN KEY (s2220_spool_message_id) REFERENCES public.esocial_events(message_id);

ALTER TABLE ONLY saude.aso_record
    ADD CONSTRAINT aso_record_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.cat_emission
    ADD CONSTRAINT cat_emission_esocial_events_message_id_fkey FOREIGN KEY (esocial_events_message_id) REFERENCES public.esocial_events(message_id);

ALTER TABLE ONLY saude.cat_emission
    ADD CONSTRAINT cat_emission_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.cat_emission
    ADD CONSTRAINT cat_emission_work_accident_id_fkey FOREIGN KEY (work_accident_id) REFERENCES saude.work_accident(id) ON DELETE CASCADE;

ALTER TABLE ONLY saude.environmental_exposure
    ADD CONSTRAINT environmental_exposure_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY saude.environmental_exposure
    ADD CONSTRAINT environmental_exposure_risk_management_program_id_fkey FOREIGN KEY (risk_management_program_id) REFERENCES saude.risk_management_program(id) ON DELETE RESTRICT;

ALTER TABLE ONLY saude.environmental_exposure
    ADD CONSTRAINT environmental_exposure_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.epi_delivery
    ADD CONSTRAINT epi_delivery_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY saude.epi_delivery
    ADD CONSTRAINT epi_delivery_epi_inventory_id_fkey FOREIGN KEY (epi_inventory_id) REFERENCES saude.epi_inventory(id) ON DELETE RESTRICT;

ALTER TABLE ONLY saude.epi_delivery
    ADD CONSTRAINT epi_delivery_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.epi_inventory
    ADD CONSTRAINT epi_inventory_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.health_program
    ADD CONSTRAINT health_program_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.health_program
    ADD CONSTRAINT health_program_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id);

ALTER TABLE ONLY saude.cipa_committee
    ADD CONSTRAINT cipa_committee_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.cipa_committee
    ADD CONSTRAINT cipa_committee_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id);

ALTER TABLE ONLY saude.cipa_member
    ADD CONSTRAINT cipa_member_committee_id_fkey FOREIGN KEY (committee_id) REFERENCES saude.cipa_committee(id) ON DELETE CASCADE;

ALTER TABLE ONLY saude.cipa_member
    ADD CONSTRAINT cipa_member_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY saude.cipa_member
    ADD CONSTRAINT cipa_member_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.cipa_minute
    ADD CONSTRAINT cipa_minute_committee_id_fkey FOREIGN KEY (committee_id) REFERENCES saude.cipa_committee(id) ON DELETE CASCADE;

ALTER TABLE ONLY saude.cipa_minute
    ADD CONSTRAINT cipa_minute_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.medical_exam
    ADD CONSTRAINT medical_exam_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.pcmso_required_exam
    ADD CONSTRAINT pcmso_required_exam_applies_to_role_id_fkey FOREIGN KEY (applies_to_role_id) REFERENCES hr.job_position(id);

ALTER TABLE ONLY saude.pcmso_required_exam
    ADD CONSTRAINT pcmso_required_exam_health_program_id_fkey FOREIGN KEY (health_program_id) REFERENCES saude.health_program(id) ON DELETE CASCADE;

ALTER TABLE ONLY saude.pcmso_required_exam
    ADD CONSTRAINT pcmso_required_exam_medical_exam_id_fkey FOREIGN KEY (medical_exam_id) REFERENCES saude.medical_exam(id);

ALTER TABLE ONLY saude.pcmso_required_exam
    ADD CONSTRAINT pcmso_required_exam_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.ppp_record
    ADD CONSTRAINT ppp_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY saude.ppp_record
    ADD CONSTRAINT ppp_record_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.program_revision
    ADD CONSTRAINT program_revision_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.risk_management_program
    ADD CONSTRAINT risk_management_program_responsible_engineer_id_fkey FOREIGN KEY (responsible_engineer_id) REFERENCES hr.employee(id);

ALTER TABLE ONLY saude.risk_management_program
    ADD CONSTRAINT risk_management_program_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.risk_management_program
    ADD CONSTRAINT risk_management_program_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id);

ALTER TABLE ONLY saude.work_accident
    ADD CONSTRAINT work_accident_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY saude.work_accident
    ADD CONSTRAINT work_accident_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.aso_attachment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.aso_exam_item FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.aso_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.cat_emission FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.environmental_exposure FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.epi_delivery FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.epi_inventory FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.health_program FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.cipa_committee FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.cipa_member FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.cipa_minute FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.medical_exam FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.pcmso_required_exam FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.ppp_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.program_revision FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.risk_management_program FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.work_accident FORCE ROW LEVEL SECURITY;

ALTER TABLE saude.aso_attachment ENABLE ROW LEVEL SECURITY;

CREATE POLICY aso_attachment_select ON saude.aso_attachment FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND (public.sgp_has_any_permission(ARRAY['saude.aso.read'::text, 'saude.aso.write'::text]) OR (public.sgp_has_any_permission(ARRAY['saude.aso.self_read'::text]) AND (EXISTS ( SELECT 1
   FROM saude.aso_record ar
  WHERE ((ar.id = aso_attachment.aso_record_id) AND (ar.tenant_id = aso_attachment.tenant_id) AND (ar.employee_id = public.sgp_current_employee_id()))))))));

CREATE POLICY aso_attachment_write ON saude.aso_attachment USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text])));

ALTER TABLE saude.aso_exam_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY aso_exam_item_select ON saude.aso_exam_item FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND (public.sgp_has_any_permission(ARRAY['saude.aso.read'::text, 'saude.aso.write'::text]) OR (public.sgp_has_any_permission(ARRAY['saude.aso.self_read'::text]) AND (EXISTS ( SELECT 1
   FROM saude.aso_record ar
  WHERE ((ar.id = aso_exam_item.aso_record_id) AND (ar.tenant_id = aso_exam_item.tenant_id) AND (ar.employee_id = public.sgp_current_employee_id()))))))));

CREATE POLICY aso_exam_item_write ON saude.aso_exam_item USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text])));

ALTER TABLE saude.aso_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY aso_record_select ON saude.aso_record FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND (public.sgp_has_any_permission(ARRAY['saude.aso.read'::text, 'saude.aso.write'::text]) OR (public.sgp_has_any_permission(ARRAY['saude.aso.self_read'::text]) AND (employee_id = public.sgp_current_employee_id())))));

CREATE POLICY aso_record_write ON saude.aso_record USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text])));

ALTER TABLE saude.cat_emission ENABLE ROW LEVEL SECURITY;

CREATE POLICY cat_emission_rw ON saude.cat_emission USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.read'::text, 'saude.cat.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.write'::text])));

ALTER TABLE saude.environmental_exposure ENABLE ROW LEVEL SECURITY;

CREATE POLICY environmental_exposure_rw ON saude.environmental_exposure USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.write'::text])));

ALTER TABLE saude.epi_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY epi_delivery_rw ON saude.epi_delivery USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.epi.write'::text])));

ALTER TABLE saude.epi_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY epi_inventory_rw ON saude.epi_inventory USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.epi.write'::text])));

ALTER TABLE saude.health_program ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_program_rw ON saude.health_program USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.cipa_committee ENABLE ROW LEVEL SECURITY;

CREATE POLICY cipa_committee_rw ON saude.cipa_committee USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.cipa_member ENABLE ROW LEVEL SECURITY;

CREATE POLICY cipa_member_rw ON saude.cipa_member USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.cipa_minute ENABLE ROW LEVEL SECURITY;

CREATE POLICY cipa_minute_rw ON saude.cipa_minute USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.medical_exam ENABLE ROW LEVEL SECURITY;

CREATE POLICY medical_exam_rw ON saude.medical_exam USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.read'::text, 'saude.aso.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text])));

ALTER TABLE saude.pcmso_required_exam ENABLE ROW LEVEL SECURITY;

CREATE POLICY pcmso_required_exam_rw ON saude.pcmso_required_exam USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.ppp_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY ppp_record_rw ON saude.ppp_record USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.write'::text])));

ALTER TABLE saude.program_revision ENABLE ROW LEVEL SECURITY;

CREATE POLICY program_revision_rw ON saude.program_revision USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.risk_management_program ENABLE ROW LEVEL SECURITY;

CREATE POLICY risk_management_program_rw ON saude.risk_management_program USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.work_accident ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_accident_rw ON saude.work_accident USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.read'::text, 'saude.cat.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.write'::text])));
