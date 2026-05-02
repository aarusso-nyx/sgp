ALTER TABLE ONLY hr.branch FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.company FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employment_link FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.absence_reason FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.act_classification FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.administrative_process FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.administrative_process_function FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.agreement FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.bank FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.beneficiary_contact_history FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.business_day FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.cadastral_change_request FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.career_plan FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.competence_period FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.consignment_entity FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.consignment_import_job FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.contract_type FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.contribution_time_certificate FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.cost_center FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.education_institution FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_alimony FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_alimony_history FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_bank_account FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_bank_account_history FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_benefit_dependent FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_complement_data FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_dependent FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_exercise FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_frequency FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_payroll_item_import_job FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_status_history FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_transfer FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_transit_benefit FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employee_union_contribution FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.employment_contract FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.external_life_proof FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.file_export_job FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.function_nature FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.functional_status FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.health_exam_provider_exam_link FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.health_provider_agreement_link FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.internship_program FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.internship_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.job_function FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.job_function_legislation_history FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.job_position FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.job_structure_employment_link FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.job_structure_reference_link FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.leave_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.legal_nature FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.legal_responsible FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.legislation FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.medical_appointment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.medical_leave FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.medical_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.merit_progression FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.pension_compensation FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.pension_grant FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.performance_evaluation FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.previdentiary_declaration FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.probation_evaluation FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.professional_experience FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.reason FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.recertification_beneficiary FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.recertification_campaign FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.recertification_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.recruitment_candidate FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.recruitment_request FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.recruitment_request_function FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.reference_catalog_entry FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.reintegration_order FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.retirement_grant FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.retirement_rule FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.retirement_simulation FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.salary_level_history FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.salary_range FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.salary_range_level FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.salary_reference FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.salary_simulation FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.salary_simulation_adjustment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.service_provider FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.service_taker FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.service_time_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.shift FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.shift_day_off FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.termination_reason FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.training_suggestion FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.training_suggestion_complement FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.training_suggestion_cost FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.training_suggestion_employee FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.transit_benefit FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.tsv_contract FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.tsv_contract_change FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.union_entity FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.vacation_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.vacation_type FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.work_accident FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.work_location FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY hr.work_location_structure_assignment FORCE ROW LEVEL SECURITY;

ALTER TABLE hr.absence_reason ENABLE ROW LEVEL SECURITY;

CREATE POLICY absence_reason_select ON hr.absence_reason FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY absence_reason_write ON hr.absence_reason USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.act_classification ENABLE ROW LEVEL SECURITY;

CREATE POLICY act_classification_select ON hr.act_classification FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY act_classification_write ON hr.act_classification USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.administrative_process ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.administrative_process_function ENABLE ROW LEVEL SECURITY;

CREATE POLICY administrative_process_function_select ON hr.administrative_process_function FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY administrative_process_function_write ON hr.administrative_process_function USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

CREATE POLICY administrative_process_select ON hr.administrative_process FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY administrative_process_write ON hr.administrative_process USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.agreement ENABLE ROW LEVEL SECURITY;

CREATE POLICY agreement_select ON hr.agreement FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.read'::text, 'convenio.write'::text]))));

CREATE POLICY agreement_write ON hr.agreement USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.write'::text]))));

ALTER TABLE hr.bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_select ON hr.bank FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY bank_write ON hr.bank USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.beneficiary_contact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY beneficiary_contact_history_select ON hr.beneficiary_contact_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY beneficiary_contact_history_write ON hr.beneficiary_contact_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.branch ENABLE ROW LEVEL SECURITY;

CREATE POLICY branch_select ON hr.branch FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY branch_write ON hr.branch USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.business_day ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_day_select ON hr.business_day FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY business_day_write ON hr.business_day USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.cadastral_change_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY calc04_employee_execute_read ON hr.employee FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_employee_status_history_execute_read ON hr.employee_status_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_functional_status_execute_read ON hr.functional_status FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc04_salary_reference_execute_read ON hr.salary_reference FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text]))));

