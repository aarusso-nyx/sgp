ALTER TABLE ONLY esocial.endpoint_circuit_state
    ADD CONSTRAINT endpoint_circuit_state_pkey PRIMARY KEY (endpoint_url);

ALTER TABLE ONLY esocial.esocial_totalizer
    ADD CONSTRAINT esocial_totalizer_pkey PRIMARY KEY (tenant_id, competence, kind, source_event_recibo);

ALTER TABLE ONLY esocial.event_retry_schedule
    ADD CONSTRAINT event_retry_schedule_pkey PRIMARY KEY (tenant_id, event_id);

ALTER TABLE ONLY esocial.response_classification
    ADD CONSTRAINT response_classification_pkey PRIMARY KEY (response_code);

ALTER TABLE ONLY esocial.s1200_emission_state
    ADD CONSTRAINT s1200_emission_state_pkey PRIMARY KEY (tenant_id, payroll_run_id, employee_id);

ALTER TABLE ONLY esocial.s1210_emission_state
    ADD CONSTRAINT s1210_emission_state_pkey PRIMARY KEY (tenant_id, payment_batch_id, employee_id);

ALTER TABLE ONLY esocial.s1299_emission_state
    ADD CONSTRAINT s1299_emission_state_pkey PRIMARY KEY (tenant_id, competence);

ALTER TABLE ONLY esocial.s1xxx_dispatch_state
    ADD CONSTRAINT s1xxx_dispatch_state_pkey PRIMARY KEY (tenant_id, event_kind, source_entity_id);

ALTER TABLE ONLY esocial.s2200_emission_state
    ADD CONSTRAINT s2200_emission_state_pkey PRIMARY KEY (tenant_id, employee_id);

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s2205_trigger_field
    ADD CONSTRAINT s2205_trigger_field_pkey PRIMARY KEY (field_path);

ALTER TABLE ONLY esocial.s2210_pending
    ADD CONSTRAINT s2210_pending_pkey PRIMARY KEY (tenant_id, cat_emission_id);

ALTER TABLE ONLY esocial.s2220_pending
    ADD CONSTRAINT s2220_pending_pkey PRIMARY KEY (tenant_id, aso_record_id);

ALTER TABLE ONLY esocial.s2230_pending
    ADD CONSTRAINT s2230_pending_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s2230_pending
    ADD CONSTRAINT s2230_pending_tenant_id_leave_or_vacation_id_kind_trigger_e_key UNIQUE (tenant_id, leave_or_vacation_id, kind, trigger_event, status);

ALTER TABLE ONLY esocial.s2240_pending
    ADD CONSTRAINT s2240_pending_pkey PRIMARY KEY (tenant_id, environmental_exposure_id, trigger_event);

ALTER TABLE ONLY esocial.s2298_event
    ADD CONSTRAINT s2298_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s2299_pending
    ADD CONSTRAINT s2299_pending_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s2299_pending
    ADD CONSTRAINT s2299_pending_tenant_id_employment_link_id_calc_run_id_stat_key UNIQUE (tenant_id, employment_link_id, calc_run_id, status);

ALTER TABLE ONLY esocial.s2306_event
    ADD CONSTRAINT s2306_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s3000_request
    ADD CONSTRAINT s3000_request_pkey PRIMARY KEY (tenant_id, request_id);

ALTER TABLE ONLY esocial.submission_batch
    ADD CONSTRAINT submission_batch_pkey PRIMARY KEY (tenant_id, batch_id);

ALTER TABLE ONLY esocial.tenant_certificate
    ADD CONSTRAINT tenant_certificate_pkey PRIMARY KEY (tenant_id, certificate_id);

ALTER TABLE ONLY esocial.xsd_validation_failure
    ADD CONSTRAINT xsd_validation_failure_pkey PRIMARY KEY (tenant_id, attempt_id);
