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
    ADD CONSTRAINT aso_record_s2220_event_id_fkey FOREIGN KEY (s2220_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY saude.aso_record
    ADD CONSTRAINT aso_record_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY saude.cat_emission
    ADD CONSTRAINT cat_emission_esocial_event_id_fkey FOREIGN KEY (esocial_event_id) REFERENCES public.esocial_event(id);

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