CREATE POLICY calc05_employee_dependent_vacation_payroll ON hr.employee_dependent USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_employee_vacation_payroll ON hr.employee USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_employment_link_vacation_payroll ON hr.employment_link USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_salary_reference_vacation_payroll ON hr.salary_reference USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc05_vacation_record_vacation_payroll ON hr.vacation_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.vacation.payout'::text]))));

CREATE POLICY calc11_competence_period_monthly_write ON hr.competence_period USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['folha.write'::text]))));

CREATE POLICY calc11_competence_period_portal_paystub_select ON hr.competence_period FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))));

CREATE POLICY calc11_employee_portal_paystub_select ON hr.employee FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))));

CREATE POLICY calc12_employee_dependent_termination_payroll ON hr.employee_dependent USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_employee_status_history_termination_payroll ON hr.employee_status_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_employee_termination_payroll ON hr.employee USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_employment_link_termination_payroll ON hr.employment_link USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_functional_status_termination_payroll ON hr.functional_status USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

CREATE POLICY calc12_salary_reference_termination_payroll ON hr.salary_reference USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text]))));

ALTER TABLE hr.career_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_plan_select ON hr.career_plan FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.read'::text, 'avaliacao.write'::text]))));

CREATE POLICY career_plan_write ON hr.career_plan USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.write'::text]))));

ALTER TABLE hr.company ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_select ON hr.company FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY company_write ON hr.company USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.competence_period ENABLE ROW LEVEL SECURITY;

CREATE POLICY competence_period_select ON hr.competence_period FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY competence_period_write ON hr.competence_period USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.consignment_entity ENABLE ROW LEVEL SECURITY;

CREATE POLICY consignment_entity_select ON hr.consignment_entity FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY consignment_entity_write ON hr.consignment_entity USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.consignment_import_job ENABLE ROW LEVEL SECURITY;

CREATE POLICY consignment_import_job_select ON hr.consignment_import_job FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY consignment_import_job_write ON hr.consignment_import_job USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.contract_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_type_select ON hr.contract_type FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY contract_type_write ON hr.contract_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.contribution_time_certificate ENABLE ROW LEVEL SECURITY;

CREATE POLICY contribution_time_certificate_select ON hr.contribution_time_certificate FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY contribution_time_certificate_write ON hr.contribution_time_certificate USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.cost_center ENABLE ROW LEVEL SECURITY;

CREATE POLICY cost_center_select ON hr.cost_center FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY cost_center_write ON hr.cost_center USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.education_institution ENABLE ROW LEVEL SECURITY;

CREATE POLICY education_institution_select ON hr.education_institution FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.read'::text, 'convenio.write'::text]))));

CREATE POLICY education_institution_write ON hr.education_institution USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.write'::text]))));

ALTER TABLE hr.employee ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.employee_alimony ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.employee_alimony_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_alimony_history_rw ON hr.employee_alimony_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.alimony.read'::text, 'hr.alimony.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.alimony.write'::text]))));

CREATE POLICY employee_alimony_rw ON hr.employee_alimony USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.alimony.read'::text, 'hr.alimony.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.alimony.write'::text]))));

CREATE POLICY employee_alimony_select ON hr.employee_alimony FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_alimony_write ON hr.employee_alimony USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.employee_bank_account ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.employee_bank_account_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.employee_benefit_dependent ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_benefit_dependent_select ON hr.employee_benefit_dependent FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_benefit_dependent_write ON hr.employee_benefit_dependent USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.employee_complement_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_complement_data_select ON hr.employee_complement_data FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_complement_data_write ON hr.employee_complement_data USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.employee_dependent ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.employee_exercise ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_exercise_select ON hr.employee_exercise FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_exercise_write ON hr.employee_exercise USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.employee_frequency ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_frequency_select ON hr.employee_frequency FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_frequency_write ON hr.employee_frequency USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.employee_payroll_item_import_job ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_payroll_item_import_job_select ON hr.employee_payroll_item_import_job FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_payroll_item_import_job_write ON hr.employee_payroll_item_import_job USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

