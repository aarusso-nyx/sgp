CREATE VIEW public.v_permission_catalog AS
 SELECT key AS permission_key,
    module_key,
    resource_key,
    action_key,
    route_pattern,
    description,
    created_at,
    updated_at
   FROM public.permission p;

CREATE VIEW public.v_profile_permission_matrix AS
 SELECT ap.code AS profile_code,
    ap.name AS profile_name,
    p.key AS permission_key,
    p.module_key,
    p.resource_key,
    p.action_key,
    pp.allowed
   FROM ((public.access_profile ap
     JOIN public.profile_permission pp ON ((pp.profile_id = ap.id)))
     JOIN public.permission p ON ((p.id = pp.permission_id)));

CREATE UNIQUE INDEX access_profile_code_key ON public.access_profile USING btree (tenant_id, code);

CREATE INDEX access_profile_status_idx ON public.access_profile USING btree (status);

CREATE INDEX access_profile_tenant_code_idx ON public.access_profile USING btree (tenant_id, code);

CREATE INDEX audit_event_actor_login_idx ON public.audit_event USING btree (actor_login);

CREATE INDEX audit_event_actor_user_id_occurred_at_idx ON public.audit_event USING btree (actor_user_id, occurred_at);

CREATE INDEX audit_event_metadata_gin_idx ON public.audit_event USING gin (metadata);

CREATE INDEX audit_event_occurred_at_idx ON public.audit_event USING btree (occurred_at);

CREATE INDEX audit_event_request_id_idx ON public.audit_event USING btree (request_id);

CREATE INDEX audit_event_resource_type_resource_id_idx ON public.audit_event USING btree (resource_type, resource_id);

CREATE INDEX audit_event_tenant_occurred_at_idx ON public.audit_event USING btree (tenant_id, occurred_at DESC);

CREATE INDEX document_attachment_document_type_id_idx ON public.document_attachment USING btree (document_type_id);

CREATE INDEX document_attachment_owner_type_owner_id_idx ON public.document_attachment USING btree (owner_type, owner_id);

CREATE INDEX document_attachment_storage_kind_idx ON public.document_attachment USING btree (storage_kind);

CREATE INDEX document_attachment_tenant_created_at_idx ON public.document_attachment USING btree (tenant_id, created_at DESC);

CREATE INDEX document_download_audit_attachment_id_downloaded_at_idx ON public.document_download_audit USING btree (attachment_id, downloaded_at);

CREATE INDEX document_download_audit_tenant_downloaded_at_idx ON public.document_download_audit USING btree (tenant_id, downloaded_at DESC);

CREATE INDEX document_download_audit_user_id_downloaded_at_idx ON public.document_download_audit USING btree (user_id, downloaded_at);

CREATE UNIQUE INDEX document_type_code_key ON public.document_type USING btree (tenant_id, code);

CREATE INDEX document_type_status_idx ON public.document_type USING btree (status);

CREATE UNIQUE INDEX document_upload_session_document_id_key ON public.document_upload_session USING btree (document_id);

CREATE INDEX document_upload_session_owner_type_owner_id_idx ON public.document_upload_session USING btree (owner_type, owner_id);

CREATE INDEX document_upload_session_requested_by_sub_created_at_idx ON public.document_upload_session USING btree (requested_by_sub, created_at);

CREATE INDEX document_upload_session_status_expires_at_idx ON public.document_upload_session USING btree (status, expires_at);

CREATE INDEX document_upload_session_tenant_expires_at_idx ON public.document_upload_session USING btree (tenant_id, expires_at DESC);

CREATE INDEX esocial_event_last_response_idx ON public.esocial_event USING btree (tenant_id, last_response_at DESC) WHERE (last_response_at IS NOT NULL);

CREATE INDEX esocial_event_payment_batch_idx ON public.esocial_event USING btree (tenant_id, payment_batch_id) WHERE (payment_batch_id IS NOT NULL);

CREATE INDEX esocial_event_payroll_run_idx ON public.esocial_event USING btree (tenant_id, payroll_run_id) WHERE (payroll_run_id IS NOT NULL);

