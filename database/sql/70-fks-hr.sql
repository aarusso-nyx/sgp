ALTER TABLE ONLY hr.administrative_process_function
    ADD CONSTRAINT administrative_process_function_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.administrative_process_function
    ADD CONSTRAINT administrative_process_function_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.administrative_process_function
    ADD CONSTRAINT administrative_process_function_process_id_fkey FOREIGN KEY (process_id) REFERENCES hr.administrative_process(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.administrative_process_function
    ADD CONSTRAINT administrative_process_function_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.agreement
    ADD CONSTRAINT agreement_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES hr.education_institution(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.agreement
    ADD CONSTRAINT agreement_program_id_fkey FOREIGN KEY (program_id) REFERENCES hr.internship_program(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.beneficiary_contact_history
    ADD CONSTRAINT beneficiary_contact_history_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES hr.recertification_beneficiary(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.branch
    ADD CONSTRAINT branch_company_id_fkey FOREIGN KEY (company_id) REFERENCES hr.company(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.cadastral_change_request
    ADD CONSTRAINT cadastral_change_request_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.cadastral_change_request
    ADD CONSTRAINT cadastral_change_request_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.career_plan
    ADD CONSTRAINT career_plan_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.company
    ADD CONSTRAINT company_legal_nature_id_fkey FOREIGN KEY (legal_nature_id) REFERENCES hr.legal_nature(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.contribution_time_certificate
    ADD CONSTRAINT contribution_time_certificate_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.cost_center
    ADD CONSTRAINT cost_center_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_alimony
    ADD CONSTRAINT employee_alimony_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee_alimony_history
    ADD CONSTRAINT employee_alimony_history_alimony_id_fkey FOREIGN KEY (alimony_id) REFERENCES hr.employee_alimony(id) ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee_alimony_history
    ADD CONSTRAINT employee_alimony_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee_alimony_history
    ADD CONSTRAINT employee_alimony_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee_bank_account
    ADD CONSTRAINT employee_bank_account_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES hr.bank(id) ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee_bank_account
    ADD CONSTRAINT employee_bank_account_dependent_id_fkey FOREIGN KEY (dependent_id) REFERENCES hr.employee_dependent(id) ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee_bank_account
    ADD CONSTRAINT employee_bank_account_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee_bank_account_history
    ADD CONSTRAINT employee_bank_account_history_account_id_fkey FOREIGN KEY (account_id) REFERENCES hr.employee_bank_account(id) ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee_bank_account_history
    ADD CONSTRAINT employee_bank_account_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee_bank_account
    ADD CONSTRAINT employee_bank_account_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES hr.bank(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_benefit_dependent
    ADD CONSTRAINT employee_benefit_dependent_dependent_id_fkey FOREIGN KEY (dependent_id) REFERENCES hr.employee_dependent(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_benefit_dependent
    ADD CONSTRAINT employee_benefit_dependent_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_complement_data
    ADD CONSTRAINT employee_complement_data_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_contract_type_id_fkey FOREIGN KEY (contract_type_id) REFERENCES hr.contract_type(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES hr.cost_center(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_dependent
    ADD CONSTRAINT employee_dependent_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_employment_link_id_fkey FOREIGN KEY (employment_link_id) REFERENCES hr.employment_link(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_exercise
    ADD CONSTRAINT employee_exercise_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_exercise
    ADD CONSTRAINT employee_exercise_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee_exercise
    ADD CONSTRAINT employee_exercise_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_exercise
    ADD CONSTRAINT employee_exercise_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_frequency
    ADD CONSTRAINT employee_frequency_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_functional_status_id_fkey FOREIGN KEY (functional_status_id) REFERENCES hr.functional_status(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES hr.job_position(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_salary_range_level_id_fkey FOREIGN KEY (salary_range_level_id) REFERENCES hr.salary_range_level(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_salary_reference_id_fkey FOREIGN KEY (salary_reference_id) REFERENCES hr.salary_reference(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES hr.shift(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_status_history
    ADD CONSTRAINT employee_status_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee_status_history
    ADD CONSTRAINT employee_status_history_functional_status_id_fkey FOREIGN KEY (functional_status_id) REFERENCES hr.functional_status(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee_status_history
    ADD CONSTRAINT employee_status_history_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES hr.reason(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_termination_reason_id_fkey FOREIGN KEY (termination_reason_id) REFERENCES hr.termination_reason(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_aprovador_user_fk FOREIGN KEY (aprovador_user_id) REFERENCES public.user_account(id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_destino_job_position_fk FOREIGN KEY (destino_job_position_id) REFERENCES hr.job_position(id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_destino_work_location_fk FOREIGN KEY (destino_work_location_id) REFERENCES hr.work_location(id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_origem_job_position_fk FOREIGN KEY (origem_job_position_id) REFERENCES hr.job_position(id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_origem_work_location_fk FOREIGN KEY (origem_work_location_id) REFERENCES hr.work_location(id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_processo_administrativo_fk FOREIGN KEY (processo_administrativo_id) REFERENCES hr.administrative_process(id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES hr.reason(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_to_work_location_id_fkey FOREIGN KEY (to_work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee_transit_benefit
    ADD CONSTRAINT employee_transit_benefit_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee_transit_benefit
    ADD CONSTRAINT employee_transit_benefit_transit_benefit_id_fkey FOREIGN KEY (transit_benefit_id) REFERENCES hr.transit_benefit(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employee_union_contribution
    ADD CONSTRAINT employee_union_contribution_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.employee_union_contribution
    ADD CONSTRAINT employee_union_contribution_union_id_fkey FOREIGN KEY (union_id) REFERENCES hr.union_entity(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_union_id_fkey FOREIGN KEY (union_id) REFERENCES hr.union_entity(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employment_contract
    ADD CONSTRAINT employment_contract_contract_type_id_fkey FOREIGN KEY (contract_type_id) REFERENCES hr.contract_type(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employment_contract
    ADD CONSTRAINT employment_contract_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employment_contract
    ADD CONSTRAINT employment_contract_employment_link_id_fkey FOREIGN KEY (employment_link_id) REFERENCES hr.employment_link(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employment_link
    ADD CONSTRAINT employment_link_commission_position_fkey FOREIGN KEY (commission_position_id) REFERENCES hr.job_position(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.employment_link
    ADD CONSTRAINT employment_link_functional_status_fkey FOREIGN KEY (functional_status_id) REFERENCES hr.functional_status(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.employment_link
    ADD CONSTRAINT employment_link_termination_payroll_run_id_fkey FOREIGN KEY (termination_payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.external_life_proof
    ADD CONSTRAINT external_life_proof_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES hr.recertification_beneficiary(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.health_exam_provider_exam_link
    ADD CONSTRAINT health_exam_provider_exam_link_exam_entry_id_fkey FOREIGN KEY (exam_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.health_exam_provider_exam_link
    ADD CONSTRAINT health_exam_provider_exam_link_provider_entry_id_fkey FOREIGN KEY (exam_provider_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.health_provider_agreement_link
    ADD CONSTRAINT health_provider_agreement_link_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES hr.agreement(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.health_provider_agreement_link
    ADD CONSTRAINT health_provider_agreement_link_provider_entry_id_fkey FOREIGN KEY (provider_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.absence_reason
    ADD CONSTRAINT hr_absence_reason_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.act_classification
    ADD CONSTRAINT hr_act_classification_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.administrative_process_function
    ADD CONSTRAINT hr_administrative_process_function_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.administrative_process
    ADD CONSTRAINT hr_administrative_process_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.agreement
    ADD CONSTRAINT hr_agreement_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.bank
    ADD CONSTRAINT hr_bank_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.beneficiary_contact_history
    ADD CONSTRAINT hr_beneficiary_contact_history_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.branch
    ADD CONSTRAINT hr_branch_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.business_day
    ADD CONSTRAINT hr_business_day_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.career_plan
    ADD CONSTRAINT hr_career_plan_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.company
    ADD CONSTRAINT hr_company_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.competence_period
    ADD CONSTRAINT hr_competence_period_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.consignment_entity
    ADD CONSTRAINT hr_consignment_entity_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.consignment_import_job
    ADD CONSTRAINT hr_consignment_import_job_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.contract_type
    ADD CONSTRAINT hr_contract_type_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.contribution_time_certificate
    ADD CONSTRAINT hr_contribution_time_certificate_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.cost_center
    ADD CONSTRAINT hr_cost_center_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.education_institution
    ADD CONSTRAINT hr_education_institution_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_alimony
    ADD CONSTRAINT hr_employee_alimony_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_benefit_dependent
    ADD CONSTRAINT hr_employee_benefit_dependent_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_complement_data
    ADD CONSTRAINT hr_employee_complement_data_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_dependent
    ADD CONSTRAINT hr_employee_dependent_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_exercise
    ADD CONSTRAINT hr_employee_exercise_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_frequency
    ADD CONSTRAINT hr_employee_frequency_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_payroll_item_import_job
    ADD CONSTRAINT hr_employee_payroll_item_import_job_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_status_history
    ADD CONSTRAINT hr_employee_status_history_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT hr_employee_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT hr_employee_transfer_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_transit_benefit
    ADD CONSTRAINT hr_employee_transit_benefit_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employee_union_contribution
    ADD CONSTRAINT hr_employee_union_contribution_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.employment_link
    ADD CONSTRAINT hr_employment_link_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.external_life_proof
    ADD CONSTRAINT hr_external_life_proof_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.file_export_job
    ADD CONSTRAINT hr_file_export_job_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.function_nature
    ADD CONSTRAINT hr_function_nature_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.functional_status
    ADD CONSTRAINT hr_functional_status_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.health_exam_provider_exam_link
    ADD CONSTRAINT hr_health_exam_provider_exam_link_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.health_provider_agreement_link
    ADD CONSTRAINT hr_health_provider_agreement_link_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.internship_program
    ADD CONSTRAINT hr_internship_program_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.internship_record
    ADD CONSTRAINT hr_internship_record_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.job_function_legislation_history
    ADD CONSTRAINT hr_job_function_legislation_history_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.job_function
    ADD CONSTRAINT hr_job_function_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.job_position
    ADD CONSTRAINT hr_job_position_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.job_structure_employment_link
    ADD CONSTRAINT hr_job_structure_employment_link_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.job_structure_reference_link
    ADD CONSTRAINT hr_job_structure_reference_link_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.leave_record
    ADD CONSTRAINT hr_leave_record_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.legal_nature
    ADD CONSTRAINT hr_legal_nature_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.legal_responsible
    ADD CONSTRAINT hr_legal_responsible_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.legislation
    ADD CONSTRAINT hr_legislation_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.medical_appointment
    ADD CONSTRAINT hr_medical_appointment_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.medical_leave
    ADD CONSTRAINT hr_medical_leave_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.medical_record
    ADD CONSTRAINT hr_medical_record_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT hr_merit_progression_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.pension_compensation
    ADD CONSTRAINT hr_pension_compensation_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.pension_grant
    ADD CONSTRAINT hr_pension_grant_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.performance_evaluation
    ADD CONSTRAINT hr_performance_evaluation_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.previdentiary_declaration
    ADD CONSTRAINT hr_previdentiary_declaration_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.professional_experience
    ADD CONSTRAINT hr_professional_experience_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.reason
    ADD CONSTRAINT hr_reason_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.recertification_beneficiary
    ADD CONSTRAINT hr_recertification_beneficiary_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.recertification_campaign
    ADD CONSTRAINT hr_recertification_campaign_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.recertification_record
    ADD CONSTRAINT hr_recertification_record_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.recruitment_candidate
    ADD CONSTRAINT hr_recruitment_candidate_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.recruitment_request_function
    ADD CONSTRAINT hr_recruitment_request_function_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.recruitment_request
    ADD CONSTRAINT hr_recruitment_request_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.reference_catalog_entry
    ADD CONSTRAINT hr_reference_catalog_entry_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.retirement_grant
    ADD CONSTRAINT hr_retirement_grant_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.retirement_rule
    ADD CONSTRAINT hr_retirement_rule_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.retirement_simulation
    ADD CONSTRAINT hr_retirement_simulation_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.salary_level_history
    ADD CONSTRAINT hr_salary_level_history_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.salary_range_level
    ADD CONSTRAINT hr_salary_range_level_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.salary_range
    ADD CONSTRAINT hr_salary_range_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.salary_reference
    ADD CONSTRAINT hr_salary_reference_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.salary_simulation_adjustment
    ADD CONSTRAINT hr_salary_simulation_adjustment_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.salary_simulation
    ADD CONSTRAINT hr_salary_simulation_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.service_provider
    ADD CONSTRAINT hr_service_provider_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.service_taker
    ADD CONSTRAINT hr_service_taker_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.service_time_record
    ADD CONSTRAINT hr_service_time_record_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.shift_day_off
    ADD CONSTRAINT hr_shift_day_off_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.shift
    ADD CONSTRAINT hr_shift_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.termination_reason
    ADD CONSTRAINT hr_termination_reason_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.training_suggestion_complement
    ADD CONSTRAINT hr_training_suggestion_complement_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.training_suggestion_cost
    ADD CONSTRAINT hr_training_suggestion_cost_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.training_suggestion_employee
    ADD CONSTRAINT hr_training_suggestion_employee_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.training_suggestion
    ADD CONSTRAINT hr_training_suggestion_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.transit_benefit
    ADD CONSTRAINT hr_transit_benefit_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.union_entity
    ADD CONSTRAINT hr_union_entity_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.vacation_record
    ADD CONSTRAINT hr_vacation_record_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.vacation_type
    ADD CONSTRAINT hr_vacation_type_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.work_accident
    ADD CONSTRAINT hr_work_accident_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.work_location_structure_assignment
    ADD CONSTRAINT hr_work_location_structure_assignment_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.work_location
    ADD CONSTRAINT hr_work_location_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.internship_program
    ADD CONSTRAINT internship_program_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES hr.education_institution(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.internship_record
    ADD CONSTRAINT internship_record_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES hr.agreement(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.internship_record
    ADD CONSTRAINT internship_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.internship_record
    ADD CONSTRAINT internship_record_program_id_fkey FOREIGN KEY (program_id) REFERENCES hr.internship_program(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.job_function_legislation_history
    ADD CONSTRAINT job_function_legislation_history_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.job_function_legislation_history
    ADD CONSTRAINT job_function_legislation_history_legislation_id_fkey FOREIGN KEY (legislation_id) REFERENCES hr.legislation(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.job_function
    ADD CONSTRAINT job_function_nature_id_fkey FOREIGN KEY (nature_id) REFERENCES hr.function_nature(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.job_position
    ADD CONSTRAINT job_position_salary_range_fkey FOREIGN KEY (salary_range_id) REFERENCES hr.salary_range(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.job_structure_employment_link
    ADD CONSTRAINT job_structure_employment_link_employment_link_id_fkey FOREIGN KEY (employment_link_id) REFERENCES hr.employment_link(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.job_structure_employment_link
    ADD CONSTRAINT job_structure_employment_link_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.job_structure_employment_link
    ADD CONSTRAINT job_structure_employment_link_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES hr.job_position(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.job_structure_reference_link
    ADD CONSTRAINT job_structure_reference_link_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.job_structure_reference_link
    ADD CONSTRAINT job_structure_reference_link_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES hr.job_position(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.job_structure_reference_link
    ADD CONSTRAINT job_structure_reference_link_reference_entry_id_fkey FOREIGN KEY (reference_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.leave_record
    ADD CONSTRAINT leave_record_absence_reason_id_fkey FOREIGN KEY (absence_reason_id) REFERENCES hr.absence_reason(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.leave_record
    ADD CONSTRAINT leave_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.legal_responsible
    ADD CONSTRAINT legal_responsible_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.medical_appointment
    ADD CONSTRAINT medical_appointment_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.medical_leave
    ADD CONSTRAINT medical_leave_absence_reason_id_fkey FOREIGN KEY (absence_reason_id) REFERENCES hr.absence_reason(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.medical_leave
    ADD CONSTRAINT medical_leave_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.medical_leave
    ADD CONSTRAINT medical_leave_expert_opinion_fkey FOREIGN KEY (expert_opinion_id) REFERENCES hr.medical_record(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.medical_leave
    ADD CONSTRAINT medical_leave_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES hr.medical_record(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.medical_record
    ADD CONSTRAINT medical_record_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES hr.medical_appointment(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.medical_record
    ADD CONSTRAINT medical_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT merit_progression_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT merit_progression_performance_evaluation_id_fkey FOREIGN KEY (performance_evaluation_id) REFERENCES hr.performance_evaluation(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT merit_progression_source_salary_range_level_id_fkey FOREIGN KEY (source_salary_range_level_id) REFERENCES hr.salary_range_level(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT merit_progression_source_salary_reference_id_fkey FOREIGN KEY (source_salary_reference_id) REFERENCES hr.salary_reference(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT merit_progression_target_salary_range_level_id_fkey FOREIGN KEY (target_salary_range_level_id) REFERENCES hr.salary_range_level(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT merit_progression_target_salary_reference_id_fkey FOREIGN KEY (target_salary_reference_id) REFERENCES hr.salary_reference(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.pension_compensation
    ADD CONSTRAINT pension_compensation_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.pension_grant
    ADD CONSTRAINT pension_grant_instituting_employee_id_fkey FOREIGN KEY (instituting_employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.performance_evaluation
    ADD CONSTRAINT performance_evaluation_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.performance_evaluation
    ADD CONSTRAINT performance_evaluation_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.performance_evaluation
    ADD CONSTRAINT performance_evaluation_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.performance_evaluation
    ADD CONSTRAINT performance_evaluation_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES hr.job_position(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.performance_evaluation
    ADD CONSTRAINT performance_evaluation_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.previdentiary_declaration
    ADD CONSTRAINT previdentiary_declaration_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.probation_evaluation
    ADD CONSTRAINT probation_evaluation_employee_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.probation_evaluation
    ADD CONSTRAINT probation_evaluation_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.professional_experience
    ADD CONSTRAINT professional_experience_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.recertification_beneficiary
    ADD CONSTRAINT recertification_beneficiary_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES hr.recertification_campaign(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.recertification_beneficiary
    ADD CONSTRAINT recertification_beneficiary_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.recertification_record
    ADD CONSTRAINT recertification_record_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES hr.recertification_beneficiary(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.recruitment_candidate
    ADD CONSTRAINT recruitment_candidate_request_id_fkey FOREIGN KEY (request_id) REFERENCES hr.recruitment_request(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.recruitment_request
    ADD CONSTRAINT recruitment_request_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.recruitment_request_function
    ADD CONSTRAINT recruitment_request_function_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.recruitment_request_function
    ADD CONSTRAINT recruitment_request_function_request_id_fkey FOREIGN KEY (request_id) REFERENCES hr.recruitment_request(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.recruitment_request_function
    ADD CONSTRAINT recruitment_request_function_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES hr.shift(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.recruitment_request
    ADD CONSTRAINT recruitment_request_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.reintegration_order
    ADD CONSTRAINT reintegration_order_employment_link_id_fkey FOREIGN KEY (employment_link_id) REFERENCES hr.employment_link(id);

ALTER TABLE ONLY hr.reintegration_order
    ADD CONSTRAINT reintegration_order_original_termination_event_id_fkey FOREIGN KEY (original_termination_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY hr.reintegration_order
    ADD CONSTRAINT reintegration_order_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.retirement_grant
    ADD CONSTRAINT retirement_grant_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.retirement_grant
    ADD CONSTRAINT retirement_grant_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES hr.retirement_rule(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.retirement_simulation
    ADD CONSTRAINT retirement_simulation_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.retirement_simulation
    ADD CONSTRAINT retirement_simulation_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES hr.retirement_rule(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.salary_level_history
    ADD CONSTRAINT salary_level_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.salary_level_history
    ADD CONSTRAINT salary_level_history_salary_range_level_id_fkey FOREIGN KEY (salary_range_level_id) REFERENCES hr.salary_range_level(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.salary_level_history
    ADD CONSTRAINT salary_level_history_salary_reference_id_fkey FOREIGN KEY (salary_reference_id) REFERENCES hr.salary_reference(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.salary_range
    ADD CONSTRAINT salary_range_career_plan_id_fkey FOREIGN KEY (career_plan_id) REFERENCES avaliacao.career_plan(id) ON DELETE RESTRICT;

ALTER TABLE ONLY hr.salary_range_level
    ADD CONSTRAINT salary_range_level_salary_range_id_fkey FOREIGN KEY (salary_range_id) REFERENCES hr.salary_range(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.salary_range_level
    ADD CONSTRAINT salary_range_level_salary_reference_id_fkey FOREIGN KEY (salary_reference_id) REFERENCES hr.salary_reference(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.salary_reference
    ADD CONSTRAINT salary_reference_range_id_fkey FOREIGN KEY (range_id) REFERENCES hr.salary_range(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.salary_simulation_adjustment
    ADD CONSTRAINT salary_simulation_adjustment_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES hr.salary_simulation(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.salary_simulation
    ADD CONSTRAINT salary_simulation_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.salary_simulation
    ADD CONSTRAINT salary_simulation_progression_id_fkey FOREIGN KEY (progression_id) REFERENCES hr.merit_progression(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.service_provider
    ADD CONSTRAINT service_provider_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES hr.agreement(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.service_provider
    ADD CONSTRAINT service_provider_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.service_provider
    ADD CONSTRAINT service_provider_category_entry_id_fkey FOREIGN KEY (category_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.service_provider
    ADD CONSTRAINT service_provider_cbo_entry_id_fkey FOREIGN KEY (cbo_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.service_provider
    ADD CONSTRAINT service_provider_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.service_taker
    ADD CONSTRAINT service_taker_gps_payment_code_id_fkey FOREIGN KEY (gps_payment_code_id) REFERENCES payroll.gps_payment_code(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.service_taker
    ADD CONSTRAINT service_taker_sefip_code_id_fkey FOREIGN KEY (sefip_code_id) REFERENCES payroll.sefip_code(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.service_time_record
    ADD CONSTRAINT service_time_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.shift_day_off
    ADD CONSTRAINT shift_day_off_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES hr.shift(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.training_suggestion_complement
    ADD CONSTRAINT training_suggestion_complement_city_entry_id_fkey FOREIGN KEY (city_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.training_suggestion_complement
    ADD CONSTRAINT training_suggestion_complement_suggestion_id_fkey FOREIGN KEY (suggestion_id) REFERENCES hr.training_suggestion(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.training_suggestion_cost
    ADD CONSTRAINT training_suggestion_cost_suggestion_id_fkey FOREIGN KEY (suggestion_id) REFERENCES hr.training_suggestion(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.training_suggestion
    ADD CONSTRAINT training_suggestion_course_entry_id_fkey FOREIGN KEY (course_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.training_suggestion_employee
    ADD CONSTRAINT training_suggestion_employee_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.training_suggestion_employee
    ADD CONSTRAINT training_suggestion_employee_suggestion_id_fkey FOREIGN KEY (suggestion_id) REFERENCES hr.training_suggestion(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.tsv_contract_change
    ADD CONSTRAINT tsv_contract_change_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.tsv_contract_change
    ADD CONSTRAINT tsv_contract_change_tsv_contract_id_fkey FOREIGN KEY (tsv_contract_id) REFERENCES hr.tsv_contract(id) ON DELETE CASCADE;

ALTER TABLE ONLY hr.tsv_contract
    ADD CONSTRAINT tsv_contract_employment_link_id_fkey FOREIGN KEY (employment_link_id) REFERENCES hr.employment_link(id);

ALTER TABLE ONLY hr.tsv_contract
    ADD CONSTRAINT tsv_contract_supervisor_employee_id_fkey FOREIGN KEY (supervisor_employee_id) REFERENCES hr.employee(id);

ALTER TABLE ONLY hr.tsv_contract
    ADD CONSTRAINT tsv_contract_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY hr.tsv_contract
    ADD CONSTRAINT tsv_contract_workplace_id_fkey FOREIGN KEY (workplace_id) REFERENCES hr.work_location(id);

ALTER TABLE ONLY hr.vacation_record
    ADD CONSTRAINT vacation_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.vacation_record
    ADD CONSTRAINT vacation_record_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.vacation_record
    ADD CONSTRAINT vacation_record_vacation_type_id_fkey FOREIGN KEY (vacation_type_id) REFERENCES hr.vacation_type(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.work_accident
    ADD CONSTRAINT work_accident_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.work_accident
    ADD CONSTRAINT work_accident_medical_leave_id_fkey FOREIGN KEY (medical_leave_id) REFERENCES hr.medical_leave(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.work_location
    ADD CONSTRAINT work_location_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.work_location
    ADD CONSTRAINT work_location_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY hr.work_location_structure_assignment
    ADD CONSTRAINT work_location_structure_assignment_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.work_location_structure_assignment
    ADD CONSTRAINT work_location_structure_assignment_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES hr.job_position(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY hr.work_location_structure_assignment
    ADD CONSTRAINT work_location_structure_assignment_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE CASCADE;
