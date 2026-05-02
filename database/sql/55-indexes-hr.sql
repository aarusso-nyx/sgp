CREATE UNIQUE INDEX absence_reason_code_key ON hr.absence_reason USING btree (tenant_id, code);

CREATE INDEX absence_reason_status_idx ON hr.absence_reason USING btree (status);

CREATE UNIQUE INDEX act_classification_code_key ON hr.act_classification USING btree (tenant_id, code);

CREATE INDEX act_classification_status_idx ON hr.act_classification USING btree (status);

CREATE INDEX administrative_process_filed_on_idx ON hr.administrative_process USING btree (filed_on);

CREATE INDEX administrative_process_function_branch_id_idx ON hr.administrative_process_function USING btree (branch_id);

CREATE INDEX administrative_process_function_job_function_id_idx ON hr.administrative_process_function USING btree (job_function_id);

CREATE INDEX administrative_process_function_process_id_assigned_on_idx ON hr.administrative_process_function USING btree (process_id, assigned_on);

CREATE INDEX administrative_process_function_status_idx ON hr.administrative_process_function USING btree (status);

CREATE INDEX administrative_process_function_work_location_id_idx ON hr.administrative_process_function USING btree (work_location_id);

CREATE INDEX administrative_process_status_idx ON hr.administrative_process USING btree (status);

CREATE UNIQUE INDEX administrative_process_tenant_process_number_key ON hr.administrative_process USING btree (tenant_id, process_number);

CREATE UNIQUE INDEX agreement_code_key ON hr.agreement USING btree (tenant_id, code);

CREATE INDEX agreement_institution_id_idx ON hr.agreement USING btree (institution_id);

CREATE INDEX agreement_program_id_idx ON hr.agreement USING btree (program_id);

CREATE INDEX agreement_status_idx ON hr.agreement USING btree (status);

CREATE INDEX agreement_tenant_code_idx ON hr.agreement USING btree (tenant_id, code);

CREATE INDEX bank_blocked_idx ON hr.bank USING btree (blocked);

CREATE UNIQUE INDEX bank_code_key ON hr.bank USING btree (tenant_id, code);

CREATE INDEX bank_status_idx ON hr.bank USING btree (status);

CREATE INDEX beneficiary_contact_history_tenant_beneficiary_idx ON hr.beneficiary_contact_history USING btree (tenant_id, beneficiary_id, contacted_on);

CREATE UNIQUE INDEX branch_cnpj_key ON hr.branch USING btree (tenant_id, cnpj);

CREATE UNIQUE INDEX branch_code_key ON hr.branch USING btree (tenant_id, code);

CREATE INDEX branch_company_id_idx ON hr.branch USING btree (company_id);

CREATE INDEX branch_status_idx ON hr.branch USING btree (status);

CREATE INDEX branch_tenant_code_idx ON hr.branch USING btree (tenant_id, code);

CREATE INDEX business_day_business_date_idx ON hr.business_day USING btree (business_date);

CREATE UNIQUE INDEX business_day_code_key ON hr.business_day USING btree (tenant_id, code);

CREATE INDEX business_day_status_idx ON hr.business_day USING btree (status);

CREATE INDEX business_day_tenant_business_date_idx ON hr.business_day USING btree (tenant_id, business_date);

CREATE INDEX cadastral_change_request_employee_idx ON hr.cadastral_change_request USING btree (tenant_id, employee_id, requested_at DESC);

CREATE INDEX cadastral_change_request_tenant_status_idx ON hr.cadastral_change_request USING btree (tenant_id, status, requested_at);

CREATE INDEX career_plan_employee_id_idx ON hr.career_plan USING btree (employee_id);

CREATE INDEX career_plan_tenant_active_effective_idx ON hr.career_plan USING btree (tenant_id, active, effective_on);

CREATE UNIQUE INDEX company_cnpj_key ON hr.company USING btree (tenant_id, cnpj);

CREATE UNIQUE INDEX company_code_key ON hr.company USING btree (tenant_id, code);

CREATE INDEX company_legal_nature_id_idx ON hr.company USING btree (legal_nature_id);

CREATE INDEX company_status_idx ON hr.company USING btree (status);

CREATE INDEX company_tenant_code_idx ON hr.company USING btree (tenant_id, code);

CREATE UNIQUE INDEX competence_period_code_key ON hr.competence_period USING btree (tenant_id, code);

CREATE UNIQUE INDEX competence_period_competence_year_competence_month_key ON hr.competence_period USING btree (tenant_id, competence_year, competence_month);

CREATE INDEX competence_period_status_idx ON hr.competence_period USING btree (status);

CREATE INDEX competence_period_tenant_competence_idx ON hr.competence_period USING btree (tenant_id, competence_year, competence_month);

CREATE INDEX competence_period_tenant_status_idx ON hr.competence_period USING btree (tenant_id, status, competence_year, competence_month);

CREATE INDEX consignment_entity_bank_code_idx ON hr.consignment_entity USING btree (bank_code);

CREATE INDEX consignment_entity_status_idx ON hr.consignment_entity USING btree (status);

CREATE UNIQUE INDEX consignment_entity_tenant_code_key ON hr.consignment_entity USING btree (tenant_id, code);

CREATE UNIQUE INDEX consignment_import_job_code_key ON hr.consignment_import_job USING btree (tenant_id, code);

CREATE INDEX consignment_import_job_source_file_name_idx ON hr.consignment_import_job USING btree (source_file_name);

CREATE INDEX consignment_import_job_status_idx ON hr.consignment_import_job USING btree (status);

CREATE UNIQUE INDEX contract_type_code_key ON hr.contract_type USING btree (tenant_id, code);

CREATE INDEX contract_type_status_idx ON hr.contract_type USING btree (status);

