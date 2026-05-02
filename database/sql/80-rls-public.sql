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
