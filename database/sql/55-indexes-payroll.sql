CREATE INDEX accounting_account_accounting_history_id_idx ON payroll.accounting_account USING btree (accounting_history_id);

CREATE INDEX accounting_account_branch_id_idx ON payroll.accounting_account USING btree (branch_id);

CREATE INDEX accounting_account_cost_center_id_idx ON payroll.accounting_account USING btree (cost_center_id);

CREATE INDEX accounting_account_earning_deduction_id_idx ON payroll.accounting_account USING btree (earning_deduction_id);

CREATE INDEX accounting_account_simple_account_id_idx ON payroll.accounting_account USING btree (simple_account_id);

CREATE INDEX accounting_account_status_idx ON payroll.accounting_account USING btree (status);

CREATE INDEX accounting_account_work_location_work_location_id_idx ON payroll.accounting_account_work_location USING btree (work_location_id);

CREATE INDEX accounting_history_status_idx ON payroll.accounting_history USING btree (status);

CREATE UNIQUE INDEX accounting_history_tenant_code_key ON payroll.accounting_history USING btree (tenant_id, code);

CREATE INDEX advance_payment_employee_id_payment_date_idx ON payroll.advance_payment USING btree (employee_id, payment_date);

CREATE INDEX advance_payment_payroll_run_id_idx ON payroll.advance_payment USING btree (payroll_run_id);

CREATE INDEX advance_payment_request_id_idx ON payroll.advance_payment USING btree (request_id);

CREATE INDEX advance_payment_status_idx ON payroll.advance_payment USING btree (status);

CREATE INDEX advance_request_employee_id_requested_on_idx ON payroll.advance_request USING btree (employee_id, requested_on);

CREATE INDEX advance_request_payroll_run_id_idx ON payroll.advance_request USING btree (payroll_run_id);

CREATE INDEX advance_request_status_idx ON payroll.advance_request USING btree (status);

CREATE INDEX blocked_payment_branch_id_idx ON payroll.blocked_payment USING btree (branch_id);

CREATE INDEX blocked_payment_competence_year_competence_month_idx ON payroll.blocked_payment USING btree (competence_year, competence_month);

CREATE INDEX blocked_payment_employee_id_idx ON payroll.blocked_payment USING btree (employee_id);

CREATE INDEX blocked_payment_functional_status_id_idx ON payroll.blocked_payment USING btree (functional_status_id);

CREATE INDEX blocked_payment_payroll_run_id_idx ON payroll.blocked_payment USING btree (payroll_run_id);

CREATE INDEX blocked_payment_reason_id_idx ON payroll.blocked_payment USING btree (reason_id);

CREATE INDEX blocked_payment_released_at_idx ON payroll.blocked_payment USING btree (released_at);

CREATE INDEX blocked_payment_tenant_competence_idx ON payroll.blocked_payment USING btree (tenant_id, competence_year, competence_month, employee_id);

CREATE UNIQUE INDEX employee_payroll_item_active_idempotency_uq ON payroll.employee_payroll_item USING btree (idempotency_key) WHERE ((deleted_at IS NULL) AND (idempotency_key IS NOT NULL));

CREATE INDEX employee_payroll_item_active_run_idx ON payroll.employee_payroll_item USING btree (payroll_run_id, employee_id) WHERE (deleted_at IS NULL);

CREATE INDEX employee_payroll_item_earning_deduction_id_idx ON payroll.employee_payroll_item USING btree (earning_deduction_id);

CREATE INDEX employee_payroll_item_employee_id_competence_year_competenc_idx ON payroll.employee_payroll_item USING btree (employee_id, competence_year, competence_month);

CREATE INDEX employee_payroll_item_payroll_run_id_idx ON payroll.employee_payroll_item USING btree (payroll_run_id);

CREATE INDEX employee_payroll_item_tenant_competence_idx ON payroll.employee_payroll_item USING btree (tenant_id, competence_year, competence_month, employee_id);