CREATE INDEX contract_type_tenant_code_idx ON hr.contract_type USING btree (tenant_id, code);

CREATE INDEX contribution_time_certificate_tenant_employee_idx ON hr.contribution_time_certificate USING btree (tenant_id, employee_id, issued_at);

CREATE INDEX cost_center_branch_id_idx ON hr.cost_center USING btree (branch_id);

CREATE UNIQUE INDEX cost_center_code_key ON hr.cost_center USING btree (tenant_id, code);

CREATE INDEX cost_center_status_idx ON hr.cost_center USING btree (status);

CREATE INDEX cost_center_tenant_code_idx ON hr.cost_center USING btree (tenant_id, code);

CREATE UNIQUE INDEX cost_center_tenant_code_key ON hr.cost_center USING btree (tenant_id, code);

CREATE UNIQUE INDEX education_institution_cnpj_key ON hr.education_institution USING btree (tenant_id, cnpj);

CREATE UNIQUE INDEX education_institution_code_key ON hr.education_institution USING btree (tenant_id, code);

CREATE INDEX education_institution_status_idx ON hr.education_institution USING btree (status);

CREATE INDEX employee_alimony_beneficiary_cpf_idx ON hr.employee_alimony USING btree (tenant_id, beneficiary_cpf) WHERE (beneficiary_cpf IS NOT NULL);

CREATE INDEX employee_alimony_employee_id_starts_on_idx ON hr.employee_alimony USING btree (employee_id, starts_on);

CREATE INDEX employee_alimony_history_alimony_idx ON hr.employee_alimony_history USING btree (tenant_id, alimony_id, versioned_at DESC);

CREATE INDEX employee_alimony_status_idx ON hr.employee_alimony USING btree (status);

CREATE INDEX employee_alimony_tenant_employee_status_idx ON hr.employee_alimony USING btree (tenant_id, employee_id, status, priority, valid_from);

CREATE INDEX employee_bank_account_employee_idx ON hr.employee_bank_account USING btree (tenant_id, employee_id, validation_status);

CREATE INDEX employee_bank_account_history_account_idx ON hr.employee_bank_account_history USING btree (tenant_id, account_id, changed_at DESC);

CREATE INDEX employee_bank_id_idx ON hr.employee USING btree (bank_id);

CREATE INDEX employee_benefit_dependent_dependent_id_idx ON hr.employee_benefit_dependent USING btree (dependent_id);

CREATE INDEX employee_benefit_dependent_employee_id_starts_on_idx ON hr.employee_benefit_dependent USING btree (employee_id, starts_on);

CREATE INDEX employee_benefit_dependent_status_idx ON hr.employee_benefit_dependent USING btree (status);

CREATE INDEX employee_branch_id_idx ON hr.employee USING btree (branch_id);

CREATE UNIQUE INDEX employee_complement_data_employee_id_key ON hr.employee_complement_data USING btree (employee_id);

CREATE INDEX employee_complement_data_tenant_employee_idx ON hr.employee_complement_data USING btree (tenant_id, employee_id);

CREATE INDEX employee_contract_type_id_idx ON hr.employee USING btree (contract_type_id);

CREATE INDEX employee_cost_center_id_idx ON hr.employee USING btree (cost_center_id);

CREATE UNIQUE INDEX employee_cpf_key ON hr.employee USING btree (tenant_id, cpf);

CREATE INDEX employee_dependent_cpf_idx ON hr.employee_dependent USING btree (cpf);

CREATE INDEX employee_dependent_employee_id_idx ON hr.employee_dependent USING btree (employee_id);

CREATE INDEX employee_dependent_tenant_cpf_idx ON hr.employee_dependent USING btree (tenant_id, cpf);

CREATE INDEX employee_dependent_tenant_employee_idx ON hr.employee_dependent USING btree (tenant_id, employee_id);

CREATE INDEX employee_employment_link_id_idx ON hr.employee USING btree (employment_link_id);

CREATE INDEX employee_exercise_branch_id_idx ON hr.employee_exercise USING btree (branch_id);

CREATE INDEX employee_exercise_employee_id_starts_on_idx ON hr.employee_exercise USING btree (employee_id, starts_on);

CREATE INDEX employee_exercise_job_function_id_idx ON hr.employee_exercise USING btree (job_function_id);

CREATE INDEX employee_exercise_status_idx ON hr.employee_exercise USING btree (status);

CREATE INDEX employee_exercise_work_location_id_idx ON hr.employee_exercise USING btree (work_location_id);

CREATE UNIQUE INDEX employee_frequency_employee_id_year_month_key ON hr.employee_frequency USING btree (tenant_id, employee_id, year, month);

CREATE INDEX employee_frequency_tenant_employee_idx ON hr.employee_frequency USING btree (tenant_id, employee_id, year, month);

CREATE INDEX employee_frequency_year_month_idx ON hr.employee_frequency USING btree (year, month);

CREATE INDEX employee_functional_status_id_idx ON hr.employee USING btree (functional_status_id);

CREATE INDEX employee_job_function_id_idx ON hr.employee USING btree (job_function_id);

CREATE INDEX employee_job_position_id_idx ON hr.employee USING btree (job_position_id);

CREATE INDEX employee_lifecycle_status_idx ON hr.employee USING btree (lifecycle_status);

CREATE INDEX employee_name_idx ON hr.employee USING btree (name);

CREATE UNIQUE INDEX employee_payroll_item_import_job_code_key ON hr.employee_payroll_item_import_job USING btree (tenant_id, code);

CREATE INDEX employee_payroll_item_import_job_competence_idx ON hr.employee_payroll_item_import_job USING btree (competence_year, competence_month);

CREATE INDEX employee_payroll_item_import_job_status_idx ON hr.employee_payroll_item_import_job USING btree (status);

