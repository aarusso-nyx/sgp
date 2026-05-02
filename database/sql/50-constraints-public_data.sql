ALTER TABLE ONLY public_data.transparency_access_log
    ADD CONSTRAINT transparency_access_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public_data.transparency_payroll_snapshot
    ADD CONSTRAINT transparency_payroll_snapshot_pkey PRIMARY KEY (tenant_id, competence, employee_public_id);

ALTER TABLE ONLY public_data.transparency_publish_event
    ADD CONSTRAINT transparency_publish_event_pkey PRIMARY KEY (id);