CREATE INDEX employment_link_earning_earning_deduction_id_idx ON payroll.employment_link_earning USING btree (earning_deduction_id);

CREATE INDEX employment_link_earning_employment_link_id_idx ON payroll.employment_link_earning USING btree (employment_link_id);

CREATE INDEX employment_link_earning_status_idx ON payroll.employment_link_earning USING btree (status);

CREATE UNIQUE INDEX employment_link_earning_tenant_link_earning_key ON payroll.employment_link_earning USING btree (tenant_id, employment_link_id, earning_deduction_id);

CREATE INDEX formula_attribute_earning_deduction_idx ON payroll.formula_attribute USING btree (earning_deduction_id);

CREATE INDEX formula_attribute_status_idx ON payroll.formula_attribute USING btree (status);

CREATE UNIQUE INDEX formula_attribute_tenant_code_key ON payroll.formula_attribute USING btree (tenant_id, code);

CREATE UNIQUE INDEX formula_attribute_tenant_earning_name_key ON payroll.formula_attribute USING btree (tenant_id, earning_deduction_id, name) WHERE (earning_deduction_id IS NOT NULL);

CREATE INDEX gps_payment_code_status_idx ON payroll.gps_payment_code USING btree (status);

CREATE UNIQUE INDEX gps_payment_code_tenant_code_key ON payroll.gps_payment_code USING btree (tenant_id, code);

CREATE INDEX job_function_earning_earning_deduction_id_idx ON payroll.job_function_earning USING btree (earning_deduction_id);

CREATE INDEX job_function_earning_job_function_id_idx ON payroll.job_function_earning USING btree (job_function_id);

CREATE INDEX job_function_earning_status_idx ON payroll.job_function_earning USING btree (status);

CREATE UNIQUE INDEX job_function_earning_tenant_function_earning_key ON payroll.job_function_earning USING btree (tenant_id, job_function_id, earning_deduction_id);

CREATE INDEX job_position_earning_earning_deduction_id_idx ON payroll.job_position_earning USING btree (earning_deduction_id);

CREATE INDEX job_position_earning_job_position_id_idx ON payroll.job_position_earning USING btree (job_position_id);

CREATE INDEX job_position_earning_status_idx ON payroll.job_position_earning USING btree (status);

CREATE UNIQUE INDEX job_position_earning_tenant_position_earning_key ON payroll.job_position_earning USING btree (tenant_id, job_position_id, earning_deduction_id);

CREATE INDEX payment_remittance_detail_alimony_idx ON payroll.payment_remittance_detail USING btree (tenant_id, alimony_id) WHERE (alimony_id IS NOT NULL);

CREATE INDEX payment_remittance_detail_employee_idx ON payroll.payment_remittance_detail USING btree (tenant_id, employee_id, created_at DESC);

CREATE UNIQUE INDEX payment_remittance_detail_file_sequence_uq ON payroll.payment_remittance_detail USING btree (tenant_id, file_id, sequence);

CREATE INDEX payment_remittance_file_bank_competence_idx ON payroll.payment_remittance_file USING btree (tenant_id, bank_code, competence_year, competence_month);

CREATE INDEX payment_remittance_file_branch_id_idx ON payroll.payment_remittance_file USING btree (branch_id);

CREATE INDEX payment_remittance_file_competence_year_competence_month_idx ON payroll.payment_remittance_file USING btree (competence_year, competence_month);

CREATE INDEX payment_remittance_file_payroll_run_id_idx ON payroll.payment_remittance_file USING btree (payroll_run_id);

CREATE INDEX payment_remittance_file_processing_type_id_idx ON payroll.payment_remittance_file USING btree (processing_type_id);

CREATE INDEX payment_remittance_file_reason_id_idx ON payroll.payment_remittance_file USING btree (reason_id);

CREATE INDEX payment_remittance_file_status_idx ON payroll.payment_remittance_file USING btree (status);

CREATE INDEX payment_remittance_file_tenant_competence_idx ON payroll.payment_remittance_file USING btree (tenant_id, competence_year, competence_month, created_at DESC);