CREATE INDEX employee_recruitment_origin_idx ON hr.employee USING btree (tenant_id, recruitment_concurso_id, recruitment_nomeacao_id) WHERE (recruitment_concurso_id IS NOT NULL);

CREATE UNIQUE INDEX employee_registration_key ON hr.employee USING btree (tenant_id, registration);

CREATE INDEX employee_salary_range_level_idx ON hr.employee USING btree (tenant_id, salary_range_level_id) WHERE (salary_range_level_id IS NOT NULL);

CREATE INDEX employee_salary_reference_id_idx ON hr.employee USING btree (salary_reference_id);

CREATE INDEX employee_shift_id_idx ON hr.employee USING btree (shift_id);

CREATE INDEX employee_status_history_employee_id_starts_on_idx ON hr.employee_status_history USING btree (employee_id, starts_on);

CREATE INDEX employee_status_history_functional_status_id_idx ON hr.employee_status_history USING btree (functional_status_id);

CREATE INDEX employee_status_history_reason_id_idx ON hr.employee_status_history USING btree (reason_id);

CREATE INDEX employee_status_history_tenant_employee_idx ON hr.employee_status_history USING btree (tenant_id, employee_id, starts_on DESC);

CREATE INDEX employee_tenant_created_at_idx ON hr.employee USING btree (tenant_id, created_at DESC);

CREATE INDEX employee_tenant_registration_idx ON hr.employee USING btree (tenant_id, registration);

CREATE INDEX employee_termination_reason_id_idx ON hr.employee USING btree (termination_reason_id);

CREATE INDEX employee_transfer_employee_id_effective_on_idx ON hr.employee_transfer USING btree (employee_id, effective_on);

CREATE INDEX employee_transfer_from_branch_id_idx ON hr.employee_transfer USING btree (from_branch_id);

CREATE INDEX employee_transfer_reason_id_idx ON hr.employee_transfer USING btree (reason_id);

CREATE INDEX employee_transfer_tenant_employee_data_efeito_idx ON hr.employee_transfer USING btree (tenant_id, employee_id, data_efeito DESC);

CREATE INDEX employee_transfer_tenant_employee_idx ON hr.employee_transfer USING btree (tenant_id, employee_id, effective_on DESC);

CREATE INDEX employee_transfer_to_branch_id_idx ON hr.employee_transfer USING btree (to_branch_id);

CREATE INDEX employee_transfer_to_work_location_id_idx ON hr.employee_transfer USING btree (to_work_location_id);

CREATE INDEX employee_transit_benefit_employee_id_starts_on_idx ON hr.employee_transit_benefit USING btree (employee_id, starts_on);

CREATE INDEX employee_transit_benefit_status_idx ON hr.employee_transit_benefit USING btree (status);

CREATE INDEX employee_transit_benefit_transit_benefit_id_idx ON hr.employee_transit_benefit USING btree (transit_benefit_id);

CREATE INDEX employee_union_contribution_employee_id_starts_on_idx ON hr.employee_union_contribution USING btree (employee_id, starts_on);

CREATE INDEX employee_union_contribution_status_idx ON hr.employee_union_contribution USING btree (status);

CREATE INDEX employee_union_contribution_union_id_idx ON hr.employee_union_contribution USING btree (union_id);

CREATE INDEX employee_union_id_idx ON hr.employee USING btree (union_id);

CREATE INDEX employee_work_location_id_idx ON hr.employee USING btree (work_location_id);

CREATE INDEX employment_contract_contract_type_idx ON hr.employment_contract USING btree (contract_type_id);

CREATE INDEX employment_contract_employment_link_idx ON hr.employment_contract USING btree (employment_link_id);

CREATE UNIQUE INDEX employment_contract_one_active_employee_idx ON hr.employment_contract USING btree (tenant_id, employee_id) WHERE ((ends_on IS NULL) AND (status = 'ACTIVE'::public."RecordStatus"));

CREATE INDEX employment_contract_tenant_employee_idx ON hr.employment_contract USING btree (tenant_id, employee_id, starts_on DESC);

CREATE UNIQUE INDEX employment_link_code_key ON hr.employment_link USING btree (tenant_id, code);

CREATE INDEX employment_link_commission_position_idx ON hr.employment_link USING btree (commission_position_id);

CREATE INDEX employment_link_contract_type_idx ON hr.employment_link USING btree (contract_type);

CREATE INDEX employment_link_functional_status_idx ON hr.employment_link USING btree (functional_status_id);

CREATE INDEX employment_link_status_idx ON hr.employment_link USING btree (status);

CREATE INDEX employment_link_tenant_code_idx ON hr.employment_link USING btree (tenant_id, code);

CREATE INDEX employment_link_termination_payroll_run_id_idx ON hr.employment_link USING btree (termination_payroll_run_id);

CREATE INDEX external_life_proof_channel_idx ON hr.external_life_proof USING btree (channel);

CREATE INDEX external_life_proof_tenant_beneficiary_proven_idx ON hr.external_life_proof USING btree (tenant_id, beneficiary_id, proven_at);

CREATE UNIQUE INDEX file_export_job_code_key ON hr.file_export_job USING btree (tenant_id, code);

CREATE INDEX file_export_job_status_idx ON hr.file_export_job USING btree (status);

CREATE INDEX file_export_job_target_route_idx ON hr.file_export_job USING btree (target_route);

CREATE UNIQUE INDEX function_nature_code_key ON hr.function_nature USING btree (tenant_id, code);

CREATE INDEX function_nature_status_idx ON hr.function_nature USING btree (status);

CREATE UNIQUE INDEX functional_status_code_key ON hr.functional_status USING btree (tenant_id, code);

CREATE INDEX functional_status_enters_payroll_idx ON hr.functional_status USING btree (enters_payroll);

