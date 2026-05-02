ALTER TABLE ONLY payment.consignment_entity
    ADD CONSTRAINT consignment_entity_code_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY payment.consignment_entity
    ADD CONSTRAINT consignment_entity_pkey PRIMARY KEY (tenant_id, consignment_entity_id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_contract_uq UNIQUE (tenant_id, employee_id, contract_number);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_pkey PRIMARY KEY (tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_portability_detail
    ADD CONSTRAINT consignment_portability_detail_pkey PRIMARY KEY (tenant_id, file_id, sequence);

ALTER TABLE ONLY payment.consignment_portability_file
    ADD CONSTRAINT consignment_portability_file_pkey PRIMARY KEY (tenant_id, file_id);

ALTER TABLE ONLY payment.dirf_payment_source
    ADD CONSTRAINT dirf_payment_source_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_employee_link_uq UNIQUE (tenant_id, employee_id, employment_link_id);

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_pkey PRIMARY KEY (tenant_id, fgts_account_id);

ALTER TABLE ONLY payment.fgts_caixa_adapter
    ADD CONSTRAINT fgts_caixa_adapter_key_uq UNIQUE (tenant_id, adapter_key);

ALTER TABLE ONLY payment.fgts_caixa_adapter
    ADD CONSTRAINT fgts_caixa_adapter_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_remittance_uq UNIQUE (tenant_id, fgts_remittance_id, payroll_run_id);

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_remittance_uq UNIQUE (tenant_id, fgts_remittance_id, employment_link_id);

ALTER TABLE ONLY payment.fgts_movement
    ADD CONSTRAINT fgts_movement_pkey PRIMARY KEY (tenant_id, fgts_movement_id);

ALTER TABLE ONLY payment.fgts_remittance
    ADD CONSTRAINT fgts_remittance_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment.pis_pasep_base_year
    ADD CONSTRAINT pis_pasep_base_year_pkey PRIMARY KEY (tenant_id, employee_id, year_base);

ALTER TABLE ONLY payment.prior_notice
    ADD CONSTRAINT prior_notice_pkey PRIMARY KEY (tenant_id, employment_link_id);