CREATE POLICY employee_select ON hr.employee FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

ALTER TABLE hr.employee_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_status_history_select ON hr.employee_status_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_status_history_write ON hr.employee_status_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.employee_transfer ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_transfer_select ON hr.employee_transfer FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.movimentacao.read'::text, 'rh.movimentacao.request'::text, 'rh.movimentacao.approve'::text, 'rh.movimentacao.effect'::text]))));

CREATE POLICY employee_transfer_write ON hr.employee_transfer USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.movimentacao.request'::text, 'rh.movimentacao.approve'::text, 'rh.movimentacao.effect'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.movimentacao.request'::text, 'rh.movimentacao.approve'::text, 'rh.movimentacao.effect'::text]))));

ALTER TABLE hr.employee_transit_benefit ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_transit_benefit_select ON hr.employee_transit_benefit FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_transit_benefit_write ON hr.employee_transit_benefit USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.employee_union_contribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_union_contribution_select ON hr.employee_union_contribution FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employee_union_contribution_write ON hr.employee_union_contribution USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

CREATE POLICY employee_write ON hr.employee USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.employment_contract ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.employment_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY employment_link_select ON hr.employment_link FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY employment_link_write ON hr.employment_link USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.external_life_proof ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_life_proof_select ON hr.external_life_proof FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY external_life_proof_write ON hr.external_life_proof USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.file_export_job ENABLE ROW LEVEL SECURITY;

CREATE POLICY file_export_job_select ON hr.file_export_job FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY file_export_job_write ON hr.file_export_job USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

CREATE POLICY fol02_job_position_select ON hr.job_position FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.read'::text, 'gestao.cargo.write'::text]))));

CREATE POLICY fol02_job_position_write ON hr.job_position USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.write'::text]))));

CREATE POLICY fol02_salary_range_level_select ON hr.salary_range_level FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.read'::text, 'gestao.cargo.write'::text]))));

CREATE POLICY fol02_salary_range_level_write ON hr.salary_range_level USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.write'::text]))));

CREATE POLICY fol02_salary_range_select ON hr.salary_range FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.read'::text, 'gestao.cargo.write'::text]))));

CREATE POLICY fol02_salary_range_write ON hr.salary_range USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.cargo.write'::text]))));

CREATE POLICY fol05_salary_level_history_select ON hr.salary_level_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.read'::text, 'avaliacao.salary_history.write'::text]))));

CREATE POLICY fol05_salary_level_history_write ON hr.salary_level_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.write'::text]))));

CREATE POLICY fol05_salary_reference_select ON hr.salary_reference FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.read'::text, 'avaliacao.salary_history.write'::text]))));

CREATE POLICY fol05_salary_reference_write ON hr.salary_reference USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.salary_history.write'::text]))));

ALTER TABLE hr.function_nature ENABLE ROW LEVEL SECURITY;

CREATE POLICY function_nature_select ON hr.function_nature FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY function_nature_write ON hr.function_nature USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.functional_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY functional_status_select ON hr.functional_status FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY functional_status_write ON hr.functional_status USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.health_exam_provider_exam_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_exam_provider_exam_link_select ON hr.health_exam_provider_exam_link FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY health_exam_provider_exam_link_write ON hr.health_exam_provider_exam_link USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.health_provider_agreement_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_provider_agreement_link_select ON hr.health_provider_agreement_link FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY health_provider_agreement_link_write ON hr.health_provider_agreement_link USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

CREATE POLICY hr01_employee_read ON hr.employee FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.read'::text, 'rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text])));

CREATE POLICY hr01_employee_read ON hr.employee_status_history FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.read'::text, 'rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text])));

CREATE POLICY hr01_employee_read ON hr.employment_contract FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.read'::text, 'rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text])));