CREATE INDEX functional_status_status_idx ON hr.functional_status USING btree (status);

CREATE INDEX functional_status_tenant_code_idx ON hr.functional_status USING btree (tenant_id, code);

CREATE INDEX health_exam_provider_exam_link_exam_idx ON hr.health_exam_provider_exam_link USING btree (exam_entry_id);

CREATE INDEX health_exam_provider_exam_link_status_idx ON hr.health_exam_provider_exam_link USING btree (status);

CREATE UNIQUE INDEX health_exam_provider_exam_link_unique_key ON hr.health_exam_provider_exam_link USING btree (tenant_id, exam_provider_entry_id, exam_entry_id);

CREATE INDEX health_provider_agreement_link_agreement_idx ON hr.health_provider_agreement_link USING btree (agreement_id);

CREATE INDEX health_provider_agreement_link_status_idx ON hr.health_provider_agreement_link USING btree (status);

CREATE UNIQUE INDEX health_provider_agreement_link_unique_key ON hr.health_provider_agreement_link USING btree (tenant_id, provider_entry_id, agreement_id);

CREATE INDEX hr_absence_reason_tenant_id_idx ON hr.absence_reason USING btree (tenant_id);

CREATE INDEX hr_act_classification_tenant_id_idx ON hr.act_classification USING btree (tenant_id);

CREATE INDEX hr_agreement_tenant_id_idx ON hr.agreement USING btree (tenant_id);

CREATE INDEX hr_bank_tenant_id_idx ON hr.bank USING btree (tenant_id);

CREATE INDEX hr_branch_tenant_id_idx ON hr.branch USING btree (tenant_id);

CREATE INDEX hr_business_day_tenant_id_idx ON hr.business_day USING btree (tenant_id);

CREATE INDEX hr_company_tenant_id_idx ON hr.company USING btree (tenant_id);

CREATE INDEX hr_competence_period_tenant_id_idx ON hr.competence_period USING btree (tenant_id);

CREATE INDEX hr_consignment_import_job_tenant_id_idx ON hr.consignment_import_job USING btree (tenant_id);

CREATE INDEX hr_contract_type_tenant_id_idx ON hr.contract_type USING btree (tenant_id);

CREATE INDEX hr_cost_center_tenant_id_idx ON hr.cost_center USING btree (tenant_id);

CREATE INDEX hr_education_institution_tenant_id_idx ON hr.education_institution USING btree (tenant_id);

CREATE INDEX hr_employee_payroll_item_import_job_tenant_id_idx ON hr.employee_payroll_item_import_job USING btree (tenant_id);

CREATE INDEX hr_employee_status_history_tenant_id_idx ON hr.employee_status_history USING btree (tenant_id);

CREATE INDEX hr_employee_tenant_id_idx ON hr.employee USING btree (tenant_id);

CREATE INDEX hr_employee_transfer_tenant_id_idx ON hr.employee_transfer USING btree (tenant_id);

CREATE INDEX hr_employment_link_tenant_id_idx ON hr.employment_link USING btree (tenant_id);

CREATE INDEX hr_file_export_job_tenant_id_idx ON hr.file_export_job USING btree (tenant_id);

CREATE INDEX hr_function_nature_tenant_id_idx ON hr.function_nature USING btree (tenant_id);

CREATE INDEX hr_functional_status_tenant_id_idx ON hr.functional_status USING btree (tenant_id);

CREATE INDEX hr_internship_program_tenant_id_idx ON hr.internship_program USING btree (tenant_id);

CREATE INDEX hr_internship_record_tenant_id_idx ON hr.internship_record USING btree (tenant_id);

CREATE INDEX hr_job_function_tenant_id_idx ON hr.job_function USING btree (tenant_id);

CREATE INDEX hr_job_position_tenant_id_idx ON hr.job_position USING btree (tenant_id);

CREATE INDEX hr_leave_record_tenant_id_idx ON hr.leave_record USING btree (tenant_id);

CREATE INDEX hr_legal_nature_tenant_id_idx ON hr.legal_nature USING btree (tenant_id);

CREATE INDEX hr_legal_responsible_tenant_id_idx ON hr.legal_responsible USING btree (tenant_id);

CREATE INDEX hr_legislation_tenant_id_idx ON hr.legislation USING btree (tenant_id);

CREATE INDEX hr_reason_tenant_id_idx ON hr.reason USING btree (tenant_id);

CREATE INDEX hr_salary_range_tenant_id_idx ON hr.salary_range USING btree (tenant_id);

CREATE INDEX hr_salary_reference_tenant_id_idx ON hr.salary_reference USING btree (tenant_id);

CREATE INDEX hr_shift_tenant_id_idx ON hr.shift USING btree (tenant_id);

CREATE INDEX hr_termination_reason_tenant_id_idx ON hr.termination_reason USING btree (tenant_id);

CREATE INDEX hr_transit_benefit_tenant_id_idx ON hr.transit_benefit USING btree (tenant_id);

CREATE INDEX hr_union_entity_tenant_id_idx ON hr.union_entity USING btree (tenant_id);

CREATE INDEX hr_vacation_record_tenant_id_idx ON hr.vacation_record USING btree (tenant_id);

CREATE INDEX hr_vacation_type_tenant_id_idx ON hr.vacation_type USING btree (tenant_id);

CREATE INDEX hr_work_location_tenant_id_idx ON hr.work_location USING btree (tenant_id);

CREATE UNIQUE INDEX internship_program_code_key ON hr.internship_program USING btree (tenant_id, code);

CREATE INDEX internship_program_institution_id_idx ON hr.internship_program USING btree (institution_id);

CREATE INDEX internship_program_status_idx ON hr.internship_program USING btree (status);

