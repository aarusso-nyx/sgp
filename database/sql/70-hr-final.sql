CREATE VIEW hr.v_employee_career_history AS
 SELECT history.tenant_id,
    history.employee_id,
    history.id AS event_id,
    'functional_status'::text AS event_type,
    history.starts_on AS event_date,
    history.ends_on,
    status.description AS title,
    history.notes,
    jsonb_build_object('functionalStatusId', history.functional_status_id, 'reasonId', history.reason_id) AS metadata
   FROM (hr.employee_status_history history
     JOIN hr.functional_status status ON ((status.id = history.functional_status_id)))
UNION ALL
 SELECT vacation_record.tenant_id,
    vacation_record.employee_id,
    vacation_record.id AS event_id,
    'vacation'::text AS event_type,
    vacation_record.starts_on AS event_date,
    vacation_record.ends_on,
    'Ferias'::text AS title,
    ''::text AS notes,
    jsonb_build_object('days', vacation_record.days, 'status', vacation_record.status) AS metadata
   FROM hr.vacation_record
UNION ALL
 SELECT leave_record.tenant_id,
    leave_record.employee_id,
    leave_record.id AS event_id,
    'leave'::text AS event_type,
    leave_record.starts_on AS event_date,
    leave_record.ends_on,
    COALESCE(reason.description, 'Licenca'::text) AS title,
    leave_record.notes,
    jsonb_build_object('days', leave_record.days, 'status', (leave_record.status)::text, 'absenceReasonId', leave_record.absence_reason_id) AS metadata
   FROM (hr.leave_record
     LEFT JOIN hr.absence_reason reason ON ((reason.id = leave_record.absence_reason_id)))
UNION ALL
 SELECT medical_leave.tenant_id,
    medical_leave.employee_id,
    medical_leave.id AS event_id,
    'medical_leave'::text AS event_type,
    medical_leave.starts_on AS event_date,
    medical_leave.ends_on,
    'Licenca medica'::text AS title,
    ''::text AS notes,
    jsonb_build_object('days', medical_leave.granted_days, 'status', (medical_leave.status)::text) AS metadata
   FROM hr.medical_leave
UNION ALL
 SELECT service_time_record.tenant_id,
    service_time_record.employee_id,
    service_time_record.id AS event_id,
    'service_time'::text AS event_type,
    service_time_record.starts_on AS event_date,
    service_time_record.ends_on,
    service_time_record.source AS title,
    service_time_record.notes,
    jsonb_build_object('daysCount', service_time_record.days_count) AS metadata
   FROM hr.service_time_record
  ORDER BY 5 DESC, 3 DESC;

CREATE VIEW hr.v_vacation_balance AS
 WITH active_contract AS (
         SELECT DISTINCT ON (contract.employee_id) contract.tenant_id,
            contract.employee_id,
            COALESCE(contract.exercise_on, contract.starts_on) AS exercise_on
           FROM hr.employment_contract contract
          WHERE (contract.status = 'ACTIVE'::public."RecordStatus")
          ORDER BY contract.employee_id, contract.starts_on DESC
        ), periods AS (
         SELECT contract.tenant_id,
            contract.employee_id,
            ((contract.exercise_on + ((series.n || ' years'::text))::interval))::date AS accrual_period_start,
            (((contract.exercise_on + (((series.n + 1) || ' years'::text))::interval) - '1 day'::interval))::date AS accrual_period_end
           FROM (active_contract contract
             CROSS JOIN LATERAL generate_series(0, GREATEST(0, (EXTRACT(year FROM age((CURRENT_DATE)::timestamp with time zone, (contract.exercise_on)::timestamp with time zone)))::integer)) series(n))
          WHERE (contract.exercise_on IS NOT NULL)
        )
 SELECT periods.tenant_id,
    periods.employee_id,
    periods.accrual_period_start,
    periods.accrual_period_end,
        CASE
            WHEN (CURRENT_DATE > periods.accrual_period_end) THEN 30
            ELSE 0
        END AS accrued_days,
    (COALESCE(sum(record.days) FILTER (WHERE (record.status = ANY (ARRAY['aprovado'::text, 'gozado'::text]))), (0)::bigint))::integer AS used_days,
    (COALESCE(sum(record.pecuniary_bonus_days) FILTER (WHERE (record.status = ANY (ARRAY['aprovado'::text, 'gozado'::text]))), (0)::bigint))::integer AS pecuniary_bonus_days,
    (GREATEST(((
        CASE
            WHEN (CURRENT_DATE > periods.accrual_period_end) THEN 30
            ELSE 0
        END - COALESCE(sum(record.days) FILTER (WHERE (record.status = ANY (ARRAY['aprovado'::text, 'gozado'::text]))), (0)::bigint)) - COALESCE(sum(record.pecuniary_bonus_days) FILTER (WHERE (record.status = ANY (ARRAY['aprovado'::text, 'gozado'::text]))), (0)::bigint)), (0)::bigint))::integer AS available_days
   FROM (periods
     LEFT JOIN hr.vacation_record record ON (((record.tenant_id = periods.tenant_id) AND (record.employee_id = periods.employee_id) AND (record.accrual_period_start = periods.accrual_period_start) AND (record.accrual_period_end = periods.accrual_period_end) AND (record.status <> 'cancelado'::text))))
  GROUP BY periods.tenant_id, periods.employee_id, periods.accrual_period_start, periods.accrual_period_end;

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

