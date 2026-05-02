ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_pkey PRIMARY KEY (absence_justification_id);

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_tenant_uq UNIQUE (tenant_id, absence_justification_id);

ALTER TABLE ONLY ponto.afd_export
    ADD CONSTRAINT afd_export_object_store_key_uq UNIQUE (tenant_id, object_store_key);

ALTER TABLE ONLY ponto.afd_export
    ADD CONSTRAINT afd_export_pkey PRIMARY KEY (afd_export_id);

ALTER TABLE ONLY ponto.afd_import_line
    ADD CONSTRAINT afd_import_line_pkey PRIMARY KEY (afd_import_id, line_no);

ALTER TABLE ONLY ponto.afd_import
    ADD CONSTRAINT afd_import_object_store_key_uq UNIQUE (tenant_id, object_store_key);

ALTER TABLE ONLY ponto.afd_import
    ADD CONSTRAINT afd_import_pkey PRIMARY KEY (afd_import_id);

ALTER TABLE ONLY ponto.biometric_consent
    ADD CONSTRAINT biometric_consent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.biometric_match
    ADD CONSTRAINT biometric_match_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.day_schedule
    ADD CONSTRAINT day_schedule_pkey PRIMARY KEY (day_schedule_id);

ALTER TABLE ONLY ponto.day_schedule
    ADD CONSTRAINT day_schedule_shift_weekday_uq UNIQUE (tenant_id, work_shift_id, weekday);

ALTER TABLE ONLY ponto.duty_roster_entry
    ADD CONSTRAINT duty_roster_entry_pkey PRIMARY KEY (duty_roster_id, employee_id, work_date);

ALTER TABLE ONLY ponto.duty_roster
    ADD CONSTRAINT duty_roster_pkey PRIMARY KEY (duty_roster_id);

ALTER TABLE ONLY ponto.employee_biometric_template
    ADD CONSTRAINT employee_biometric_template_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.employee_face_template
    ADD CONSTRAINT employee_face_template_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.employee_schedule_assignment
    ADD CONSTRAINT employee_schedule_assignment_pkey PRIMARY KEY (assignment_id);

ALTER TABLE ONLY ponto.face_consent
    ADD CONSTRAINT face_consent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.face_match
    ADD CONSTRAINT face_match_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.face_threshold_config
    ADD CONSTRAINT face_threshold_config_pkey PRIMARY KEY (tenant_id);

ALTER TABLE ONLY ponto.hour_bank_movement
    ADD CONSTRAINT hour_bank_movement_pkey PRIMARY KEY (hour_bank_movement_id);

ALTER TABLE ONLY ponto.hour_bank
    ADD CONSTRAINT hour_bank_pkey PRIMARY KEY (hour_bank_id);

ALTER TABLE ONLY ponto.hour_bank
    ADD CONSTRAINT hour_bank_tenant_bank_uq UNIQUE (tenant_id, hour_bank_id);

ALTER TABLE ONLY ponto.mobile_clock_in_attempt
    ADD CONSTRAINT mobile_clock_in_attempt_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.mobile_device_registration
    ADD CONSTRAINT mobile_device_registration_employee_device_uq UNIQUE (tenant_id, employee_id, device_id);

ALTER TABLE ONLY ponto.mobile_device_registration
    ADD CONSTRAINT mobile_device_registration_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.mobile_geolocation_consent
    ADD CONSTRAINT mobile_geolocation_consent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_idempotency_uq UNIQUE (tenant_id, payroll_run_id, employee_id, timesheet_period_id);

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_pkey PRIMARY KEY (payroll_bridge_event_id);

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_tenant_uq UNIQUE (tenant_id, payroll_bridge_event_id);

ALTER TABLE ONLY ponto.rep_device
    ADD CONSTRAINT rep_device_pkey PRIMARY KEY (rep_device_id);

ALTER TABLE ONLY ponto.rep_ingestion_batch
    ADD CONSTRAINT rep_ingestion_batch_pkey PRIMARY KEY (batch_id);

ALTER TABLE ONLY ponto.rep_ingestion_line
    ADD CONSTRAINT rep_ingestion_line_device_nsr_uq UNIQUE (tenant_id, rep_device_id, nsr);

ALTER TABLE ONLY ponto.rep_ingestion_line
    ADD CONSTRAINT rep_ingestion_line_pkey PRIMARY KEY (batch_id, line_no);

ALTER TABLE ONLY ponto.shift_assignment
    ADD CONSTRAINT shift_assignment_pkey PRIMARY KEY (shift_assignment_id);

ALTER TABLE ONLY ponto.shift_pattern_day
    ADD CONSTRAINT shift_pattern_day_pkey PRIMARY KEY (shift_pattern_id, day_index);

ALTER TABLE ONLY ponto.shift_pattern
    ADD CONSTRAINT shift_pattern_pkey PRIMARY KEY (shift_pattern_id);

ALTER TABLE ONLY ponto.shift_pattern
    ADD CONSTRAINT shift_pattern_tenant_code_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_pkey PRIMARY KEY (tenant_id, time_record_id, absence_justification_id);

ALTER TABLE ONLY ponto.time_record
    ADD CONSTRAINT time_record_pkey PRIMARY KEY (time_record_id);

ALTER TABLE ONLY ponto.time_record
    ADD CONSTRAINT time_record_tenant_employee_nsr_uq UNIQUE (tenant_id, employee_id, nsr);

ALTER TABLE ONLY ponto.timesheet_period
    ADD CONSTRAINT timesheet_period_employee_range_uq UNIQUE (tenant_id, employee_id, period_start, period_end);

ALTER TABLE ONLY ponto.timesheet_period
    ADD CONSTRAINT timesheet_period_pkey PRIMARY KEY (timesheet_period_id);

ALTER TABLE ONLY ponto.work_schedule
    ADD CONSTRAINT work_schedule_pkey PRIMARY KEY (work_schedule_id);

ALTER TABLE ONLY ponto.work_schedule
    ADD CONSTRAINT work_schedule_tenant_code_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY ponto.work_shift
    ADD CONSTRAINT work_shift_pkey PRIMARY KEY (work_shift_id);

ALTER TABLE ONLY ponto.work_shift
    ADD CONSTRAINT work_shift_tenant_code_uq UNIQUE (tenant_id, code);
