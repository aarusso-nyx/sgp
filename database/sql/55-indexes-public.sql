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