CREATE TRIGGER audit_reintegration_order_mutation AFTER INSERT OR DELETE OR UPDATE ON hr.reintegration_order FOR EACH ROW EXECUTE FUNCTION hr.audit_reintegration_order_mutation();

CREATE TRIGGER audit_tsv_contract_change_mutation AFTER INSERT OR DELETE OR UPDATE ON hr.tsv_contract_change FOR EACH ROW EXECUTE FUNCTION hr.audit_tsv_contract_change_mutation();

CREATE TRIGGER audit_tsv_contract_mutation AFTER INSERT OR DELETE OR UPDATE ON hr.tsv_contract FOR EACH ROW EXECUTE FUNCTION hr.audit_tsv_contract_mutation();

CREATE TRIGGER employee_alimony_audit AFTER INSERT OR DELETE OR UPDATE ON hr.employee_alimony FOR EACH ROW EXECUTE FUNCTION hr.sgp_employee_alimony_mutation();

CREATE TRIGGER employee_bank_account_audit AFTER INSERT OR DELETE OR UPDATE ON hr.employee_bank_account FOR EACH ROW EXECUTE FUNCTION hr.sgp_employee_bank_account_audit();

CREATE TRIGGER employee_transfer_effect_after_update AFTER UPDATE ON hr.employee_transfer FOR EACH ROW EXECUTE FUNCTION hr.sgp_effect_employee_transfer();

CREATE TRIGGER es03_employment_link_s2299 AFTER UPDATE ON hr.employment_link FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2299_from_employment_link();

CREATE TRIGGER es03_leave_record_s2230 AFTER INSERT OR UPDATE ON hr.leave_record FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2230_from_leave();

CREATE TRIGGER es03_vacation_record_s2230 AFTER INSERT OR UPDATE ON hr.vacation_record FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2230_from_vacation();

CREATE TRIGGER hr01_employee_timeline AFTER INSERT OR UPDATE OF functional_status_id, terminated_on, lifecycle_status ON hr.employee FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_employee_timeline();

CREATE TRIGGER hr01_employment_contract_updated_at BEFORE UPDATE ON hr.employment_contract FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_set_updated_at();

CREATE TRIGGER hr01_status_history_immutable BEFORE DELETE OR UPDATE ON hr.employee_status_history FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_status_history_immutable();

CREATE TRIGGER hr02_employment_link_timeline AFTER UPDATE OF contract_type, functional_status_id ON hr.employment_link FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr02_employment_link_timeline();

CREATE TRIGGER hr03_vacation_record_audit AFTER INSERT OR DELETE OR UPDATE ON hr.vacation_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr03_vacation_record_audit();

CREATE TRIGGER hr04_leave_record_audit AFTER INSERT OR DELETE OR UPDATE ON hr.leave_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

CREATE TRIGGER hr04_medical_appointment_audit AFTER INSERT OR DELETE OR UPDATE ON hr.medical_appointment FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

CREATE TRIGGER hr04_medical_record_audit AFTER INSERT OR DELETE OR UPDATE ON hr.medical_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

CREATE TRIGGER hr04_medical_record_conclude AFTER INSERT OR UPDATE OF decision ON hr.medical_record FOR EACH ROW WHEN ((new.decision = 'granted'::text)) EXECUTE FUNCTION hr.sgp_hr04_medical_record_conclude();

CREATE TRIGGER hr05_leave_record_approval_history AFTER UPDATE OF approved_at ON hr.leave_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr05_leave_record_approval_history();

CREATE TRIGGER hr05_leave_record_validate BEFORE INSERT OR UPDATE OF absence_reason_id, starts_on, ends_on, days, supporting_document_ref, paid ON hr.leave_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr05_leave_record_validate();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.cost_center FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.job_function FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.job_position FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.job_structure_employment_link FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.work_location FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.work_location_structure_assignment FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr07_cadastral_change_audit AFTER INSERT OR DELETE OR UPDATE ON hr.cadastral_change_request FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr07_cadastral_change_audit();

CREATE TRIGGER hr08_probation_evaluation_updated_at BEFORE UPDATE ON hr.probation_evaluation FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_set_updated_at();

CREATE TRIGGER hr08_probation_statutory_only BEFORE INSERT OR UPDATE ON hr.probation_evaluation FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_probation_statutory_only();

CREATE TRIGGER hr08_status_history_immutable BEFORE DELETE OR UPDATE ON hr.employee_status_history FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_status_history_immutable();

CREATE TRIGGER trg_apply_merit_progression BEFORE UPDATE OF status ON hr.merit_progression FOR EACH ROW EXECUTE FUNCTION avaliacao.apply_merit_progression();

CREATE TRIGGER trg_employee_dependent_s2205_pending AFTER INSERT OR DELETE OR UPDATE ON hr.employee_dependent FOR EACH ROW EXECUTE FUNCTION esocial.trg_employee_dependent_s2205_pending();

CREATE TRIGGER trg_employee_s2205_pending AFTER UPDATE ON hr.employee FOR EACH ROW EXECUTE FUNCTION esocial.trg_employee_s2205_pending();

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

COMMENT ON COLUMN hr.employee.abono_permanencia_ativo IS 'Whether permanence allowance is active for the employee.';

COMMENT ON COLUMN hr.employee.abono_permanencia_inicio IS 'Start date for permanence allowance eligibility.';

COMMENT ON COLUMN hr.employee.abono_permanencia_fundamento IS 'Legal basis recorded when permanence allowance is changed.';

COMMENT ON COLUMN hr.salary_reference.amount IS 'Monetary amount in BRL; numeric(14,2); round at payroll earning/deduction boundary.';
