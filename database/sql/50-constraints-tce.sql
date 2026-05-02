ALTER TABLE ONLY tce.adapter_circuit_state
    ADD CONSTRAINT adapter_circuit_state_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tce.adapter_circuit_state
    ADD CONSTRAINT adapter_circuit_state_unique UNIQUE (adapter_id, endpoint_url);

ALTER TABLE ONLY tce.adapter_lifecycle_event
    ADD CONSTRAINT adapter_lifecycle_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tce.adapter_registry
    ADD CONSTRAINT adapter_registry_adapter_id_key UNIQUE (adapter_id);

ALTER TABLE ONLY tce.adapter_registry
    ADD CONSTRAINT adapter_registry_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tce.layout_field
    ADD CONSTRAINT layout_field_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tce.layout_field
    ADD CONSTRAINT layout_field_unique UNIQUE (layout_version_id, field_path);

ALTER TABLE ONLY tce.layout_version
    ADD CONSTRAINT layout_version_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tce.layout_version
    ADD CONSTRAINT layout_version_unique UNIQUE (state_id, system_name, version);

ALTER TABLE ONLY tce.state
    ADD CONSTRAINT state_code_key UNIQUE (code);

ALTER TABLE ONLY tce.state
    ADD CONSTRAINT state_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tce.submission_attempt
    ADD CONSTRAINT submission_attempt_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tce.submission
    ADD CONSTRAINT submission_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tce.submission_queue
    ADD CONSTRAINT submission_queue_pkey PRIMARY KEY (id);