CREATE INDEX internship_record_agreement_id_idx ON hr.internship_record USING btree (agreement_id);

CREATE INDEX internship_record_employee_id_idx ON hr.internship_record USING btree (employee_id);

CREATE INDEX internship_record_intern_cpf_idx ON hr.internship_record USING btree (intern_cpf);

CREATE INDEX internship_record_program_id_idx ON hr.internship_record USING btree (program_id);

CREATE INDEX internship_record_status_idx ON hr.internship_record USING btree (status);

CREATE INDEX internship_record_tenant_employee_idx ON hr.internship_record USING btree (tenant_id, employee_id, starts_on DESC);

CREATE UNIQUE INDEX job_function_code_key ON hr.job_function USING btree (tenant_id, code);

CREATE INDEX job_function_legislation_history_function_idx ON hr.job_function_legislation_history USING btree (job_function_id);

CREATE UNIQUE INDEX job_function_legislation_history_key ON hr.job_function_legislation_history USING btree (tenant_id, job_function_id, code, effective_on);

CREATE INDEX job_function_legislation_history_legislation_idx ON hr.job_function_legislation_history USING btree (legislation_id);

CREATE INDEX job_function_legislation_history_status_idx ON hr.job_function_legislation_history USING btree (status);

CREATE INDEX job_function_nature_id_idx ON hr.job_function USING btree (nature_id);

CREATE INDEX job_function_status_idx ON hr.job_function USING btree (status);

CREATE INDEX job_function_tenant_code_idx ON hr.job_function USING btree (tenant_id, code);

CREATE UNIQUE INDEX job_position_code_key ON hr.job_position USING btree (tenant_id, code);

CREATE INDEX job_position_salary_range_idx ON hr.job_position USING btree (salary_range_id);

CREATE INDEX job_position_status_idx ON hr.job_position USING btree (status);

CREATE INDEX job_position_tenant_code_idx ON hr.job_position USING btree (tenant_id, code);

CREATE INDEX job_structure_employment_link_employment_idx ON hr.job_structure_employment_link USING btree (employment_link_id);

CREATE INDEX job_structure_employment_link_function_idx ON hr.job_structure_employment_link USING btree (job_function_id);

CREATE UNIQUE INDEX job_structure_employment_link_function_link_key ON hr.job_structure_employment_link USING btree (tenant_id, job_function_id, employment_link_id);

CREATE INDEX job_structure_employment_link_position_idx ON hr.job_structure_employment_link USING btree (job_position_id);

CREATE UNIQUE INDEX job_structure_employment_link_position_link_key ON hr.job_structure_employment_link USING btree (tenant_id, job_position_id, employment_link_id);

CREATE INDEX job_structure_employment_link_status_idx ON hr.job_structure_employment_link USING btree (status);

CREATE INDEX job_structure_reference_link_function_catalog_idx ON hr.job_structure_reference_link USING btree (job_function_id, reference_catalog_key);

CREATE UNIQUE INDEX job_structure_reference_link_function_entry_key ON hr.job_structure_reference_link USING btree (tenant_id, job_function_id, reference_entry_id);

CREATE INDEX job_structure_reference_link_position_catalog_idx ON hr.job_structure_reference_link USING btree (job_position_id, reference_catalog_key);

CREATE UNIQUE INDEX job_structure_reference_link_position_entry_key ON hr.job_structure_reference_link USING btree (tenant_id, job_position_id, reference_entry_id);

CREATE INDEX job_structure_reference_link_reference_entry_idx ON hr.job_structure_reference_link USING btree (reference_entry_id);

CREATE INDEX job_structure_reference_link_status_idx ON hr.job_structure_reference_link USING btree (status);

CREATE INDEX leave_record_absence_reason_id_idx ON hr.leave_record USING btree (absence_reason_id);

CREATE INDEX leave_record_employee_id_starts_on_idx ON hr.leave_record USING btree (employee_id, starts_on);

CREATE INDEX leave_record_paid_idx ON hr.leave_record USING btree (paid);

CREATE INDEX leave_record_status_idx ON hr.leave_record USING btree (status);

CREATE INDEX leave_record_tenant_employee_idx ON hr.leave_record USING btree (tenant_id, employee_id, starts_on DESC);

CREATE INDEX leave_record_tenant_reason_starts_idx ON hr.leave_record USING btree (tenant_id, absence_reason_id, starts_on DESC);

CREATE UNIQUE INDEX legal_nature_code_key ON hr.legal_nature USING btree (tenant_id, code);

CREATE INDEX legal_nature_status_idx ON hr.legal_nature USING btree (status);

CREATE INDEX legal_responsible_branch_id_status_idx ON hr.legal_responsible USING btree (branch_id, status);

CREATE INDEX legal_responsible_cpf_idx ON hr.legal_responsible USING btree (cpf);

CREATE UNIQUE INDEX legislation_code_key ON hr.legislation USING btree (tenant_id, code);

CREATE INDEX legislation_norm_type_idx ON hr.legislation USING btree (norm_type);

CREATE INDEX legislation_norm_year_idx ON hr.legislation USING btree (norm_year);

CREATE INDEX medical_appointment_employee_id_scheduled_on_idx ON hr.medical_appointment USING btree (employee_id, scheduled_on);

CREATE INDEX medical_appointment_status_idx ON hr.medical_appointment USING btree (status);

CREATE UNIQUE INDEX medical_appointment_tenant_slot_ref_key ON hr.medical_appointment USING btree (tenant_id, slot_ref);

CREATE INDEX medical_leave_absence_reason_id_idx ON hr.medical_leave USING btree (absence_reason_id);

CREATE INDEX medical_leave_employee_id_starts_on_idx ON hr.medical_leave USING btree (employee_id, starts_on);