CREATE POLICY hr01_employee_read ON hr.employment_link FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.read'::text, 'rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text, 'rh.employment_link.write'::text])));

CREATE POLICY hr01_employee_write ON hr.employee USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text])));

CREATE POLICY hr01_employee_write ON hr.employee_status_history USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text])));

CREATE POLICY hr01_employee_write ON hr.employment_contract USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text])));

CREATE POLICY hr01_employee_write ON hr.employment_link USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text, 'rh.employment_link.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text, 'rh.employee.admit'::text, 'rh.employee.terminate'::text, 'rh.employment_link.write'::text])));

CREATE POLICY hr06_org_structure_delete ON hr.cost_center FOR DELETE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_delete ON hr.job_function FOR DELETE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_delete ON hr.job_position FOR DELETE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_delete ON hr.job_structure_employment_link FOR DELETE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_delete ON hr.work_location FOR DELETE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_delete ON hr.work_location_structure_assignment FOR DELETE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_read ON hr.cost_center FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.read'::text, 'gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_read ON hr.job_function FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.read'::text, 'gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_read ON hr.job_position FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.read'::text, 'gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_read ON hr.job_structure_employment_link FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.read'::text, 'gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_read ON hr.work_location FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.read'::text, 'gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_read ON hr.work_location_structure_assignment FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.read'::text, 'gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_update ON hr.cost_center FOR UPDATE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_update ON hr.job_function FOR UPDATE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_update ON hr.job_position FOR UPDATE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_update ON hr.job_structure_employment_link FOR UPDATE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_update ON hr.work_location FOR UPDATE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_update ON hr.work_location_structure_assignment FOR UPDATE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_write ON hr.cost_center FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_write ON hr.job_function FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_write ON hr.job_position FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_write ON hr.job_structure_employment_link FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_write ON hr.work_location FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr06_org_structure_write ON hr.work_location_structure_assignment FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])));

CREATE POLICY hr08_service_time_select ON hr.service_time_record FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.history.read'::text, 'rh.employee.read'::text])));

CREATE POLICY hr08_service_time_write ON hr.service_time_record USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.employee.write'::text])));

ALTER TABLE hr.internship_program ENABLE ROW LEVEL SECURITY;

CREATE POLICY internship_program_select ON hr.internship_program FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.read'::text, 'convenio.write'::text]))));

CREATE POLICY internship_program_write ON hr.internship_program USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.write'::text]))));

ALTER TABLE hr.internship_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY internship_record_select ON hr.internship_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.read'::text, 'convenio.write'::text]))));

CREATE POLICY internship_record_write ON hr.internship_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['convenio.write'::text]))));

ALTER TABLE hr.job_function ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.job_function_legislation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_function_legislation_history_select ON hr.job_function_legislation_history FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY job_function_legislation_history_write ON hr.job_function_legislation_history USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

CREATE POLICY job_function_select ON hr.job_function FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY job_function_write ON hr.job_function USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.job_position ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.job_structure_employment_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_structure_employment_link_select ON hr.job_structure_employment_link FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY job_structure_employment_link_write ON hr.job_structure_employment_link USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.job_structure_reference_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_structure_reference_link_select ON hr.job_structure_reference_link FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY job_structure_reference_link_write ON hr.job_structure_reference_link USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.leave_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_record_select ON hr.leave_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY leave_record_write ON hr.leave_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.legal_nature ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_nature_select ON hr.legal_nature FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY legal_nature_write ON hr.legal_nature USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.legal_responsible ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_responsible_select ON hr.legal_responsible FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY legal_responsible_write ON hr.legal_responsible USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.legislation ENABLE ROW LEVEL SECURITY;

CREATE POLICY legislation_select ON hr.legislation FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY legislation_write ON hr.legislation USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.medical_appointment ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.medical_leave ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.medical_record ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.merit_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY merit_progression_select ON hr.merit_progression FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.progressao.read'::text, 'avaliacao.progressao.simulate'::text, 'avaliacao.progressao.apply'::text, 'avaliacao.progressao.revoke'::text]))));

