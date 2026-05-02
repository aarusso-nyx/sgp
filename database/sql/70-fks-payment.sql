ALTER TABLE ONLY payment.consignment_entity
    ADD CONSTRAINT consignment_entity_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_employee_fk FOREIGN KEY (tenant_id, employee_id) REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_entity_fk FOREIGN KEY (tenant_id, consignment_entity_id) REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_transferred_from_fk FOREIGN KEY (tenant_id, transferred_from_loan_id) REFERENCES payment.consignment_loan(tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_transferred_to_fk FOREIGN KEY (tenant_id, transferred_to_loan_id) REFERENCES payment.consignment_loan(tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_portability_detail
    ADD CONSTRAINT consignment_portability_detail_created_fk FOREIGN KEY (tenant_id, created_loan_id) REFERENCES payment.consignment_loan(tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_portability_detail
    ADD CONSTRAINT consignment_portability_detail_file_fk FOREIGN KEY (tenant_id, file_id) REFERENCES payment.consignment_portability_file(tenant_id, file_id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.consignment_portability_detail
    ADD CONSTRAINT consignment_portability_detail_matched_fk FOREIGN KEY (tenant_id, matched_loan_id) REFERENCES payment.consignment_loan(tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_portability_file
    ADD CONSTRAINT consignment_portability_file_source_fk FOREIGN KEY (tenant_id, source_consignment_entity_id) REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id);

ALTER TABLE ONLY payment.consignment_portability_file
    ADD CONSTRAINT consignment_portability_file_target_fk FOREIGN KEY (tenant_id, target_consignment_entity_id) REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id);

ALTER TABLE ONLY payment.consignment_portability_file
    ADD CONSTRAINT consignment_portability_file_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.dirf_payment_source
    ADD CONSTRAINT dirf_payment_source_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_employee_fk FOREIGN KEY (tenant_id, employee_id) REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id) REFERENCES hr.employment_link(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_caixa_adapter
    ADD CONSTRAINT fgts_caixa_adapter_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_fgts_remittance_id_fkey FOREIGN KEY (fgts_remittance_id) REFERENCES payment.fgts_remittance(id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id) REFERENCES hr.employment_link(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_fgts_remittance_id_fkey FOREIGN KEY (fgts_remittance_id) REFERENCES payment.fgts_remittance(id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_movement
    ADD CONSTRAINT fgts_movement_account_fk FOREIGN KEY (tenant_id, fgts_account_id) REFERENCES payment.fgts_account(tenant_id, fgts_account_id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_movement
    ADD CONSTRAINT fgts_movement_payroll_run_fk FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE SET NULL;

ALTER TABLE ONLY payment.fgts_movement
    ADD CONSTRAINT fgts_movement_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_remittance
    ADD CONSTRAINT fgts_remittance_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.pis_pasep_base_year
    ADD CONSTRAINT pis_pasep_base_year_employee_fk FOREIGN KEY (tenant_id, employee_id) REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.pis_pasep_base_year
    ADD CONSTRAINT pis_pasep_base_year_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.prior_notice
    ADD CONSTRAINT prior_notice_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id) REFERENCES hr.employment_link(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.prior_notice
    ADD CONSTRAINT prior_notice_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);