CREATE INDEX medical_leave_expert_opinion_idx ON hr.medical_leave USING btree (expert_opinion_id);

CREATE INDEX medical_leave_medical_record_id_idx ON hr.medical_leave USING btree (medical_record_id);

CREATE INDEX medical_leave_status_idx ON hr.medical_leave USING btree (status);

CREATE INDEX medical_leave_tenant_employee_starts_idx ON hr.medical_leave USING btree (tenant_id, employee_id, starts_on DESC);

CREATE INDEX medical_record_appointment_id_idx ON hr.medical_record USING btree (appointment_id);

CREATE INDEX medical_record_decision_idx ON hr.medical_record USING btree (decision);

CREATE INDEX medical_record_employee_id_created_at_idx ON hr.medical_record USING btree (employee_id, created_at DESC);

CREATE INDEX medical_record_report_status_idx ON hr.medical_record USING btree (report_status);

CREATE INDEX merit_progression_evaluation_id_idx ON hr.merit_progression USING btree (performance_evaluation_id);

CREATE INDEX merit_progression_level_idx ON hr.merit_progression USING btree (source_salary_range_level_id, target_salary_range_level_id);

CREATE INDEX merit_progression_source_reference_idx ON hr.merit_progression USING btree (source_salary_reference_id);

CREATE INDEX merit_progression_status_idx ON hr.merit_progression USING btree (tenant_id, status, data_efeito);

CREATE INDEX merit_progression_target_reference_idx ON hr.merit_progression USING btree (target_salary_reference_id);

CREATE INDEX merit_progression_tenant_employee_idx ON hr.merit_progression USING btree (tenant_id, employee_id);

CREATE INDEX pension_compensation_employee_id_idx ON hr.pension_compensation USING btree (employee_id);

CREATE INDEX pension_compensation_tenant_status_idx ON hr.pension_compensation USING btree (tenant_id, status);

CREATE INDEX pension_grant_benefit_type_idx ON hr.pension_grant USING btree (benefit_type);

CREATE INDEX pension_grant_instituting_employee_id_idx ON hr.pension_grant USING btree (instituting_employee_id);

CREATE INDEX pension_grant_tenant_granted_idx ON hr.pension_grant USING btree (tenant_id, granted_on);

CREATE INDEX performance_evaluation_branch_id_idx ON hr.performance_evaluation USING btree (branch_id);

CREATE INDEX performance_evaluation_job_function_id_idx ON hr.performance_evaluation USING btree (job_function_id);

CREATE INDEX performance_evaluation_job_position_id_idx ON hr.performance_evaluation USING btree (job_position_id);

CREATE INDEX performance_evaluation_status_idx ON hr.performance_evaluation USING btree (status);

CREATE INDEX performance_evaluation_tenant_employee_idx ON hr.performance_evaluation USING btree (tenant_id, employee_id);

CREATE INDEX performance_evaluation_work_location_id_idx ON hr.performance_evaluation USING btree (work_location_id);

CREATE INDEX previdentiary_declaration_tenant_employee_type_idx ON hr.previdentiary_declaration USING btree (tenant_id, employee_id, type);

CREATE INDEX probation_evaluation_decision_idx ON hr.probation_evaluation USING btree (decision);

CREATE INDEX probation_evaluation_tenant_employee_idx ON hr.probation_evaluation USING btree (tenant_id, employee_id, period_end DESC);

CREATE INDEX professional_experience_employee_id_idx ON hr.professional_experience USING btree (employee_id);

CREATE INDEX professional_experience_tenant_employee_idx ON hr.professional_experience USING btree (tenant_id, employee_id, starts_on DESC);

CREATE UNIQUE INDEX reason_code_key ON hr.reason USING btree (tenant_id, code);

CREATE INDEX reason_kind_status_idx ON hr.reason USING btree (kind, status);

CREATE INDEX recertification_beneficiary_campaign_id_idx ON hr.recertification_beneficiary USING btree (campaign_id);

CREATE UNIQUE INDEX recertification_beneficiary_employee_id_key ON hr.recertification_beneficiary USING btree (employee_id);

CREATE INDEX recertification_beneficiary_tenant_status_due_idx ON hr.recertification_beneficiary USING btree (tenant_id, status, next_due_date);

CREATE INDEX recertification_campaign_tenant_type_active_idx ON hr.recertification_campaign USING btree (tenant_id, type, active);

CREATE INDEX recertification_record_tenant_beneficiary_date_idx ON hr.recertification_record USING btree (tenant_id, beneficiary_id, recertified_on);

CREATE UNIQUE INDEX recruitment_candidate_request_id_person_ref_key ON hr.recruitment_candidate USING btree (request_id, person_ref);

CREATE INDEX recruitment_candidate_status_idx ON hr.recruitment_candidate USING btree (status);

CREATE INDEX recruitment_candidate_tenant_request_idx ON hr.recruitment_candidate USING btree (tenant_id, request_id);

CREATE INDEX recruitment_request_branch_id_idx ON hr.recruitment_request USING btree (branch_id);

CREATE INDEX recruitment_request_function_job_function_id_idx ON hr.recruitment_request_function USING btree (job_function_id);

CREATE INDEX recruitment_request_function_shift_id_idx ON hr.recruitment_request_function USING btree (shift_id);

CREATE INDEX recruitment_request_function_tenant_request_idx ON hr.recruitment_request_function USING btree (tenant_id, request_id);

CREATE INDEX recruitment_request_tenant_status_idx ON hr.recruitment_request USING btree (tenant_id, status);

CREATE INDEX recruitment_request_work_location_id_idx ON hr.recruitment_request USING btree (work_location_id);

CREATE UNIQUE INDEX reference_catalog_entry_tenant_catalog_code_key ON hr.reference_catalog_entry USING btree (tenant_id, catalog_key, code);

