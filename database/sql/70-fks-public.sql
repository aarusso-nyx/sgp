ALTER TABLE ONLY public.audit_event
    ADD CONSTRAINT audit_event_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.document_attachment
    ADD CONSTRAINT document_attachment_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_type(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.document_download_audit
    ADD CONSTRAINT document_download_audit_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.document_attachment(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.document_download_audit
    ADD CONSTRAINT document_download_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.document_upload_session
    ADD CONSTRAINT document_upload_session_registered_attachment_id_fkey FOREIGN KEY (registered_attachment_id) REFERENCES public.document_attachment(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.generated_report_file
    ADD CONSTRAINT generated_report_file_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.document_attachment(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.generated_report_file
    ADD CONSTRAINT generated_report_file_employee_fk FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.generated_report_file
    ADD CONSTRAINT generated_report_file_payroll_run_fk FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.generated_report_file
    ADD CONSTRAINT generated_report_file_report_request_id_fkey FOREIGN KEY (report_request_id) REFERENCES public.report_request(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT menu_item_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menu_item(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT menu_item_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.access_profile(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.payslip_batch
    ADD CONSTRAINT payslip_batch_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.payslip_batch
    ADD CONSTRAINT payslip_batch_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.user_account(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.profile_assignment
    ADD CONSTRAINT profile_assignment_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.access_profile(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.profile_assignment
    ADD CONSTRAINT profile_assignment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.profile_permission
    ADD CONSTRAINT profile_permission_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permission(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.profile_permission
    ADD CONSTRAINT profile_permission_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.access_profile(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.access_profile
    ADD CONSTRAINT public_access_profile_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.audit_event
    ADD CONSTRAINT public_audit_event_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.document_attachment
    ADD CONSTRAINT public_document_attachment_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.document_download_audit
    ADD CONSTRAINT public_document_download_audit_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.document_type
    ADD CONSTRAINT public_document_type_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.document_upload_session
    ADD CONSTRAINT public_document_upload_session_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.esocial_event
    ADD CONSTRAINT public_esocial_event_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.generated_report_file
    ADD CONSTRAINT public_generated_report_file_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT public_menu_item_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT public_notification_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.profile_assignment
    ADD CONSTRAINT public_profile_assignment_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.report_definition
    ADD CONSTRAINT public_report_definition_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.report_request
    ADD CONSTRAINT public_report_request_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.system_parameter
    ADD CONSTRAINT public_system_parameter_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT public_tax_rate_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT public_user_account_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.user_group_snapshot
    ADD CONSTRAINT public_user_group_snapshot_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY public.report_request
    ADD CONSTRAINT report_request_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.report_request
    ADD CONSTRAINT report_request_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES public.report_definition(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.report_request
    ADD CONSTRAINT report_request_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.report_request
    ADD CONSTRAINT report_request_processing_type_id_fkey FOREIGN KEY (processing_type_id) REFERENCES payroll.processing_type(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.report_request
    ADD CONSTRAINT report_request_requested_by_user_id_fkey FOREIGN KEY (requested_by_user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.system_parameter
    ADD CONSTRAINT system_parameter_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.user_group_snapshot
    ADD CONSTRAINT user_group_snapshot_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE RESTRICT;