CREATE INDEX esocial_event_response_code_idx ON public.esocial_event USING btree (tenant_id, response_code) WHERE (response_code IS NOT NULL);

CREATE INDEX esocial_event_s1xxx_source_idx ON public.esocial_event USING btree (tenant_id, event_kind, source_entity_kind, source_entity_id);

CREATE INDEX esocial_event_status_created_at_idx ON public.esocial_event USING btree (status, created_at);

CREATE INDEX esocial_event_type_competence_idx ON public.esocial_event USING btree (event_type, competence);

CREATE INDEX esocial_event_xml_hash_idx ON public.esocial_event USING btree (tenant_id, xml_hash) WHERE (xml_hash IS NOT NULL);

CREATE INDEX generated_report_file_attachment_id_idx ON public.generated_report_file USING btree (attachment_id);

CREATE INDEX generated_report_file_hash_idx ON public.generated_report_file USING btree (file_hash);

CREATE INDEX generated_report_file_payslip_employee_idx ON public.generated_report_file USING btree (tenant_id, employee_id, competence) WHERE (report_kind = 'PAYSLIP'::public."ReportKind");

CREATE INDEX generated_report_file_payslip_run_idx ON public.generated_report_file USING btree (tenant_id, payroll_run_id) WHERE (report_kind = 'PAYSLIP'::public."ReportKind");

CREATE INDEX generated_report_file_report_request_id_idx ON public.generated_report_file USING btree (report_request_id);

CREATE INDEX generated_report_file_tenant_generated_at_idx ON public.generated_report_file USING btree (tenant_id, generated_at DESC);

CREATE UNIQUE INDEX menu_item_code_key ON public.menu_item USING btree (tenant_id, code);

CREATE INDEX menu_item_module_key_status_idx ON public.menu_item USING btree (module_key, status);

CREATE INDEX menu_item_parent_id_idx ON public.menu_item USING btree (parent_id);

CREATE INDEX menu_item_profile_id_idx ON public.menu_item USING btree (profile_id);

CREATE INDEX menu_item_tenant_code_idx ON public.menu_item USING btree (tenant_id, code);

CREATE INDEX notification_module_key_idx ON public.notification USING btree (module_key);

CREATE INDEX notification_tenant_read_at_idx ON public.notification USING btree (tenant_id, read_at, created_at DESC);

CREATE INDEX notification_user_id_read_at_idx ON public.notification USING btree (user_id, read_at);

CREATE INDEX payslip_batch_payroll_run_idx ON public.payslip_batch USING btree (payroll_run_id);

CREATE INDEX payslip_batch_tenant_competence_idx ON public.payslip_batch USING btree (tenant_id, competence DESC, requested_at DESC);

CREATE UNIQUE INDEX permission_key_key ON public.permission USING btree (key);

CREATE INDEX permission_module_key_idx ON public.permission USING btree (module_key);

CREATE UNIQUE INDEX permission_module_key_resource_key_action_key_key ON public.permission USING btree (module_key, resource_key, action_key);

CREATE INDEX permission_resource_key_idx ON public.permission USING btree (resource_key);

CREATE INDEX profile_assignment_ends_at_idx ON public.profile_assignment USING btree (ends_at);

CREATE INDEX profile_assignment_profile_id_idx ON public.profile_assignment USING btree (profile_id);

CREATE UNIQUE INDEX profile_assignment_user_id_profile_id_starts_at_key ON public.profile_assignment USING btree (user_id, profile_id, starts_at);

CREATE INDEX profile_permission_permission_id_idx ON public.profile_permission USING btree (permission_id);

CREATE UNIQUE INDEX profile_permission_profile_id_permission_id_key ON public.profile_permission USING btree (profile_id, permission_id);

CREATE INDEX public_access_profile_tenant_id_idx ON public.access_profile USING btree (tenant_id);

CREATE INDEX public_audit_event_tenant_id_idx ON public.audit_event USING btree (tenant_id);

CREATE INDEX public_document_attachment_tenant_id_idx ON public.document_attachment USING btree (tenant_id);