CREATE INDEX reference_catalog_entry_tenant_catalog_status_idx ON hr.reference_catalog_entry USING btree (tenant_id, catalog_key, status);

CREATE INDEX reintegration_order_tenant_link_idx ON hr.reintegration_order USING btree (tenant_id, employment_link_id, created_at DESC);

CREATE INDEX retirement_grant_rule_id_idx ON hr.retirement_grant USING btree (rule_id);

CREATE INDEX retirement_grant_tenant_employee_idx ON hr.retirement_grant USING btree (tenant_id, employee_id, granted_on);

CREATE INDEX retirement_rule_tenant_active_idx ON hr.retirement_rule USING btree (tenant_id, active);

CREATE INDEX retirement_simulation_rule_id_idx ON hr.retirement_simulation USING btree (rule_id);

CREATE INDEX retirement_simulation_tenant_employee_idx ON hr.retirement_simulation USING btree (tenant_id, employee_id);

CREATE INDEX salary_level_history_employee_id_effective_on_idx ON hr.salary_level_history USING btree (employee_id, effective_on);

CREATE INDEX salary_level_history_level_vigencia_idx ON hr.salary_level_history USING btree (tenant_id, salary_range_level_id, vigencia_inicio DESC) WHERE (salary_range_level_id IS NOT NULL);

CREATE INDEX salary_level_history_salary_reference_id_idx ON hr.salary_level_history USING btree (salary_reference_id);

CREATE INDEX salary_level_history_tenant_employee_idx ON hr.salary_level_history USING btree (tenant_id, employee_id, effective_on DESC);

CREATE INDEX salary_range_career_plan_idx ON hr.salary_range USING btree (career_plan_id);

CREATE UNIQUE INDEX salary_range_code_key ON hr.salary_range USING btree (tenant_id, code);

CREATE INDEX salary_range_group_code_class_code_idx ON hr.salary_range USING btree (group_code, class_code);

CREATE INDEX salary_range_level_salary_reference_idx ON hr.salary_range_level USING btree (salary_reference_id);

CREATE INDEX salary_range_level_status_idx ON hr.salary_range_level USING btree (status);

CREATE UNIQUE INDEX salary_range_level_tenant_range_class_level_key ON hr.salary_range_level USING btree (tenant_id, salary_range_id, class_number, level_number_fol02);

CREATE UNIQUE INDEX salary_range_level_tenant_range_code_key ON hr.salary_range_level USING btree (tenant_id, salary_range_id, code);

CREATE INDEX salary_range_status_idx ON hr.salary_range USING btree (status);

CREATE UNIQUE INDEX salary_reference_code_key ON hr.salary_reference USING btree (tenant_id, code);

CREATE INDEX salary_reference_range_id_idx ON hr.salary_reference USING btree (range_id);

CREATE INDEX salary_reference_status_idx ON hr.salary_reference USING btree (status);

CREATE INDEX salary_reference_vigencia_idx ON hr.salary_reference USING btree (tenant_id, range_id, code, vigencia_inicio DESC);

CREATE INDEX salary_simulation_adjustment_tenant_simulation_idx ON hr.salary_simulation_adjustment USING btree (tenant_id, simulation_id);

CREATE INDEX salary_simulation_progression_idx ON hr.salary_simulation USING btree (tenant_id, progression_id) WHERE (progression_id IS NOT NULL);

CREATE INDEX salary_simulation_tenant_employee_idx ON hr.salary_simulation USING btree (tenant_id, employee_id);

CREATE INDEX service_provider_agreement_idx ON hr.service_provider USING btree (agreement_id);

CREATE INDEX service_provider_branch_idx ON hr.service_provider USING btree (branch_id);

CREATE INDEX service_provider_category_entry_idx ON hr.service_provider USING btree (category_entry_id);

CREATE INDEX service_provider_cbo_entry_idx ON hr.service_provider USING btree (cbo_entry_id);

CREATE INDEX service_provider_earning_deduction_idx ON hr.service_provider USING btree (earning_deduction_id);

CREATE INDEX service_provider_status_idx ON hr.service_provider USING btree (status);

CREATE UNIQUE INDEX service_provider_tenant_code_key ON hr.service_provider USING btree (tenant_id, code);

CREATE UNIQUE INDEX service_provider_tenant_cpf_cnpj_key ON hr.service_provider USING btree (tenant_id, cpf_cnpj);

CREATE INDEX service_taker_gps_payment_code_idx ON hr.service_taker USING btree (gps_payment_code_id);

CREATE INDEX service_taker_sefip_code_idx ON hr.service_taker USING btree (sefip_code_id);

CREATE INDEX service_taker_status_idx ON hr.service_taker USING btree (status);

CREATE UNIQUE INDEX service_taker_tenant_cnpj_key ON hr.service_taker USING btree (tenant_id, cnpj);

CREATE UNIQUE INDEX service_taker_tenant_code_key ON hr.service_taker USING btree (tenant_id, code);

CREATE INDEX service_time_record_employee_id_starts_on_idx ON hr.service_time_record USING btree (employee_id, starts_on);

CREATE INDEX service_time_record_tenant_employee_idx ON hr.service_time_record USING btree (tenant_id, employee_id, starts_on DESC);

CREATE UNIQUE INDEX shift_code_key ON hr.shift USING btree (tenant_id, code);

CREATE INDEX shift_day_off_shift_id_idx ON hr.shift_day_off USING btree (shift_id);

CREATE UNIQUE INDEX shift_day_off_shift_weekday_key ON hr.shift_day_off USING btree (tenant_id, shift_id, weekday);

CREATE INDEX shift_day_off_status_idx ON hr.shift_day_off USING btree (status);

CREATE INDEX shift_status_idx ON hr.shift USING btree (status);