CREATE INDEX payment_return_detail_employee_idx ON payroll.payment_return_detail USING btree (tenant_id, employee_id, created_at DESC);

CREATE UNIQUE INDEX payment_return_detail_return_sequence_uq ON payroll.payment_return_detail USING btree (tenant_id, return_file_id, sequence);

CREATE UNIQUE INDEX payment_return_file_hash_uq ON payroll.payment_return_file USING btree (tenant_id, file_hash);

CREATE INDEX payment_return_file_remittance_idx ON payroll.payment_return_file USING btree (tenant_id, remittance_file_id, processed_at DESC);

CREATE INDEX payroll_blocked_payment_tenant_id_idx ON payroll.blocked_payment USING btree (tenant_id);

CREATE INDEX payroll_earning_deduction_active_idx ON payroll.payroll_earning_deduction USING btree (active);

CREATE UNIQUE INDEX payroll_earning_deduction_code_key ON payroll.payroll_earning_deduction USING btree (tenant_id, code);

CREATE UNIQUE INDEX payroll_earning_deduction_formula_alias_uq ON payroll.payroll_earning_deduction USING btree (tenant_id, formula_alias) WHERE (formula_alias IS NOT NULL);

CREATE UNIQUE INDEX payroll_earning_deduction_formula_function_name_uq ON payroll.payroll_earning_deduction USING btree (tenant_id, formula_function_name) WHERE (formula_function_name IS NOT NULL);

CREATE INDEX payroll_earning_deduction_kind_idx ON payroll.payroll_earning_deduction USING btree (kind);

CREATE INDEX payroll_earning_deduction_tenant_code_idx ON payroll.payroll_earning_deduction USING btree (tenant_id, code);

CREATE INDEX payroll_employee_payroll_item_tenant_id_idx ON payroll.employee_payroll_item USING btree (tenant_id);

CREATE INDEX payroll_financial_record_branch_id_idx ON payroll.payroll_financial_record USING btree (branch_id);

CREATE INDEX payroll_financial_record_competence_year_competence_month_idx ON payroll.payroll_financial_record USING btree (competence_year, competence_month);

CREATE UNIQUE INDEX payroll_financial_record_employee_id_competence_year_compet_key ON payroll.payroll_financial_record USING btree (employee_id, competence_year, competence_month, payroll_run_id);

CREATE INDEX payroll_financial_record_functional_status_id_idx ON payroll.payroll_financial_record USING btree (functional_status_id);

CREATE INDEX payroll_financial_record_payroll_run_id_idx ON payroll.payroll_financial_record USING btree (payroll_run_id);

CREATE INDEX payroll_financial_record_tenant_competence_idx ON payroll.payroll_financial_record USING btree (tenant_id, competence_year, competence_month, employee_id);

CREATE INDEX payroll_financial_record_work_location_id_idx ON payroll.payroll_financial_record USING btree (work_location_id);

CREATE INDEX payroll_payment_remittance_file_tenant_id_idx ON payroll.payment_remittance_file USING btree (tenant_id);

CREATE INDEX payroll_payroll_earning_deduction_tenant_id_idx ON payroll.payroll_earning_deduction USING btree (tenant_id);

CREATE INDEX payroll_payroll_financial_record_tenant_id_idx ON payroll.payroll_financial_record USING btree (tenant_id);

CREATE INDEX payroll_payroll_run_status_history_tenant_id_idx ON payroll.payroll_run_status_history USING btree (tenant_id);

CREATE INDEX payroll_payroll_run_tenant_id_idx ON payroll.payroll_run USING btree (tenant_id);

CREATE INDEX payroll_payroll_type_tenant_id_idx ON payroll.payroll_type USING btree (tenant_id);

CREATE INDEX payroll_processing_type_tenant_id_idx ON payroll.processing_type USING btree (tenant_id);

CREATE INDEX payroll_run_branch_id_idx ON payroll.payroll_run USING btree (branch_id);

