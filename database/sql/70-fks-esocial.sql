ALTER TABLE ONLY esocial.esocial_totalizer
    ADD CONSTRAINT esocial_totalizer_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.event_retry_schedule
    ADD CONSTRAINT event_retry_schedule_event_fk FOREIGN KEY (event_id) REFERENCES public.esocial_event(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.event_retry_schedule
    ADD CONSTRAINT event_retry_schedule_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s1299_emission_state
    ADD CONSTRAINT s1299_emission_state_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s1299_emission_state
    ADD CONSTRAINT s1299_emission_state_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s1xxx_dispatch_state
    ADD CONSTRAINT s1xxx_dispatch_state_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2200_emission_state
    ADD CONSTRAINT s2200_emission_state_employee_fk FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2200_emission_state
    ADD CONSTRAINT s2200_emission_state_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_field_path_fkey FOREIGN KEY (field_path) REFERENCES esocial.s2205_trigger_field(field_path);

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2210_pending
    ADD CONSTRAINT s2210_pending_cat_emission_id_fkey FOREIGN KEY (cat_emission_id) REFERENCES saude.cat_emission(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2210_pending
    ADD CONSTRAINT s2210_pending_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2220_pending
    ADD CONSTRAINT s2220_pending_aso_record_id_fkey FOREIGN KEY (aso_record_id) REFERENCES saude.aso_record(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2220_pending
    ADD CONSTRAINT s2220_pending_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2230_pending
    ADD CONSTRAINT s2230_pending_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s2240_pending
    ADD CONSTRAINT s2240_pending_environmental_exposure_id_fkey FOREIGN KEY (environmental_exposure_id) REFERENCES saude.environmental_exposure(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2240_pending
    ADD CONSTRAINT s2240_pending_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2298_event
    ADD CONSTRAINT s2298_event_reintegration_order_id_fkey FOREIGN KEY (reintegration_order_id) REFERENCES hr.reintegration_order(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2298_event
    ADD CONSTRAINT s2298_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2299_pending
    ADD CONSTRAINT s2299_pending_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s2306_event
    ADD CONSTRAINT s2306_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2306_event
    ADD CONSTRAINT s2306_event_tsv_contract_change_id_fkey FOREIGN KEY (tsv_contract_change_id) REFERENCES hr.tsv_contract_change(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s3000_request
    ADD CONSTRAINT s3000_request_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s3000_request
    ADD CONSTRAINT s3000_request_target_event_fk FOREIGN KEY (target_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s3000_request
    ADD CONSTRAINT s3000_request_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.submission_batch
    ADD CONSTRAINT submission_batch_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.tenant_certificate
    ADD CONSTRAINT tenant_certificate_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.xsd_validation_failure
    ADD CONSTRAINT xsd_validation_failure_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);
