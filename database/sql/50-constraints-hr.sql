ALTER TABLE ONLY hr.absence_reason
    ADD CONSTRAINT absence_reason_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.act_classification
    ADD CONSTRAINT act_classification_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.administrative_process_function
    ADD CONSTRAINT administrative_process_function_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.administrative_process
    ADD CONSTRAINT administrative_process_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.agreement
    ADD CONSTRAINT agreement_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.bank
    ADD CONSTRAINT bank_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.beneficiary_contact_history
    ADD CONSTRAINT beneficiary_contact_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.branch
    ADD CONSTRAINT branch_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.business_day
    ADD CONSTRAINT business_day_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.cadastral_change_request
    ADD CONSTRAINT cadastral_change_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.career_plan
    ADD CONSTRAINT career_plan_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.company
    ADD CONSTRAINT company_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.competence_period
    ADD CONSTRAINT competence_period_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.consignment_entity
    ADD CONSTRAINT consignment_entity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.consignment_import_job
    ADD CONSTRAINT consignment_import_job_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.contract_type
    ADD CONSTRAINT contract_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.contribution_time_certificate
    ADD CONSTRAINT contribution_time_certificate_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.cost_center
    ADD CONSTRAINT cost_center_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.education_institution
    ADD CONSTRAINT education_institution_pkey PRIMARY KEY (id);

ALTER TABLE hr.employee_alimony
    ADD CONSTRAINT employee_alimony_amount_source_check CHECK ((((fixed_amount IS NOT NULL) AND (rate IS NULL)) OR ((fixed_amount IS NULL) AND (rate IS NOT NULL)))) NOT VALID;

ALTER TABLE hr.employee_alimony
    ADD CONSTRAINT employee_alimony_fixed_amount_check CHECK (((fixed_amount IS NULL) OR (fixed_amount >= (0)::numeric))) NOT VALID;

ALTER TABLE ONLY hr.employee_alimony_history
    ADD CONSTRAINT employee_alimony_history_pkey PRIMARY KEY (history_id);

ALTER TABLE ONLY hr.employee_alimony
    ADD CONSTRAINT employee_alimony_pkey PRIMARY KEY (id);

ALTER TABLE hr.employee_alimony
    ADD CONSTRAINT employee_alimony_rate_check CHECK (((rate IS NULL) OR ((rate > (0)::numeric) AND (rate <= (100)::numeric)))) NOT VALID;

ALTER TABLE hr.employee_alimony
    ADD CONSTRAINT employee_alimony_valid_range_check CHECK (((valid_to IS NULL) OR (valid_to >= valid_from))) NOT VALID;

