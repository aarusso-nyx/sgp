ALTER TABLE ONLY fiscal.dctfweb_declaration
    ADD CONSTRAINT dctfweb_declaration_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.dctfweb_item
    ADD CONSTRAINT dctfweb_item_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.dctfweb_item
    ADD CONSTRAINT dctfweb_item_source_uq UNIQUE (tenant_id, declaracao_id, source_event, source_run_id, debit_code);

ALTER TABLE ONLY fiscal.dirf_arquivo
    ADD CONSTRAINT dirf_arquivo_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.dirf_beneficiario
    ADD CONSTRAINT dirf_beneficiario_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.dirf_pagamento
    ADD CONSTRAINT dirf_pagamento_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.gps_payment_code
    ADD CONSTRAINT gps_payment_code_code_uq UNIQUE (code);

ALTER TABLE ONLY fiscal.gps_payment_code
    ADD CONSTRAINT gps_payment_code_pkey PRIMARY KEY (id);

ALTER TABLE ONLY fiscal.gps_remittance
    ADD CONSTRAINT gps_remittance_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.yearly_income_aggregate
    ADD CONSTRAINT yearly_income_aggregate_pkey PRIMARY KEY (tenant_id, employee_id, year_base);
