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