CREATE POLICY merit_progression_write ON hr.merit_progression USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.progressao.simulate'::text, 'avaliacao.progressao.apply'::text, 'avaliacao.progressao.revoke'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.progressao.simulate'::text, 'avaliacao.progressao.apply'::text, 'avaliacao.progressao.revoke'::text]))));

CREATE POLICY p_cadastral_change_request_select ON hr.cadastral_change_request FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.profile.read'::text, 'portal.profile.write'::text, 'rh.cadastral_change.approve'::text])));

CREATE POLICY p_cadastral_change_request_update ON hr.cadastral_change_request FOR UPDATE USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.cadastral_change.approve'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.cadastral_change.approve'::text])));

CREATE POLICY p_cadastral_change_request_write ON hr.cadastral_change_request FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.profile.write'::text, 'rh.cadastral_change.approve'::text])));

CREATE POLICY p_employee_bank_account_history_rw ON hr.employee_bank_account_history USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.bank_account.read'::text, 'hr.bank_account.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.bank_account.write'::text])));

CREATE POLICY p_employee_bank_account_rw ON hr.employee_bank_account USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.bank_account.read'::text, 'hr.bank_account.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.bank_account.write'::text])));

CREATE POLICY p_employee_dependent_rw ON hr.employee_dependent USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.dependent.read'::text, 'rh.dependent.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.dependent.write'::text])));

CREATE POLICY p_leave_record_select ON hr.leave_record FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.leave.read'::text, 'rh.leave.request'::text, 'rh.leave.approve'::text, 'rh.medical_leave.read'::text, 'rh.read'::text, 'rh.write'::text])));

CREATE POLICY p_leave_record_write ON hr.leave_record USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.leave.request'::text, 'rh.leave.approve'::text, 'saude.opinion.write'::text, 'rh.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.leave.request'::text, 'rh.leave.approve'::text, 'saude.opinion.write'::text, 'rh.write'::text])));

CREATE POLICY p_leave_status_history_write ON hr.employee_status_history FOR INSERT WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.leave.approve'::text, 'rh.write'::text])));

CREATE POLICY p_medical_appointment_select ON hr.medical_appointment FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.read'::text, 'saude.appointment.write'::text]))));

CREATE POLICY p_medical_appointment_write ON hr.medical_appointment USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.appointment.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.appointment.write'::text]))));

CREATE POLICY p_medical_leave_select ON hr.medical_leave FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.medical_leave.read'::text, 'saude.read'::text, 'saude.opinion.write'::text]))));

CREATE POLICY p_medical_leave_write ON hr.medical_leave USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'::text]))));

CREATE POLICY p_medical_record_select ON hr.medical_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.read'::text, 'saude.opinion.write'::text]))));

CREATE POLICY p_medical_record_write ON hr.medical_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'::text]))));

CREATE POLICY p_probation_evaluation_select ON hr.probation_evaluation FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.read'::text, 'avaliacao.probation.write'::text])));

CREATE POLICY p_probation_evaluation_write ON hr.probation_evaluation USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.probation.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.probation.write'::text])));

CREATE POLICY p_vacation_record_select ON hr.vacation_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.vacation.read'::text, 'rh.vacation.request'::text, 'rh.vacation.approve'::text]))));

CREATE POLICY p_vacation_record_write ON hr.vacation_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.vacation.request'::text, 'rh.vacation.approve'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.vacation.request'::text, 'rh.vacation.approve'::text]))));

CREATE POLICY p_vacation_type_select ON hr.vacation_type FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.vacation.read'::text, 'rh.vacation.request'::text, 'rh.vacation.approve'::text, 'gestao.master_data.read'::text]))));

CREATE POLICY p_vacation_type_write ON hr.vacation_type USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'::text]))));

