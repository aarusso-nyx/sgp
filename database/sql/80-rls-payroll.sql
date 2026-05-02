ALTER TABLE ONLY payroll.employee_payroll_item FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payment_remittance_detail FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payment_remittance_file FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payroll_run FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payroll_financial_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.accounting_account FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.accounting_account_work_location FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.accounting_history FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.advance_payment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.advance_request FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.blocked_payment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.employment_link_earning FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.formula_attribute FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.gps_payment_code FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.job_function_earning FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.job_position_earning FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payment_return_detail FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payment_return_file FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payroll_earning_deduction FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payroll_run_status_history FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payroll_run_work_location FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payroll_type FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.payroll_type_earning FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.processing_type FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.professional_category_earning FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.sefip_code FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payroll.simple_account FORCE ROW LEVEL SECURITY;

ALTER TABLE payroll.accounting_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounting_account_select ON payroll.accounting_account FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

ALTER TABLE payroll.accounting_account_work_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounting_account_work_location_select ON payroll.accounting_account_work_location FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY accounting_account_work_location_write ON payroll.accounting_account_work_location USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

CREATE POLICY accounting_account_write ON payroll.accounting_account USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

ALTER TABLE payroll.accounting_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounting_history_select ON payroll.accounting_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY accounting_history_write ON payroll.accounting_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

ALTER TABLE payroll.advance_payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY advance_payment_select ON payroll.advance_payment FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY advance_payment_write ON payroll.advance_payment USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

ALTER TABLE payroll.advance_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY advance_request_select ON payroll.advance_request FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY advance_request_write ON payroll.advance_request USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

ALTER TABLE payroll.blocked_payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_payment_select ON payroll.blocked_payment FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY blocked_payment_write ON payroll.blocked_payment USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

CREATE POLICY calc04_employee_payroll_item_execute ON payroll.employee_payroll_item USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_payroll_earning_deduction_execute ON payroll.payroll_earning_deduction USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_payroll_financial_record_execute ON payroll.payroll_financial_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_payroll_run_execute ON payroll.payroll_run USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_payroll_run_status_history_execute ON payroll.payroll_run_status_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_payroll_run_work_location_execute ON payroll.payroll_run_work_location USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_payroll_type_execute ON payroll.payroll_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_processing_type_execute ON payroll.processing_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc05_employee_payroll_item_execute ON payroll.employee_payroll_item USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_payroll_earning_deduction_execute ON payroll.payroll_earning_deduction USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_payroll_financial_record_execute ON payroll.payroll_financial_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_payroll_run_execute ON payroll.payroll_run USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_payroll_run_status_history_execute ON payroll.payroll_run_status_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_payroll_type_execute ON payroll.payroll_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_processing_type_execute ON payroll.processing_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc09_employee_payroll_item_select ON payroll.employee_payroll_item FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'payroll.run.execute'::text, 'auditoria.read'::text]))));

CREATE POLICY calc09_employee_payroll_item_write ON payroll.employee_payroll_item USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text]))));

CREATE POLICY calc09_payroll_financial_record_select ON payroll.payroll_financial_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'payroll.run.execute'::text, 'auditoria.read'::text]))));

CREATE POLICY calc09_payroll_financial_record_write ON payroll.payroll_financial_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text]))));

CREATE POLICY calc09_payroll_run_select ON payroll.payroll_run FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'payroll.run.execute'::text, 'auditoria.read'::text]))));

CREATE POLICY calc09_payroll_run_status_history_select ON payroll.payroll_run_status_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'payroll.run.execute'::text, 'auditoria.read'::text]))));

CREATE POLICY calc09_payroll_run_status_history_write ON payroll.payroll_run_status_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text]))));

CREATE POLICY calc09_payroll_run_work_location_select ON payroll.payroll_run_work_location FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'payroll.run.execute'::text, 'auditoria.read'::text]))));

CREATE POLICY calc09_payroll_run_work_location_write ON payroll.payroll_run_work_location USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text]))));

CREATE POLICY calc09_payroll_run_write ON payroll.payroll_run USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text, 'payroll.run.execute'::text]))));

CREATE POLICY calc11_employee_payroll_item_portal_paystub_select ON payroll.employee_payroll_item FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))));

CREATE POLICY calc11_payroll_earning_deduction_portal_paystub_select ON payroll.payroll_earning_deduction FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))));

CREATE POLICY calc11_payroll_financial_record_portal_paystub_select ON payroll.payroll_financial_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))));

CREATE POLICY calc11_payroll_run_portal_paystub_select ON payroll.payroll_run FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))));

CREATE POLICY calc11_payroll_run_status_history_portal_paystub_select ON payroll.payroll_run_status_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))));

CREATE POLICY calc12_employee_payroll_item_execute ON payroll.employee_payroll_item USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_payroll_earning_deduction_execute ON payroll.payroll_earning_deduction USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_payroll_financial_record_execute ON payroll.payroll_financial_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_payroll_run_execute ON payroll.payroll_run USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_payroll_run_status_history_execute ON payroll.payroll_run_status_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_payroll_type_execute ON payroll.payroll_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_processing_type_execute ON payroll.processing_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

