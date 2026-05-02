CREATE VIEW payroll.v_payroll_run_line_active WITH (security_invoker='true') AS
 SELECT id,
    employee_id,
    payroll_run_id,
    earning_deduction_id,
    source,
    competence_year,
    competence_month,
    quantity,
    reference_value,
    amount,
    notes,
    created_at,
    updated_at,
    tenant_id,
    deleted_at,
    deleted_reason,
    idempotency_key
   FROM payroll.employee_payroll_item
  WHERE (deleted_at IS NULL);

CREATE VIEW payroll.v_termination_components WITH (security_invoker='true') AS
 SELECT item.tenant_id,
    item.payroll_run_id,
    item.employee_id,
    employee.employment_link_id,
    earning.code AS component_code,
    earning.description AS component_description,
    earning.kind AS component_kind,
    item.reference_value,
    item.quantity,
    item.amount,
    item.notes,
    item.created_at
   FROM ((((payroll.v_payroll_run_line_active item
     JOIN payroll.payroll_earning_deduction earning ON ((earning.id = item.earning_deduction_id)))
     JOIN payroll.payroll_run run ON ((run.id = item.payroll_run_id)))
     JOIN payroll.processing_type processing_type ON ((processing_type.id = run.processing_type_id)))
     JOIN hr.employee employee ON ((employee.id = item.employee_id)))
  WHERE ((processing_type.code = 'RESCISAO'::text) AND public.sgp_tenant_matches(item.tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text, 'portal.paystub.read'::text]));