ALTER TABLE hr.pension_compensation ENABLE ROW LEVEL SECURITY;

CREATE POLICY pension_compensation_select ON hr.pension_compensation FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY pension_compensation_write ON hr.pension_compensation USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.pension_grant ENABLE ROW LEVEL SECURITY;

CREATE POLICY pension_grant_select ON hr.pension_grant FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY pension_grant_write ON hr.pension_grant USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.performance_evaluation ENABLE ROW LEVEL SECURITY;

CREATE POLICY performance_evaluation_select ON hr.performance_evaluation FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.read'::text, 'avaliacao.write'::text, 'avaliacao.progressao.read'::text, 'avaliacao.progressao.simulate'::text, 'avaliacao.progressao.apply'::text]))));

CREATE POLICY performance_evaluation_write ON hr.performance_evaluation USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.write'::text]))));

ALTER TABLE hr.previdentiary_declaration ENABLE ROW LEVEL SECURITY;

CREATE POLICY previdentiary_declaration_select ON hr.previdentiary_declaration FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY previdentiary_declaration_write ON hr.previdentiary_declaration USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.probation_evaluation ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.professional_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY professional_experience_select ON hr.professional_experience FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY professional_experience_write ON hr.professional_experience USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.reason ENABLE ROW LEVEL SECURITY;

CREATE POLICY reason_select ON hr.reason FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY reason_write ON hr.reason USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.recertification_beneficiary ENABLE ROW LEVEL SECURITY;

CREATE POLICY recertification_beneficiary_select ON hr.recertification_beneficiary FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY recertification_beneficiary_write ON hr.recertification_beneficiary USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.recertification_campaign ENABLE ROW LEVEL SECURITY;

CREATE POLICY recertification_campaign_select ON hr.recertification_campaign FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY recertification_campaign_write ON hr.recertification_campaign USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.recertification_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY recertification_record_select ON hr.recertification_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY recertification_record_write ON hr.recertification_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.recruitment_candidate ENABLE ROW LEVEL SECURITY;

CREATE POLICY recruitment_candidate_select ON hr.recruitment_candidate FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY recruitment_candidate_write ON hr.recruitment_candidate USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text]))));

ALTER TABLE hr.recruitment_request ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.recruitment_request_function ENABLE ROW LEVEL SECURITY;

CREATE POLICY recruitment_request_function_select ON hr.recruitment_request_function FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY recruitment_request_function_write ON hr.recruitment_request_function USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text]))));

CREATE POLICY recruitment_request_select ON hr.recruitment_request FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY recruitment_request_write ON hr.recruitment_request USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text]))));

ALTER TABLE hr.reference_catalog_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_catalog_entry_select ON hr.reference_catalog_entry FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY reference_catalog_entry_write ON hr.reference_catalog_entry USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.reintegration_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY reintegration_order_read ON hr.reintegration_order FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY reintegration_order_write ON hr.reintegration_order USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

ALTER TABLE hr.retirement_grant ENABLE ROW LEVEL SECURITY;

CREATE POLICY retirement_grant_select ON hr.retirement_grant FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY retirement_grant_write ON hr.retirement_grant USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.retirement_rule ENABLE ROW LEVEL SECURITY;

CREATE POLICY retirement_rule_select ON hr.retirement_rule FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY retirement_rule_write ON hr.retirement_rule USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.retirement_simulation ENABLE ROW LEVEL SECURITY;

CREATE POLICY retirement_simulation_select ON hr.retirement_simulation FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.read'::text, 'previdenciario.write'::text]))));

CREATE POLICY retirement_simulation_write ON hr.retirement_simulation USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['previdenciario.write'::text]))));

ALTER TABLE hr.salary_level_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.salary_range ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.salary_range_level ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.salary_reference ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.salary_simulation ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.salary_simulation_adjustment ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_simulation_adjustment_select ON hr.salary_simulation_adjustment FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.read'::text, 'avaliacao.write'::text]))));

