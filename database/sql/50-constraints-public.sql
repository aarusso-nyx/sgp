ALTER TABLE ONLY public.access_profile
    ADD CONSTRAINT access_profile_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_event
    ADD CONSTRAINT audit_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_attachment
    ADD CONSTRAINT document_attachment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_download_audit
    ADD CONSTRAINT document_download_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_type
    ADD CONSTRAINT document_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_upload_session
    ADD CONSTRAINT document_upload_session_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.esocial_event
    ADD CONSTRAINT esocial_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.generated_report_file
    ADD CONSTRAINT generated_report_file_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT menu_item_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payslip_batch
    ADD CONSTRAINT payslip_batch_pkey PRIMARY KEY (batch_id);

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT permission_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profile_assignment
    ADD CONSTRAINT profile_assignment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profile_permission
    ADD CONSTRAINT profile_permission_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.report_definition
    ADD CONSTRAINT report_definition_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.report_request
    ADD CONSTRAINT report_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.system_parameter
    ADD CONSTRAINT system_parameter_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT tax_rate_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_group_snapshot
    ADD CONSTRAINT user_group_snapshot_pkey PRIMARY KEY (id);