CREATE VIEW payroll.v_termination_with_notice WITH (security_invoker='true') AS
 SELECT component.tenant_id,
    component.payroll_run_id,
    component.employee_id,
    component.employment_link_id,
    component.component_code,
    component.component_description,
    component.component_kind,
    component.reference_value,
    component.quantity,
    component.amount,
    component.notes,
    component.created_at,
    notice.kind AS prior_notice_kind,
    notice.notice_days AS prior_notice_days,
    notice.projected_end_date AS prior_notice_projected_end_date,
    notice.base_amount AS prior_notice_base_amount,
    notice.reduction_mode AS prior_notice_reduction_mode
   FROM (payroll.v_termination_components component
     LEFT JOIN payment.prior_notice notice ON (((notice.tenant_id = component.tenant_id) AND (notice.employment_link_id = component.employment_link_id))))
  WHERE (public.sgp_tenant_matches(component.tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.read'::text, 'payroll.run.write'::text]));

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

CREATE TRIGGER block_generated_payroll_item_change BEFORE INSERT OR DELETE OR UPDATE ON payroll.employee_payroll_item FOR EACH ROW EXECUTE FUNCTION payroll.block_generated_payroll_item_change();

CREATE TRIGGER payment_remittance_detail_audit AFTER INSERT OR DELETE OR UPDATE ON payroll.payment_remittance_detail FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_remittance_audit();

CREATE TRIGGER payment_remittance_file_audit AFTER INSERT OR DELETE OR UPDATE ON payroll.payment_remittance_file FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_remittance_audit();

CREATE TRIGGER payment_return_detail_audit AFTER INSERT OR DELETE OR UPDATE ON payroll.payment_return_detail FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_return_audit();

CREATE TRIGGER payment_return_file_audit AFTER INSERT OR DELETE OR UPDATE ON payroll.payment_return_file FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_return_audit();

CREATE TRIGGER trg_compile_formula_expression BEFORE INSERT OR UPDATE OF code, formula_alias, formula_expression ON payroll.payroll_earning_deduction FOR EACH ROW WHEN (((new.formula_expression IS NOT NULL) AND (btrim(new.formula_expression) <> ''::text))) EXECUTE FUNCTION payroll_calc.compile_formula_expression();

CREATE TRIGGER trg_earning_after_delete AFTER DELETE ON payroll.payroll_earning_deduction FOR EACH ROW EXECUTE FUNCTION payroll_calc.on_earning_after_delete();

CREATE TRIGGER trg_earning_before_delete BEFORE DELETE ON payroll.payroll_earning_deduction FOR EACH ROW EXECUTE FUNCTION payroll_calc.on_earning_before_delete();

CREATE TRIGGER trg_earning_before_truncate BEFORE TRUNCATE ON payroll.payroll_earning_deduction FOR EACH STATEMENT EXECUTE FUNCTION payroll_calc.on_earning_before_truncate();

CREATE TRIGGER trg_earning_formula_cache_invalidate AFTER UPDATE ON payroll.payroll_earning_deduction FOR EACH ROW EXECUTE FUNCTION payroll_calc.on_earning_formula_cache_invalidate();

CREATE TRIGGER trg_earning_formula_cache_materialize AFTER INSERT OR UPDATE ON payroll.payroll_earning_deduction FOR EACH ROW EXECUTE FUNCTION payroll_calc.on_earning_formula_cache_materialize();

ALTER TABLE ONLY payroll.accounting_account
    ADD CONSTRAINT accounting_account_accounting_history_id_fkey FOREIGN KEY (accounting_history_id) REFERENCES payroll.accounting_history(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.accounting_account
    ADD CONSTRAINT accounting_account_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.accounting_account
    ADD CONSTRAINT accounting_account_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES hr.cost_center(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.accounting_account
    ADD CONSTRAINT accounting_account_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.accounting_account
    ADD CONSTRAINT accounting_account_simple_account_id_fkey FOREIGN KEY (simple_account_id) REFERENCES payroll.simple_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.accounting_account_work_location
    ADD CONSTRAINT accounting_account_work_location_accounting_account_id_fkey FOREIGN KEY (accounting_account_id) REFERENCES payroll.accounting_account(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.accounting_account_work_location
    ADD CONSTRAINT accounting_account_work_location_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.advance_payment
    ADD CONSTRAINT advance_payment_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.advance_payment
    ADD CONSTRAINT advance_payment_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.advance_payment
    ADD CONSTRAINT advance_payment_request_id_fkey FOREIGN KEY (request_id) REFERENCES payroll.advance_request(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.advance_request
    ADD CONSTRAINT advance_request_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.advance_request
    ADD CONSTRAINT advance_request_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.blocked_payment
    ADD CONSTRAINT blocked_payment_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.blocked_payment
    ADD CONSTRAINT blocked_payment_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.blocked_payment
    ADD CONSTRAINT blocked_payment_functional_status_id_fkey FOREIGN KEY (functional_status_id) REFERENCES hr.functional_status(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.blocked_payment
    ADD CONSTRAINT blocked_payment_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.blocked_payment
    ADD CONSTRAINT blocked_payment_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES hr.reason(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.employee_payroll_item
    ADD CONSTRAINT employee_payroll_item_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.employee_payroll_item
    ADD CONSTRAINT employee_payroll_item_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.employee_payroll_item
    ADD CONSTRAINT employee_payroll_item_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.employment_link_earning
    ADD CONSTRAINT employment_link_earning_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.employment_link_earning
    ADD CONSTRAINT employment_link_earning_employment_link_id_fkey FOREIGN KEY (employment_link_id) REFERENCES hr.employment_link(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.formula_attribute
    ADD CONSTRAINT formula_attribute_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.job_function_earning
    ADD CONSTRAINT job_function_earning_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.job_function_earning
    ADD CONSTRAINT job_function_earning_job_function_id_fkey FOREIGN KEY (job_function_id) REFERENCES hr.job_function(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.job_position_earning
    ADD CONSTRAINT job_position_earning_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.job_position_earning
    ADD CONSTRAINT job_position_earning_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES hr.job_position(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.payment_remittance_detail
    ADD CONSTRAINT payment_remittance_detail_alimony_id_fkey FOREIGN KEY (alimony_id) REFERENCES hr.employee_alimony(id) ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payment_remittance_detail
    ADD CONSTRAINT payment_remittance_detail_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payment_remittance_detail
    ADD CONSTRAINT payment_remittance_detail_file_id_fkey FOREIGN KEY (file_id) REFERENCES payroll.payment_remittance_file(id) ON DELETE CASCADE;

ALTER TABLE ONLY payroll.payment_remittance_detail
    ADD CONSTRAINT payment_remittance_detail_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payment_remittance_file
    ADD CONSTRAINT payment_remittance_file_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payment_remittance_file
    ADD CONSTRAINT payment_remittance_file_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payment_remittance_file
    ADD CONSTRAINT payment_remittance_file_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payment_remittance_file
    ADD CONSTRAINT payment_remittance_file_processing_type_id_fkey FOREIGN KEY (processing_type_id) REFERENCES payroll.processing_type(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payment_remittance_file
    ADD CONSTRAINT payment_remittance_file_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES hr.reason(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payment_return_detail
    ADD CONSTRAINT payment_return_detail_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payment_return_detail
    ADD CONSTRAINT payment_return_detail_remittance_detail_id_fkey FOREIGN KEY (remittance_detail_id) REFERENCES payroll.payment_remittance_detail(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payment_return_detail
    ADD CONSTRAINT payment_return_detail_return_file_id_fkey FOREIGN KEY (return_file_id) REFERENCES payroll.payment_return_file(return_file_id) ON DELETE CASCADE;

ALTER TABLE ONLY payroll.payment_return_detail
    ADD CONSTRAINT payment_return_detail_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payment_return_file
    ADD CONSTRAINT payment_return_file_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.user_account(id) ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payment_return_file
    ADD CONSTRAINT payment_return_file_remittance_file_id_fkey FOREIGN KEY (remittance_file_id) REFERENCES payroll.payment_remittance_file(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payment_return_file
    ADD CONSTRAINT payment_return_file_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.accounting_account
    ADD CONSTRAINT payroll_accounting_account_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.accounting_account_work_location
    ADD CONSTRAINT payroll_accounting_account_work_location_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.accounting_history
    ADD CONSTRAINT payroll_accounting_history_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.advance_payment
    ADD CONSTRAINT payroll_advance_payment_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.advance_request
    ADD CONSTRAINT payroll_advance_request_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.blocked_payment
    ADD CONSTRAINT payroll_blocked_payment_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.employee_payroll_item
    ADD CONSTRAINT payroll_employee_payroll_item_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.employment_link_earning
    ADD CONSTRAINT payroll_employment_link_earning_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_financial_record
    ADD CONSTRAINT payroll_financial_record_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payroll_financial_record
    ADD CONSTRAINT payroll_financial_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payroll_financial_record
    ADD CONSTRAINT payroll_financial_record_functional_status_id_fkey FOREIGN KEY (functional_status_id) REFERENCES hr.functional_status(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payroll_financial_record
    ADD CONSTRAINT payroll_financial_record_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payroll_financial_record
    ADD CONSTRAINT payroll_financial_record_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.formula_attribute
    ADD CONSTRAINT payroll_formula_attribute_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.gps_payment_code
    ADD CONSTRAINT payroll_gps_payment_code_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.job_function_earning
    ADD CONSTRAINT payroll_job_function_earning_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.job_position_earning
    ADD CONSTRAINT payroll_job_position_earning_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payment_remittance_file
    ADD CONSTRAINT payroll_payment_remittance_file_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_earning_deduction
    ADD CONSTRAINT payroll_payroll_earning_deduction_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_financial_record
    ADD CONSTRAINT payroll_payroll_financial_record_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_run_status_history
    ADD CONSTRAINT payroll_payroll_run_status_history_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_run
    ADD CONSTRAINT payroll_payroll_run_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_run_work_location
    ADD CONSTRAINT payroll_payroll_run_work_location_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_type_earning
    ADD CONSTRAINT payroll_payroll_type_earning_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_type
    ADD CONSTRAINT payroll_payroll_type_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.processing_type
    ADD CONSTRAINT payroll_processing_type_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.professional_category_earning
    ADD CONSTRAINT payroll_professional_category_earning_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_run
    ADD CONSTRAINT payroll_run_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES hr.branch(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payroll_run
    ADD CONSTRAINT payroll_run_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payroll_run
    ADD CONSTRAINT payroll_run_payroll_type_id_fkey FOREIGN KEY (payroll_type_id) REFERENCES payroll.payroll_type(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payroll_run
    ADD CONSTRAINT payroll_run_processing_type_id_fkey FOREIGN KEY (processing_type_id) REFERENCES payroll.processing_type(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payroll_run_status_history
    ADD CONSTRAINT payroll_run_status_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.user_account(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.payroll_run_status_history
    ADD CONSTRAINT payroll_run_status_history_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY payroll.payroll_run_work_location
    ADD CONSTRAINT payroll_run_work_location_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.payroll_run_work_location
    ADD CONSTRAINT payroll_run_work_location_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.sefip_code
    ADD CONSTRAINT payroll_sefip_code_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.simple_account
    ADD CONSTRAINT payroll_simple_account_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payroll.payroll_type_earning
    ADD CONSTRAINT payroll_type_earning_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.payroll_type_earning
    ADD CONSTRAINT payroll_type_earning_payroll_type_id_fkey FOREIGN KEY (payroll_type_id) REFERENCES payroll.payroll_type(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.processing_type
    ADD CONSTRAINT processing_type_employment_link_id_fkey FOREIGN KEY (employment_link_id) REFERENCES hr.employment_link(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.processing_type
    ADD CONSTRAINT processing_type_payroll_type_id_fkey FOREIGN KEY (payroll_type_id) REFERENCES payroll.payroll_type(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY payroll.professional_category_earning
    ADD CONSTRAINT professional_category_earning_category_entry_id_fkey FOREIGN KEY (category_entry_id) REFERENCES hr.reference_catalog_entry(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY payroll.professional_category_earning
    ADD CONSTRAINT professional_category_earning_earning_deduction_id_fkey FOREIGN KEY (earning_deduction_id) REFERENCES payroll.payroll_earning_deduction(id) ON UPDATE CASCADE ON DELETE CASCADE;

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

COMMENT ON COLUMN payroll.employee_payroll_item.amount IS 'Payroll earning/deduction amount in BRL; numeric(14,2); rounded half-away-from-zero at rubrica boundary.';

COMMENT ON COLUMN payroll.payroll_run.total_earnings IS 'Aggregate payroll earnings in BRL; numeric(16,2).';

COMMENT ON COLUMN payroll.payroll_run.total_deductions IS 'Aggregate payroll deductions in BRL; numeric(16,2).';

COMMENT ON COLUMN payroll.payroll_run.total_net IS 'Aggregate net payroll amount in BRL; numeric(16,2).';

COMMENT ON COLUMN payroll.payroll_earning_deduction.incidences IS 'Payroll incidence flags for IRRF, INSS, FGTS, RPPS, and employer contribution.';

COMMENT ON COLUMN payroll.payroll_earning_deduction.esocial_code IS 'eSocial S-1010 rubric code when applicable.';

COMMENT ON COLUMN payroll.payroll_earning_deduction.official_rubric_code IS 'Official rubric code required by the local legal/payroll catalog when applicable.';

COMMENT ON COLUMN payroll.payroll_earning_deduction.subject_to_ceiling IS 'Whether this earning/deduction participates in the constitutional remuneration ceiling base.';