ALTER TABLE ONLY hr.employee_bank_account_history
    ADD CONSTRAINT employee_bank_account_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_bank_account
    ADD CONSTRAINT employee_bank_account_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_benefit_dependent
    ADD CONSTRAINT employee_benefit_dependent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_complement_data
    ADD CONSTRAINT employee_complement_data_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_dependent
    ADD CONSTRAINT employee_dependent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_exercise
    ADD CONSTRAINT employee_exercise_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_frequency
    ADD CONSTRAINT employee_frequency_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_payroll_item_import_job
    ADD CONSTRAINT employee_payroll_item_import_job_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_status_history
    ADD CONSTRAINT employee_status_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_tenant_id_id_uq UNIQUE (tenant_id, id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_transit_benefit
    ADD CONSTRAINT employee_transit_benefit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_union_contribution
    ADD CONSTRAINT employee_union_contribution_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employment_contract
    ADD CONSTRAINT employment_contract_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employment_link
    ADD CONSTRAINT employment_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employment_link
    ADD CONSTRAINT employment_link_tenant_id_id_uq UNIQUE (tenant_id, id);

ALTER TABLE ONLY hr.external_life_proof
    ADD CONSTRAINT external_life_proof_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.file_export_job
    ADD CONSTRAINT file_export_job_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.function_nature
    ADD CONSTRAINT function_nature_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.functional_status
    ADD CONSTRAINT functional_status_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.health_exam_provider_exam_link
    ADD CONSTRAINT health_exam_provider_exam_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.health_provider_agreement_link
    ADD CONSTRAINT health_provider_agreement_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.internship_program
    ADD CONSTRAINT internship_program_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.internship_record
    ADD CONSTRAINT internship_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_function_legislation_history
    ADD CONSTRAINT job_function_legislation_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_function
    ADD CONSTRAINT job_function_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_position
    ADD CONSTRAINT job_position_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_position
    ADD CONSTRAINT job_position_tenant_id_id_uq UNIQUE (tenant_id, id);

ALTER TABLE ONLY hr.job_structure_employment_link
    ADD CONSTRAINT job_structure_employment_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_structure_reference_link
    ADD CONSTRAINT job_structure_reference_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.leave_record
    ADD CONSTRAINT leave_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.legal_nature
    ADD CONSTRAINT legal_nature_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.legal_responsible
    ADD CONSTRAINT legal_responsible_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.legislation
    ADD CONSTRAINT legislation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.medical_appointment
    ADD CONSTRAINT medical_appointment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.medical_leave
    ADD CONSTRAINT medical_leave_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.medical_record
    ADD CONSTRAINT medical_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT merit_progression_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.pension_compensation
    ADD CONSTRAINT pension_compensation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.pension_grant
    ADD CONSTRAINT pension_grant_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.performance_evaluation
    ADD CONSTRAINT performance_evaluation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.previdentiary_declaration
    ADD CONSTRAINT previdentiary_declaration_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.probation_evaluation
    ADD CONSTRAINT probation_evaluation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.professional_experience
    ADD CONSTRAINT professional_experience_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.reason
    ADD CONSTRAINT reason_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recertification_beneficiary
    ADD CONSTRAINT recertification_beneficiary_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recertification_campaign
    ADD CONSTRAINT recertification_campaign_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recertification_record
    ADD CONSTRAINT recertification_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recruitment_candidate
    ADD CONSTRAINT recruitment_candidate_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recruitment_request_function
    ADD CONSTRAINT recruitment_request_function_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recruitment_request
    ADD CONSTRAINT recruitment_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.reference_catalog_entry
    ADD CONSTRAINT reference_catalog_entry_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.reintegration_order
    ADD CONSTRAINT reintegration_order_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.retirement_grant
    ADD CONSTRAINT retirement_grant_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.retirement_rule
    ADD CONSTRAINT retirement_rule_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.retirement_simulation
    ADD CONSTRAINT retirement_simulation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_level_history
    ADD CONSTRAINT salary_level_history_level_vigencia_excl EXCLUDE USING gist (tenant_id WITH =, salary_range_level_id WITH =, daterange(vigencia_inicio, COALESCE(vigencia_fim, 'infinity'::date), '[]'::text) WITH &&) WHERE ((salary_range_level_id IS NOT NULL));

ALTER TABLE ONLY hr.salary_level_history
    ADD CONSTRAINT salary_level_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_range_level
    ADD CONSTRAINT salary_range_level_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_range
    ADD CONSTRAINT salary_range_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_reference
    ADD CONSTRAINT salary_reference_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_reference
    ADD CONSTRAINT salary_reference_vigencia_excl EXCLUDE USING gist (tenant_id WITH =, code WITH =, daterange(vigencia_inicio, COALESCE(vigencia_fim, 'infinity'::date), '[]'::text) WITH &&);

ALTER TABLE ONLY hr.salary_simulation_adjustment
    ADD CONSTRAINT salary_simulation_adjustment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_simulation
    ADD CONSTRAINT salary_simulation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.service_provider
    ADD CONSTRAINT service_provider_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.service_taker
    ADD CONSTRAINT service_taker_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.service_time_record
    ADD CONSTRAINT service_time_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.shift_day_off
    ADD CONSTRAINT shift_day_off_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.shift
    ADD CONSTRAINT shift_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.termination_reason
    ADD CONSTRAINT termination_reason_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_suggestion_complement
    ADD CONSTRAINT training_suggestion_complement_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_suggestion_cost
    ADD CONSTRAINT training_suggestion_cost_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_suggestion_employee
    ADD CONSTRAINT training_suggestion_employee_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_suggestion
    ADD CONSTRAINT training_suggestion_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.transit_benefit
    ADD CONSTRAINT transit_benefit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.tsv_contract_change
    ADD CONSTRAINT tsv_contract_change_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.tsv_contract
    ADD CONSTRAINT tsv_contract_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.union_entity
    ADD CONSTRAINT union_entity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.vacation_record
    ADD CONSTRAINT vacation_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.vacation_type
    ADD CONSTRAINT vacation_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.work_accident
    ADD CONSTRAINT work_accident_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.work_location
    ADD CONSTRAINT work_location_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.work_location_structure_assignment
    ADD CONSTRAINT work_location_structure_assignment_pkey PRIMARY KEY (id);
