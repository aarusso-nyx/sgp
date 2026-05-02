ALTER TABLE ONLY payroll.accounting_account
    ADD CONSTRAINT accounting_account_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.accounting_account_work_location
    ADD CONSTRAINT accounting_account_work_location_pkey PRIMARY KEY (accounting_account_id, work_location_id);

ALTER TABLE ONLY payroll.accounting_history
    ADD CONSTRAINT accounting_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.advance_payment
    ADD CONSTRAINT advance_payment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.advance_request
    ADD CONSTRAINT advance_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.blocked_payment
    ADD CONSTRAINT blocked_payment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.employee_payroll_item
    ADD CONSTRAINT employee_payroll_item_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.employment_link_earning
    ADD CONSTRAINT employment_link_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.formula_attribute
    ADD CONSTRAINT formula_attribute_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.gps_payment_code
    ADD CONSTRAINT gps_payment_code_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.job_function_earning
    ADD CONSTRAINT job_function_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.job_position_earning
    ADD CONSTRAINT job_position_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payment_remittance_detail
    ADD CONSTRAINT payment_remittance_detail_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payment_remittance_file
    ADD CONSTRAINT payment_remittance_file_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payment_return_detail
    ADD CONSTRAINT payment_return_detail_pkey PRIMARY KEY (return_detail_id);

ALTER TABLE ONLY payroll.payment_return_file
    ADD CONSTRAINT payment_return_file_pkey PRIMARY KEY (return_file_id);

ALTER TABLE ONLY payroll.payroll_earning_deduction
    ADD CONSTRAINT payroll_earning_deduction_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_financial_record
    ADD CONSTRAINT payroll_financial_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_run
    ADD CONSTRAINT payroll_run_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_run_status_history
    ADD CONSTRAINT payroll_run_status_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_run_work_location
    ADD CONSTRAINT payroll_run_work_location_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_type_earning
    ADD CONSTRAINT payroll_type_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_type
    ADD CONSTRAINT payroll_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.processing_type
    ADD CONSTRAINT processing_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.professional_category_earning
    ADD CONSTRAINT professional_category_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.sefip_code
    ADD CONSTRAINT sefip_code_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.simple_account
    ADD CONSTRAINT simple_account_pkey PRIMARY KEY (id);