CREATE UNIQUE INDEX payroll_run_competence_year_competence_month_branch_id_payr_key ON payroll.payroll_run USING btree (tenant_id, competence_year, competence_month, branch_id, payroll_type_id, processing_type_id);

CREATE INDEX payroll_run_competence_year_competence_month_idx ON payroll.payroll_run USING btree (competence_year, competence_month);

CREATE INDEX payroll_run_status_history_changed_by_user_id_idx ON payroll.payroll_run_status_history USING btree (changed_by_user_id);

CREATE INDEX payroll_run_status_history_payroll_run_id_changed_at_idx ON payroll.payroll_run_status_history USING btree (payroll_run_id, changed_at);

CREATE INDEX payroll_run_status_history_status_idx ON payroll.payroll_run_status_history USING btree (status);

CREATE INDEX payroll_run_status_history_tenant_run_idx ON payroll.payroll_run_status_history USING btree (tenant_id, payroll_run_id, changed_at DESC);

CREATE INDEX payroll_run_status_idx ON payroll.payroll_run USING btree (status);

CREATE INDEX payroll_run_tenant_competence_idx ON payroll.payroll_run USING btree (tenant_id, competence_year, competence_month, created_at DESC);

CREATE UNIQUE INDEX payroll_run_work_location_run_location_key ON payroll.payroll_run_work_location USING btree (payroll_run_id, work_location_id);

CREATE INDEX payroll_run_work_location_work_location_id_idx ON payroll.payroll_run_work_location USING btree (work_location_id);

CREATE UNIQUE INDEX payroll_type_code_key ON payroll.payroll_type USING btree (tenant_id, code);

CREATE INDEX payroll_type_earning_earning_deduction_id_idx ON payroll.payroll_type_earning USING btree (earning_deduction_id);

CREATE INDEX payroll_type_earning_payroll_type_id_idx ON payroll.payroll_type_earning USING btree (payroll_type_id);

CREATE INDEX payroll_type_earning_status_idx ON payroll.payroll_type_earning USING btree (status);

CREATE UNIQUE INDEX payroll_type_earning_tenant_type_earning_key ON payroll.payroll_type_earning USING btree (tenant_id, payroll_type_id, earning_deduction_id);

CREATE INDEX payroll_type_status_idx ON payroll.payroll_type USING btree (status);

CREATE INDEX payroll_type_tenant_code_idx ON payroll.payroll_type USING btree (tenant_id, code);

CREATE UNIQUE INDEX processing_type_code_key ON payroll.processing_type USING btree (tenant_id, code);

CREATE INDEX processing_type_employment_link_id_idx ON payroll.processing_type USING btree (employment_link_id);

CREATE INDEX processing_type_payroll_type_id_idx ON payroll.processing_type USING btree (payroll_type_id);

CREATE INDEX processing_type_status_idx ON payroll.processing_type USING btree (status);

CREATE INDEX processing_type_tenant_code_idx ON payroll.processing_type USING btree (tenant_id, code);

CREATE INDEX professional_category_earning_category_entry_idx ON payroll.professional_category_earning USING btree (category_entry_id);

CREATE INDEX professional_category_earning_earning_deduction_idx ON payroll.professional_category_earning USING btree (earning_deduction_id);

CREATE UNIQUE INDEX professional_category_earning_key ON payroll.professional_category_earning USING btree (tenant_id, category_entry_id, earning_deduction_id);

CREATE INDEX professional_category_earning_status_idx ON payroll.professional_category_earning USING btree (status);

CREATE INDEX sefip_code_status_idx ON payroll.sefip_code USING btree (status);

CREATE UNIQUE INDEX sefip_code_tenant_code_type_key ON payroll.sefip_code USING btree (tenant_id, code, type);

CREATE INDEX simple_account_status_idx ON payroll.simple_account USING btree (status);

CREATE UNIQUE INDEX simple_account_tenant_code_key ON payroll.simple_account USING btree (tenant_id, code);
