CREATE INDEX absence_justification_employee_idx ON ponto.absence_justification USING btree (tenant_id, employee_id, absence_start DESC);

CREATE INDEX absence_justification_status_idx ON ponto.absence_justification USING btree (tenant_id, status, absence_start DESC);

CREATE INDEX afd_export_device_period_idx ON ponto.afd_export USING btree (tenant_id, rep_device_id, period_start, period_end);

CREATE INDEX afd_import_device_imported_idx ON ponto.afd_import USING btree (tenant_id, rep_device_id, imported_at DESC);

CREATE INDEX afd_import_line_device_period_idx ON ponto.afd_import_line USING btree (tenant_id, rep_device_id, recorded_at, nsr);

CREATE INDEX biometric_consent_employee_idx ON ponto.biometric_consent USING btree (tenant_id, employee_id, consent_at DESC) WHERE (withdrawn_at IS NULL);

CREATE INDEX biometric_match_employee_idx ON ponto.biometric_match USING btree (tenant_id, employee_id, occurred_at DESC);

CREATE INDEX biometric_match_time_record_idx ON ponto.biometric_match USING btree (tenant_id, time_record_id);

CREATE INDEX day_schedule_shift_idx ON ponto.day_schedule USING btree (tenant_id, work_shift_id);

CREATE INDEX duty_roster_entry_employee_idx ON ponto.duty_roster_entry USING btree (tenant_id, employee_id, work_date);

CREATE INDEX duty_roster_period_idx ON ponto.duty_roster USING btree (tenant_id, period_start, period_end);

CREATE INDEX employee_biometric_template_employee_kind_idx ON ponto.employee_biometric_template USING btree (tenant_id, employee_id, kind, status, captured_at DESC);

CREATE INDEX employee_face_template_employee_idx ON ponto.employee_face_template USING btree (tenant_id, employee_id, status, captured_at DESC);

CREATE INDEX employee_schedule_assignment_employee_idx ON ponto.employee_schedule_assignment USING btree (tenant_id, employee_id, valid_from DESC);

CREATE INDEX face_consent_employee_idx ON ponto.face_consent USING btree (tenant_id, employee_id, consent_at DESC) WHERE (withdrawn_at IS NULL);

CREATE INDEX face_match_employee_idx ON ponto.face_match USING btree (tenant_id, employee_id, occurred_at DESC);

CREATE INDEX face_match_time_record_idx ON ponto.face_match USING btree (tenant_id, time_record_id);

CREATE INDEX hour_bank_employee_idx ON ponto.hour_bank USING btree (tenant_id, employee_id, status, expires_at);

CREATE INDEX hour_bank_movement_bank_idx ON ponto.hour_bank_movement USING btree (tenant_id, hour_bank_id, work_date);

CREATE UNIQUE INDEX hour_bank_settlement_payroll_uq ON ponto.hour_bank_movement USING btree (hour_bank_id, payroll_run_id, kind) WHERE ((payroll_run_id IS NOT NULL) AND (kind = ANY (ARRAY['SETTLEMENT_OVERTIME'::ponto.hour_bank_movement_kind, 'SETTLEMENT_DEDUCTION'::ponto.hour_bank_movement_kind])));

CREATE INDEX mobile_clock_in_attempt_employee_idx ON ponto.mobile_clock_in_attempt USING btree (tenant_id, employee_id, occurred_at DESC);

CREATE INDEX mobile_clock_in_attempt_result_idx ON ponto.mobile_clock_in_attempt USING btree (tenant_id, result, occurred_at DESC);

CREATE INDEX mobile_device_registration_employee_idx ON ponto.mobile_device_registration USING btree (tenant_id, employee_id, revoked_at);

CREATE INDEX mobile_geolocation_consent_employee_idx ON ponto.mobile_geolocation_consent USING btree (tenant_id, employee_id, consent_at DESC) WHERE (withdrawn_at IS NULL);

CREATE INDEX payroll_bridge_event_run_idx ON ponto.payroll_bridge_event USING btree (tenant_id, payroll_run_id, employee_id);

CREATE UNIQUE INDEX rep_device_rep_c_serial_uq ON ponto.rep_device USING btree (tenant_id, serial_number) WHERE ((kind = 'REP_C'::ponto.rep_device_kind) AND (serial_number IS NOT NULL));

CREATE INDEX rep_device_tenant_kind_idx ON ponto.rep_device USING btree (tenant_id, kind, status);

CREATE INDEX rep_ingestion_batch_device_idx ON ponto.rep_ingestion_batch USING btree (tenant_id, rep_device_id, received_at DESC);

CREATE INDEX rep_ingestion_line_batch_idx ON ponto.rep_ingestion_line USING btree (tenant_id, batch_id, line_no);

CREATE INDEX shift_assignment_employee_idx ON ponto.shift_assignment USING btree (tenant_id, employee_id, valid_from DESC);

CREATE INDEX shift_pattern_day_pattern_idx ON ponto.shift_pattern_day USING btree (tenant_id, shift_pattern_id, day_index);

CREATE INDEX time_record_employee_recorded_idx ON ponto.time_record USING btree (tenant_id, employee_id, recorded_at DESC);

CREATE INDEX time_record_justification_link_record_idx ON ponto.time_record_justification_link USING btree (tenant_id, time_record_id);

CREATE INDEX timesheet_period_employee_idx ON ponto.timesheet_period USING btree (tenant_id, employee_id, period_start DESC);

CREATE INDEX work_shift_schedule_idx ON ponto.work_shift USING btree (tenant_id, work_schedule_id);