CREATE INDEX public_document_download_audit_tenant_id_idx ON public.document_download_audit USING btree (tenant_id);

CREATE INDEX public_document_type_tenant_id_idx ON public.document_type USING btree (tenant_id);

CREATE INDEX public_document_upload_session_tenant_id_idx ON public.document_upload_session USING btree (tenant_id);

CREATE INDEX public_generated_report_file_tenant_id_idx ON public.generated_report_file USING btree (tenant_id);

CREATE INDEX public_menu_item_tenant_id_idx ON public.menu_item USING btree (tenant_id);

CREATE INDEX public_notification_tenant_id_idx ON public.notification USING btree (tenant_id);

CREATE INDEX public_profile_assignment_tenant_id_idx ON public.profile_assignment USING btree (tenant_id);

CREATE INDEX public_report_definition_tenant_id_idx ON public.report_definition USING btree (tenant_id);

CREATE INDEX public_report_request_tenant_id_idx ON public.report_request USING btree (tenant_id);

CREATE INDEX public_system_parameter_tenant_id_idx ON public.system_parameter USING btree (tenant_id);

CREATE INDEX public_user_account_tenant_id_idx ON public.user_account USING btree (tenant_id);

CREATE INDEX public_user_group_snapshot_tenant_id_idx ON public.user_group_snapshot USING btree (tenant_id);

CREATE UNIQUE INDEX report_definition_code_key ON public.report_definition USING btree (tenant_id, code);

CREATE INDEX report_definition_module_key_status_idx ON public.report_definition USING btree (module_key, status);

CREATE INDEX report_definition_tenant_code_idx ON public.report_definition USING btree (tenant_id, code);

CREATE INDEX report_request_branch_id_idx ON public.report_request USING btree (branch_id);

CREATE INDEX report_request_competence_year_competence_month_idx ON public.report_request USING btree (competence_year, competence_month);

CREATE INDEX report_request_definition_id_requested_at_idx ON public.report_request USING btree (definition_id, requested_at);

CREATE INDEX report_request_payroll_run_id_idx ON public.report_request USING btree (payroll_run_id);

CREATE INDEX report_request_processing_type_id_idx ON public.report_request USING btree (processing_type_id);

CREATE INDEX report_request_requested_by_user_id_idx ON public.report_request USING btree (requested_by_user_id);

CREATE INDEX report_request_status_idx ON public.report_request USING btree (status);

CREATE INDEX report_request_tenant_requested_at_idx ON public.report_request USING btree (tenant_id, requested_at DESC);

CREATE UNIQUE INDEX system_parameter_key_key ON public.system_parameter USING btree (tenant_id, key);

CREATE INDEX system_parameter_module_key_idx ON public.system_parameter USING btree (module_key);

CREATE INDEX system_parameter_tenant_module_key_idx ON public.system_parameter USING btree (tenant_id, module_key);

CREATE INDEX system_parameter_updated_by_user_id_idx ON public.system_parameter USING btree (updated_by_user_id);

CREATE UNIQUE INDEX tax_rate_irrf_bracket_uq ON public.tax_rate USING btree (tenant_id, kind, competence_start, bracket_min) WHERE (kind = 'IRRF'::text);

CREATE INDEX tax_rate_irrf_competence_idx ON public.tax_rate USING btree (tenant_id, kind, competence_start, competence_end, bracket_min) WHERE (kind = 'IRRF'::text);

CREATE UNIQUE INDEX tax_rate_rpps_bracket_uq ON public.tax_rate USING btree (tenant_id, kind, competence_start, bracket_min) WHERE (kind = 'RPPS'::text);

CREATE INDEX tax_rate_rpps_competence_idx ON public.tax_rate USING btree (tenant_id, kind, competence_start, competence_end, bracket_min) WHERE (kind = 'RPPS'::text);

CREATE INDEX tax_rate_scope_reference_year_idx ON public.tax_rate USING btree (scope, reference_year);

CREATE INDEX tax_rate_status_idx ON public.tax_rate USING btree (status);

CREATE UNIQUE INDEX tax_rate_tenant_code_key ON public.tax_rate USING btree (tenant_id, code);