CREATE POLICY salary_simulation_adjustment_write ON hr.salary_simulation_adjustment USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.write'::text]))));

CREATE POLICY salary_simulation_select ON hr.salary_simulation FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.progressao.read'::text, 'avaliacao.progressao.simulate'::text, 'avaliacao.progressao.apply'::text, 'avaliacao.progressao.revoke'::text]))));

CREATE POLICY salary_simulation_write ON hr.salary_simulation USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.progressao.simulate'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['avaliacao.progressao.simulate'::text]))));

ALTER TABLE hr.service_provider ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_provider_select ON hr.service_provider FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY service_provider_write ON hr.service_provider USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.service_taker ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_taker_select ON hr.service_taker FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY service_taker_write ON hr.service_taker USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.service_time_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_time_record_select ON hr.service_time_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY service_time_record_write ON hr.service_time_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.shift ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.shift_day_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_day_off_select ON hr.shift_day_off FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY shift_day_off_write ON hr.shift_day_off USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

CREATE POLICY shift_select ON hr.shift FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY shift_write ON hr.shift USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.termination_reason ENABLE ROW LEVEL SECURITY;

CREATE POLICY termination_reason_select ON hr.termination_reason FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY termination_reason_write ON hr.termination_reason USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.training_suggestion ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.training_suggestion_complement ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_suggestion_complement_select ON hr.training_suggestion_complement FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY training_suggestion_complement_write ON hr.training_suggestion_complement USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.training_suggestion_cost ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_suggestion_cost_select ON hr.training_suggestion_cost FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY training_suggestion_cost_write ON hr.training_suggestion_cost USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.training_suggestion_employee ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_suggestion_employee_select ON hr.training_suggestion_employee FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY training_suggestion_employee_write ON hr.training_suggestion_employee USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

CREATE POLICY training_suggestion_select ON hr.training_suggestion FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY training_suggestion_write ON hr.training_suggestion USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.transit_benefit ENABLE ROW LEVEL SECURITY;

CREATE POLICY transit_benefit_select ON hr.transit_benefit FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY transit_benefit_write ON hr.transit_benefit USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.tsv_contract ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.tsv_contract_change ENABLE ROW LEVEL SECURITY;

CREATE POLICY tsv_contract_change_read ON hr.tsv_contract_change FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.read'::text, 'hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY tsv_contract_change_write ON hr.tsv_contract_change USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.write'::text])));

CREATE POLICY tsv_contract_read ON hr.tsv_contract FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.read'::text, 'hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY tsv_contract_write ON hr.tsv_contract USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.write'::text])));

ALTER TABLE hr.union_entity ENABLE ROW LEVEL SECURITY;

CREATE POLICY union_entity_select ON hr.union_entity FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY union_entity_write ON hr.union_entity USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

ALTER TABLE hr.vacation_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY vacation_record_select ON hr.vacation_record FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY vacation_record_write ON hr.vacation_record USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['rh.write'::text, 'saude.write'::text]))));

ALTER TABLE hr.vacation_type ENABLE ROW LEVEL SECURITY;

ALTER TABLE hr.work_accident ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_accident_select ON hr.work_accident FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.read'::text, 'saude.write'::text]))));

CREATE POLICY work_accident_write ON hr.work_accident USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.write'::text]))));

ALTER TABLE hr.work_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_location_select ON hr.work_location FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

ALTER TABLE hr.work_location_structure_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_location_structure_assignment_select ON hr.work_location_structure_assignment FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.read'::text, 'gestao.write'::text, 'rh.read'::text, 'rh.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'saude.read'::text, 'saude.write'::text, 'folha.read'::text, 'folha.write'::text, 'relatorio.read'::text, 'relatorio.generate'::text]))));

CREATE POLICY work_location_structure_assignment_write ON hr.work_location_structure_assignment USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));

CREATE POLICY work_location_write ON hr.work_location USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['gestao.write'::text]))));