ALTER TABLE payroll.employee_payroll_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_payroll_item_select ON payroll.employee_payroll_item FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY employee_payroll_item_write ON payroll.employee_payroll_item USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

ALTER TABLE payroll.employment_link_earning ENABLE ROW LEVEL SECURITY;

CREATE POLICY employment_link_earning_select ON payroll.employment_link_earning FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employment_link_earning_write ON payroll.employment_link_earning USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

CREATE POLICY fol01_formula_attribute_select ON payroll.formula_attribute FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.read'::text, 'folha.rubrica.write'::text, 'folha.rubrica.preview'::text, 'payroll.formula.read'::text, 'payroll.formula.write'::text]))));

CREATE POLICY fol01_formula_attribute_write ON payroll.formula_attribute USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.write'::text, 'payroll.formula.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.write'::text, 'payroll.formula.write'::text]))));

CREATE POLICY fol01_job_position_earning_select ON payroll.job_position_earning FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.read'::text, 'folha.rubrica.write'::text, 'folha.rubrica.preview'::text, 'payroll.formula.read'::text, 'payroll.formula.write'::text]))));

CREATE POLICY fol01_job_position_earning_write ON payroll.job_position_earning USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.write'::text, 'payroll.formula.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.write'::text, 'payroll.formula.write'::text]))));

CREATE POLICY fol01_payroll_earning_deduction_select ON payroll.payroll_earning_deduction FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.read'::text, 'folha.rubrica.write'::text, 'folha.rubrica.preview'::text, 'payroll.formula.read'::text, 'payroll.formula.write'::text]))));

CREATE POLICY fol01_payroll_earning_deduction_write ON payroll.payroll_earning_deduction USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.write'::text, 'payroll.formula.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.rubrica.write'::text, 'payroll.formula.write'::text]))));

ALTER TABLE payroll.formula_attribute ENABLE ROW LEVEL SECURITY;

ALTER TABLE payroll.gps_payment_code ENABLE ROW LEVEL SECURITY;

CREATE POLICY gps_payment_code_select ON payroll.gps_payment_code FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY gps_payment_code_write ON payroll.gps_payment_code USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

ALTER TABLE payroll.job_function_earning ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_function_earning_select ON payroll.job_function_earning FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY job_function_earning_write ON payroll.job_function_earning USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

ALTER TABLE payroll.job_position_earning ENABLE ROW LEVEL SECURITY;

ALTER TABLE payroll.payment_remittance_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_remittance_detail_rw ON payroll.payment_remittance_detail USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.remittance.read'::text, 'payment.remittance.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.remittance.write'::text]))));

ALTER TABLE payroll.payment_remittance_file ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_remittance_file_rw ON payroll.payment_remittance_file USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.remittance.read'::text, 'payment.remittance.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.remittance.write'::text]))));

ALTER TABLE payroll.payment_return_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_return_detail_rw ON payroll.payment_return_detail USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.return.read'::text, 'payment.return.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.return.write'::text]))));

ALTER TABLE payroll.payment_return_file ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_return_file_rw ON payroll.payment_return_file USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.return.read'::text, 'payment.return.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.return.write'::text]))));

ALTER TABLE payroll.payroll_earning_deduction ENABLE ROW LEVEL SECURITY;

ALTER TABLE payroll.payroll_financial_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_financial_record_select ON payroll.payroll_financial_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY payroll_financial_record_write ON payroll.payroll_financial_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

ALTER TABLE payroll.payroll_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_run_select ON payroll.payroll_run FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

ALTER TABLE payroll.payroll_run_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_run_status_history_select ON payroll.payroll_run_status_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY payroll_run_status_history_write ON payroll.payroll_run_status_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

ALTER TABLE payroll.payroll_run_work_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_run_work_location_select ON payroll.payroll_run_work_location FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text, 'auditoria.read'::text]))));

CREATE POLICY payroll_run_work_location_write ON payroll.payroll_run_work_location USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

CREATE POLICY payroll_run_write ON payroll.payroll_run USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

ALTER TABLE payroll.payroll_type ENABLE ROW LEVEL SECURITY;

ALTER TABLE payroll.payroll_type_earning ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_type_earning_select ON payroll.payroll_type_earning FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY payroll_type_earning_write ON payroll.payroll_type_earning USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

CREATE POLICY payroll_type_select ON payroll.payroll_type FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY payroll_type_write ON payroll.payroll_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

ALTER TABLE payroll.processing_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY processing_type_select ON payroll.processing_type FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY processing_type_write ON payroll.processing_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

ALTER TABLE payroll.professional_category_earning ENABLE ROW LEVEL SECURITY;

CREATE POLICY professional_category_earning_select ON payroll.professional_category_earning FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY professional_category_earning_write ON payroll.professional_category_earning USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

ALTER TABLE payroll.sefip_code ENABLE ROW LEVEL SECURITY;

CREATE POLICY sefip_code_select ON payroll.sefip_code FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY sefip_code_write ON payroll.sefip_code USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));

ALTER TABLE payroll.simple_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY simple_account_select ON payroll.simple_account FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY simple_account_write ON payroll.simple_account USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text, 'folha.write'::text]))));