CREATE UNIQUE INDEX tenant_code_key ON public.tenant USING btree (code);

CREATE UNIQUE INDEX tenant_slug_key ON public.tenant USING btree (slug);

CREATE INDEX tenant_status_idx ON public.tenant USING btree (status);

CREATE UNIQUE INDEX user_account_cognito_sub_key ON public.user_account USING btree (tenant_id, cognito_sub);

CREATE INDEX user_account_cpf_idx ON public.user_account USING btree (cpf);

CREATE UNIQUE INDEX user_account_cpf_key ON public.user_account USING btree (tenant_id, cpf);

CREATE UNIQUE INDEX user_account_email_key ON public.user_account USING btree (tenant_id, email);

CREATE UNIQUE INDEX user_account_login_key ON public.user_account USING btree (tenant_id, login);

CREATE INDEX user_account_status_idx ON public.user_account USING btree (status);

CREATE INDEX user_account_tenant_login_idx ON public.user_account USING btree (tenant_id, login);

CREATE INDEX user_group_snapshot_group_key_idx ON public.user_group_snapshot USING btree (group_key);

CREATE INDEX user_group_snapshot_user_id_captured_at_idx ON public.user_group_snapshot USING btree (user_id, captured_at);

CREATE TRIGGER audit_event_default_partition_auto_create BEFORE INSERT ON public.audit_event_default FOR EACH ROW EXECUTE FUNCTION public.sgp_audit_event_default_partition_redirect();

CREATE TRIGGER audit_event_immutable BEFORE DELETE OR UPDATE ON public.audit_event FOR EACH ROW EXECUTE FUNCTION public.sgp_audit_event_immutable();

CREATE TRIGGER trg_generated_report_file_audit AFTER INSERT OR DELETE OR UPDATE ON public.generated_report_file FOR EACH ROW EXECUTE FUNCTION public.audit_report_file_mutation();

CREATE TRIGGER trg_payslip_batch_audit AFTER INSERT OR DELETE OR UPDATE ON public.payslip_batch FOR EACH ROW EXECUTE FUNCTION public.audit_payslip_batch_mutation();

ALTER TABLE public.audit_event_default ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_event_default FORCE ROW LEVEL SECURITY;

SELECT public.sgp_create_audit_event_partitions();

ALTER TABLE public.audit_event
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

ALTER TABLE public.audit_event
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

ALTER TABLE ONLY public.esocial_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.system_parameter FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.access_profile FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.audit_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.document_attachment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.document_download_audit FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.document_type FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.document_upload_session FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.generated_report_file FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.menu_item FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.notification FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.payslip_batch FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.profile_assignment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.report_definition FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.report_request FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.tax_rate FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.user_account FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY public.user_group_snapshot FORCE ROW LEVEL SECURITY;

ALTER TABLE public.access_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_profile_select ON public.access_profile FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text]))));

CREATE POLICY access_profile_write ON public.access_profile USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE public.audit_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_event_insert ON public.audit_event FOR INSERT WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_is_authenticated())));

CREATE POLICY audit_event_select ON public.audit_event FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['auditoria.read'::text]))));

CREATE POLICY calc12_tax_rate_payroll_select ON public.tax_rate FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

ALTER TABLE public.document_attachment ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_attachment_select ON public.document_attachment FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['documents.download'::text, 'documents.register'::text, 'auditoria.read'::text]))));

CREATE POLICY document_attachment_write ON public.document_attachment USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['documents.register'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['documents.register'::text]))));

ALTER TABLE public.document_download_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_download_audit_insert ON public.document_download_audit FOR INSERT WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['documents.download'::text]))));

CREATE POLICY document_download_audit_select ON public.document_download_audit FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['auditoria.read'::text, 'documents.download'::text]))));

ALTER TABLE public.document_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_type_select ON public.document_type FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text]))));

CREATE POLICY document_type_write ON public.document_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE public.document_upload_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_upload_session_select ON public.document_upload_session FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['documents.upload'::text, 'documents.register'::text, 'auditoria.read'::text]))));