CREATE UNIQUE INDEX termination_reason_code_key ON hr.termination_reason USING btree (tenant_id, code);

CREATE INDEX termination_reason_status_idx ON hr.termination_reason USING btree (status);

CREATE INDEX training_suggestion_complement_city_entry_idx ON hr.training_suggestion_complement USING btree (city_entry_id);

CREATE UNIQUE INDEX training_suggestion_complement_key ON hr.training_suggestion_complement USING btree (tenant_id, suggestion_id, code);

CREATE INDEX training_suggestion_complement_status_idx ON hr.training_suggestion_complement USING btree (status);

CREATE INDEX training_suggestion_complement_suggestion_idx ON hr.training_suggestion_complement USING btree (suggestion_id);

CREATE UNIQUE INDEX training_suggestion_cost_key ON hr.training_suggestion_cost USING btree (tenant_id, suggestion_id, code);

CREATE INDEX training_suggestion_cost_status_idx ON hr.training_suggestion_cost USING btree (status);

CREATE INDEX training_suggestion_cost_suggestion_idx ON hr.training_suggestion_cost USING btree (suggestion_id);

CREATE INDEX training_suggestion_course_entry_idx ON hr.training_suggestion USING btree (course_entry_id);

CREATE INDEX training_suggestion_employee_employee_idx ON hr.training_suggestion_employee USING btree (employee_id);

CREATE UNIQUE INDEX training_suggestion_employee_key ON hr.training_suggestion_employee USING btree (tenant_id, suggestion_id, employee_id);

CREATE INDEX training_suggestion_employee_status_idx ON hr.training_suggestion_employee USING btree (status);

CREATE INDEX training_suggestion_employee_suggestion_idx ON hr.training_suggestion_employee USING btree (suggestion_id);

CREATE INDEX training_suggestion_status_idx ON hr.training_suggestion USING btree (status);

CREATE UNIQUE INDEX training_suggestion_tenant_code_key ON hr.training_suggestion USING btree (tenant_id, code);

CREATE UNIQUE INDEX transit_benefit_code_key ON hr.transit_benefit USING btree (tenant_id, code);

CREATE INDEX transit_benefit_status_idx ON hr.transit_benefit USING btree (status);

CREATE INDEX tsv_contract_change_tenant_contract_effective_idx ON hr.tsv_contract_change USING btree (tenant_id, tsv_contract_id, effective_date);

CREATE UNIQUE INDEX union_entity_cnpj_key ON hr.union_entity USING btree (tenant_id, cnpj);

CREATE UNIQUE INDEX union_entity_code_key ON hr.union_entity USING btree (tenant_id, code);

CREATE INDEX union_entity_status_idx ON hr.union_entity USING btree (status);

CREATE INDEX vacation_record_employee_id_starts_on_idx ON hr.vacation_record USING btree (employee_id, starts_on);

CREATE INDEX vacation_record_payroll_run_id_idx ON hr.vacation_record USING btree (payroll_run_id);

CREATE INDEX vacation_record_payroll_trigger_idx ON hr.vacation_record USING btree (tenant_id, starts_on, payroll_run_id) WHERE ((payroll_run_id IS NULL) AND (status = ANY (ARRAY['programado'::text, 'aprovado'::text])));

CREATE INDEX vacation_record_status_idx ON hr.vacation_record USING btree (status);

CREATE INDEX vacation_record_status_text_idx ON hr.vacation_record USING btree (status);

CREATE INDEX vacation_record_tenant_accrual_period_idx ON hr.vacation_record USING btree (tenant_id, employee_id, accrual_period_start, accrual_period_end);

CREATE INDEX vacation_record_tenant_employee_idx ON hr.vacation_record USING btree (tenant_id, employee_id, starts_on DESC);

CREATE INDEX vacation_record_vacation_type_id_idx ON hr.vacation_record USING btree (vacation_type_id);

CREATE UNIQUE INDEX vacation_type_code_key ON hr.vacation_type USING btree (tenant_id, code);

CREATE INDEX vacation_type_status_idx ON hr.vacation_type USING btree (status);

CREATE INDEX work_accident_employee_id_occurred_on_idx ON hr.work_accident USING btree (employee_id, occurred_on);

CREATE INDEX work_accident_medical_leave_id_idx ON hr.work_accident USING btree (medical_leave_id);

CREATE INDEX work_location_branch_id_idx ON hr.work_location USING btree (branch_id);

CREATE UNIQUE INDEX work_location_code_key ON hr.work_location USING btree (tenant_id, code);

CREATE INDEX work_location_geofence_gist_idx ON hr.work_location USING gist (geofence_polygon);

CREATE INDEX work_location_parent_id_idx ON hr.work_location USING btree (parent_id);

CREATE INDEX work_location_status_idx ON hr.work_location USING btree (status);

CREATE INDEX work_location_structure_assignment_function_idx ON hr.work_location_structure_assignment USING btree (job_function_id);

CREATE UNIQUE INDEX work_location_structure_assignment_function_key ON hr.work_location_structure_assignment USING btree (tenant_id, work_location_id, job_function_id);

CREATE INDEX work_location_structure_assignment_location_idx ON hr.work_location_structure_assignment USING btree (work_location_id);

CREATE INDEX work_location_structure_assignment_position_idx ON hr.work_location_structure_assignment USING btree (job_position_id);

CREATE UNIQUE INDEX work_location_structure_assignment_position_key ON hr.work_location_structure_assignment USING btree (tenant_id, work_location_id, job_position_id);

CREATE INDEX work_location_structure_assignment_status_idx ON hr.work_location_structure_assignment USING btree (status);

CREATE INDEX work_location_tenant_code_idx ON hr.work_location USING btree (tenant_id, code);