CREATE POLICY document_upload_session_write ON public.document_upload_session USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['documents.upload'::text, 'documents.register'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['documents.upload'::text, 'documents.register'::text]))));

ALTER TABLE public.esocial_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY esocial_event_select ON public.esocial_event FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text]))));

CREATE POLICY esocial_event_write ON public.esocial_event USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))));

ALTER TABLE public.generated_report_file ENABLE ROW LEVEL SECURITY;

CREATE POLICY generated_report_file_select ON public.generated_report_file FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text, 'documents.download'::text, 'report.payslip.read'::text, 'report.payslip.write'::text])) OR (public.sgp_tenant_matches(tenant_id) AND (report_kind = 'PAYSLIP'::public."ReportKind") AND (employee_id = public.sgp_current_employee_id()) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))));

CREATE POLICY generated_report_file_write ON public.generated_report_file USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.generate'::text, 'report.payslip.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.generate'::text, 'report.payslip.write'::text]))));

CREATE POLICY generated_report_file_yearly_income_select ON public.generated_report_file FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND (report_kind = 'YEARLY_INCOME_REPORT'::public."ReportKind") AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.read'::text, 'fiscal.yearly_income.write'::text, 'report.payslip.read'::text])) OR (public.sgp_tenant_matches(tenant_id) AND (report_kind = 'YEARLY_INCOME_REPORT'::public."ReportKind") AND (employee_id = public.sgp_current_employee_id()) AND public.sgp_has_any_permission(ARRAY['portal.yearly_income.read'::text]))));

CREATE POLICY generated_report_file_yearly_income_write ON public.generated_report_file USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND (report_kind = 'YEARLY_INCOME_REPORT'::public."ReportKind") AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND (report_kind = 'YEARLY_INCOME_REPORT'::public."ReportKind") AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write'::text]))));

ALTER TABLE public.menu_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_item_select ON public.menu_item FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text]))));

CREATE POLICY menu_item_write ON public.menu_item USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_select ON public.notification FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_is_authenticated())));

CREATE POLICY notification_write ON public.notification USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_is_authenticated()))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_is_authenticated())));

ALTER TABLE public.payslip_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY payslip_batch_select ON public.payslip_batch FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['report.payslip.read'::text, 'report.payslip.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY payslip_batch_write ON public.payslip_batch USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['report.payslip.write'::text, 'relatorio.generate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['report.payslip.write'::text, 'relatorio.generate'::text]))));

ALTER TABLE public.profile_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_assignment_select ON public.profile_assignment FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text]))));

CREATE POLICY profile_assignment_write ON public.profile_assignment USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE public.report_definition ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_definition_select ON public.report_definition FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY report_definition_write ON public.report_definition USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.generate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.generate'::text]))));

ALTER TABLE public.report_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_request_select ON public.report_request FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY report_request_write ON public.report_request USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.generate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['relatorio.generate'::text]))));

ALTER TABLE public.system_parameter ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_parameter_select ON public.system_parameter FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text]))));

CREATE POLICY system_parameter_write ON public.system_parameter USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE public.tax_rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY tax_rate_select ON public.tax_rate FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'system.tax-rate.read'::text, 'system.tax-rate.write'::text]))));

CREATE POLICY tax_rate_write ON public.tax_rate USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['system.tax-rate.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['system.tax-rate.write'::text]))));

ALTER TABLE public.user_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_account_select ON public.user_account FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text]))));

CREATE POLICY user_account_write ON public.user_account USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE public.user_group_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_group_snapshot_select ON public.user_group_snapshot FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text]))));

CREATE POLICY user_group_snapshot_write ON public.user_group_snapshot USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

COMMENT ON SCHEMA public IS 'standard public schema';

COMMENT ON TABLE public.audit_event IS 'Immutable audit trail for all mutating SGP transactions. Events are append-only, protected from UPDATE/DELETE, and partitioned monthly by occurred_at. Destructive retention/drop/detach policy is owner-decision gated.';

COMMENT ON COLUMN public.tax_rate.rate_percent IS 'Legal rate/factor value; numeric(18,6); rounded half-away-from-zero only at policy boundary.';
