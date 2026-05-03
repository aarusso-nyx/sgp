CREATE VIEW ponto.v_timesheet_payroll_input AS
 SELECT aggregate.tenant_id,
    aggregate.employee_id,
    aggregate.period_start,
    aggregate.period_end,
    aggregate.worked_minutes,
    aggregate.expected_minutes,
    aggregate.overtime_50_minutes,
    aggregate.overtime_100_minutes,
    aggregate.night_minutes,
    aggregate.late_minutes,
    aggregate.absence_unpaid_minutes,
    aggregate.absence_paid_minutes,
    aggregate.hour_bank_settlement_minutes
   FROM (ponto.timesheet_period period
     CROSS JOIN LATERAL ponto.fn_aggregate_timesheet(period.tenant_id, period.employee_id, period.period_start, period.period_end) aggregate(tenant_id, employee_id, period_start, period_end, worked_minutes, expected_minutes, overtime_50_minutes, overtime_100_minutes, night_minutes, late_minutes, absence_unpaid_minutes, absence_paid_minutes, hour_bank_settlement_minutes));

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

CREATE INDEX time_record_identity_tenant_recorded_idx ON ponto.time_record_identity USING btree (tenant_id, recorded_at DESC);

CREATE INDEX time_record_justification_link_record_idx ON ponto.time_record_justification_link USING btree (tenant_id, time_record_id);

CREATE INDEX timesheet_period_employee_idx ON ponto.timesheet_period USING btree (tenant_id, employee_id, period_start DESC);

CREATE INDEX work_shift_schedule_idx ON ponto.work_shift USING btree (tenant_id, work_schedule_id);

CREATE TRIGGER absence_justification_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.absence_justification FOR EACH ROW EXECUTE FUNCTION ponto.ponto06_audit_row();

CREATE TRIGGER absence_justification_touch_updated_at BEFORE UPDATE ON ponto.absence_justification FOR EACH ROW EXECUTE FUNCTION ponto.ponto06_touch_updated_at();

CREATE TRIGGER afd_export_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.afd_export FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_audit_row();

CREATE TRIGGER afd_export_touch_updated_at BEFORE UPDATE ON ponto.afd_export FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_touch_updated_at();

CREATE TRIGGER afd_import_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.afd_import FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_audit_row();

CREATE TRIGGER afd_import_line_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.afd_import_line FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_audit_row();

CREATE TRIGGER afd_import_line_touch_updated_at BEFORE UPDATE ON ponto.afd_import_line FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_touch_updated_at();

CREATE TRIGGER afd_import_touch_updated_at BEFORE UPDATE ON ponto.afd_import FOR EACH ROW EXECUTE FUNCTION ponto.ponto03_touch_updated_at();

CREATE TRIGGER biometric_consent_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.biometric_consent FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_audit_row();

CREATE TRIGGER biometric_consent_touch_updated_at BEFORE UPDATE ON ponto.biometric_consent FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_touch_updated_at();

CREATE TRIGGER biometric_match_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.biometric_match FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_audit_row();

CREATE TRIGGER day_schedule_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.day_schedule FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER day_schedule_touch_updated_at BEFORE UPDATE ON ponto.day_schedule FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();

CREATE TRIGGER duty_roster_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.duty_roster FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();

CREATE TRIGGER duty_roster_entry_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.duty_roster_entry FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();

CREATE TRIGGER duty_roster_entry_touch_updated_at BEFORE UPDATE ON ponto.duty_roster_entry FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();

CREATE TRIGGER duty_roster_touch_updated_at BEFORE UPDATE ON ponto.duty_roster FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();

CREATE TRIGGER employee_biometric_template_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.employee_biometric_template FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_audit_row();

CREATE TRIGGER employee_biometric_template_touch_updated_at BEFORE UPDATE ON ponto.employee_biometric_template FOR EACH ROW EXECUTE FUNCTION ponto.ponto08_touch_updated_at();

CREATE TRIGGER employee_face_template_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.employee_face_template FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_audit_row();

CREATE TRIGGER employee_face_template_touch_updated_at BEFORE UPDATE ON ponto.employee_face_template FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_touch_updated_at();

CREATE TRIGGER employee_schedule_assignment_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.employee_schedule_assignment FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER employee_schedule_assignment_touch_updated_at BEFORE UPDATE ON ponto.employee_schedule_assignment FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();

CREATE TRIGGER face_consent_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.face_consent FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_audit_row();

CREATE TRIGGER face_consent_touch_updated_at BEFORE UPDATE ON ponto.face_consent FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_touch_updated_at();

CREATE TRIGGER face_match_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.face_match FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_audit_row();

CREATE TRIGGER face_threshold_config_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.face_threshold_config FOR EACH ROW EXECUTE FUNCTION ponto.ponto10_face_audit_row();

CREATE TRIGGER hour_bank_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.hour_bank FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_audit_row();

CREATE TRIGGER hour_bank_movement_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.hour_bank_movement FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_audit_row();

CREATE TRIGGER hour_bank_movement_expired_guard BEFORE INSERT ON ponto.hour_bank_movement FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_reject_expired_accrual();

CREATE TRIGGER hour_bank_movement_recalculate AFTER INSERT OR DELETE OR UPDATE ON ponto.hour_bank_movement FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_recalculate_hour_bank();

CREATE TRIGGER hour_bank_touch_updated_at BEFORE UPDATE ON ponto.hour_bank FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_touch_updated_at();

CREATE TRIGGER mobile_clock_in_attempt_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.mobile_clock_in_attempt FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_audit_row();

CREATE TRIGGER mobile_device_registration_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.mobile_device_registration FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_audit_row();

CREATE TRIGGER mobile_device_registration_touch_updated_at BEFORE UPDATE ON ponto.mobile_device_registration FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_touch_updated_at();

CREATE TRIGGER mobile_geolocation_consent_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.mobile_geolocation_consent FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_audit_row();

CREATE TRIGGER mobile_geolocation_consent_touch_updated_at BEFORE UPDATE ON ponto.mobile_geolocation_consent FOR EACH ROW EXECUTE FUNCTION ponto.ponto09_touch_updated_at();

CREATE TRIGGER payroll_bridge_event_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.payroll_bridge_event FOR EACH ROW EXECUTE FUNCTION ponto.ponto07_audit_payroll_bridge_event();

CREATE TRIGGER rep_device_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.rep_device FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_audit_row();

CREATE TRIGGER rep_device_touch_updated_at BEFORE UPDATE ON ponto.rep_device FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_touch_updated_at();

CREATE TRIGGER rep_ingestion_batch_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.rep_ingestion_batch FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_audit_row();

CREATE TRIGGER rep_ingestion_batch_touch_updated_at BEFORE UPDATE ON ponto.rep_ingestion_batch FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_touch_updated_at();

CREATE TRIGGER rep_ingestion_line_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.rep_ingestion_line FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_audit_row();

CREATE TRIGGER rep_ingestion_line_touch_updated_at BEFORE UPDATE ON ponto.rep_ingestion_line FOR EACH ROW EXECUTE FUNCTION ponto.ponto02_touch_updated_at();

CREATE TRIGGER shift_assignment_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.shift_assignment FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();

CREATE TRIGGER shift_assignment_locked_guard BEFORE DELETE OR UPDATE ON ponto.shift_assignment FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_reject_locked_assignment_change();

CREATE TRIGGER shift_assignment_touch_updated_at BEFORE UPDATE ON ponto.shift_assignment FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();

CREATE TRIGGER shift_pattern_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.shift_pattern FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();

CREATE TRIGGER shift_pattern_day_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.shift_pattern_day FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();

CREATE TRIGGER shift_pattern_day_touch_updated_at BEFORE UPDATE ON ponto.shift_pattern_day FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();

CREATE TRIGGER shift_pattern_touch_updated_at BEFORE UPDATE ON ponto.shift_pattern FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();

CREATE TRIGGER time_record_append_only BEFORE DELETE OR UPDATE ON ponto.time_record FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_time_record_append_only();

CREATE TRIGGER time_record_audit AFTER INSERT ON ponto.time_record FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER time_record_default_partition_auto_create BEFORE INSERT ON ponto.time_record_default FOR EACH ROW EXECUTE FUNCTION ponto.sgp_time_record_default_partition_redirect();

CREATE TRIGGER time_record_identity_append_only BEFORE DELETE OR UPDATE ON ponto.time_record_identity FOR EACH ROW EXECUTE FUNCTION ponto.sgp_time_record_identity_append_only();

CREATE TRIGGER time_record_identity_register AFTER INSERT ON ponto.time_record FOR EACH ROW EXECUTE FUNCTION ponto.sgp_register_time_record_identity();

CREATE TRIGGER time_record_justification_link_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.time_record_justification_link FOR EACH ROW EXECUTE FUNCTION ponto.ponto06_audit_row();

CREATE TRIGGER timesheet_period_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.timesheet_period FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER timesheet_period_touch_updated_at BEFORE UPDATE ON ponto.timesheet_period FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();

CREATE TRIGGER work_schedule_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.work_schedule FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER work_schedule_touch_updated_at BEFORE UPDATE ON ponto.work_schedule FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();

CREATE TRIGGER work_shift_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.work_shift FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER work_shift_touch_updated_at BEFORE UPDATE ON ponto.work_shift FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();

ALTER TABLE ponto.time_record_default ENABLE ROW LEVEL SECURITY;

ALTER TABLE ponto.time_record_default FORCE ROW LEVEL SECURITY;

SELECT ponto.sgp_create_time_record_partitions();

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.user_account(id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.document_attachment(id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_medical_leave_id_fkey FOREIGN KEY (medical_leave_id) REFERENCES hr.medical_leave(id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_requested_by_user_id_fkey FOREIGN KEY (requested_by_user_id) REFERENCES public.user_account(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.afd_export
    ADD CONSTRAINT afd_export_rep_device_id_fkey FOREIGN KEY (rep_device_id) REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.afd_export
    ADD CONSTRAINT afd_export_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.afd_import_line
    ADD CONSTRAINT afd_import_line_afd_import_id_fkey FOREIGN KEY (afd_import_id) REFERENCES ponto.afd_import(afd_import_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.afd_import_line
    ADD CONSTRAINT afd_import_line_rep_device_id_fkey FOREIGN KEY (rep_device_id) REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.afd_import_line
    ADD CONSTRAINT afd_import_line_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.afd_import_line
    ADD CONSTRAINT afd_import_line_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record_identity(time_record_id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.afd_import
    ADD CONSTRAINT afd_import_rep_device_id_fkey FOREIGN KEY (rep_device_id) REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.afd_import
    ADD CONSTRAINT afd_import_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.biometric_consent
    ADD CONSTRAINT biometric_consent_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.biometric_consent
    ADD CONSTRAINT biometric_consent_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.biometric_match
    ADD CONSTRAINT biometric_match_device_id_fkey FOREIGN KEY (device_id) REFERENCES ponto.rep_device(rep_device_id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.biometric_match
    ADD CONSTRAINT biometric_match_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.biometric_match
    ADD CONSTRAINT biometric_match_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.biometric_match
    ADD CONSTRAINT biometric_match_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record_identity(time_record_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.day_schedule
    ADD CONSTRAINT day_schedule_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.day_schedule
    ADD CONSTRAINT day_schedule_work_shift_id_fkey FOREIGN KEY (work_shift_id) REFERENCES ponto.work_shift(work_shift_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.duty_roster_entry
    ADD CONSTRAINT duty_roster_entry_duty_roster_id_fkey FOREIGN KEY (duty_roster_id) REFERENCES ponto.duty_roster(duty_roster_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.duty_roster_entry
    ADD CONSTRAINT duty_roster_entry_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.duty_roster_entry
    ADD CONSTRAINT duty_roster_entry_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.duty_roster
    ADD CONSTRAINT duty_roster_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.employee_biometric_template
    ADD CONSTRAINT employee_biometric_template_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.employee_biometric_template
    ADD CONSTRAINT employee_biometric_template_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.employee_face_template
    ADD CONSTRAINT employee_face_template_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.employee_face_template
    ADD CONSTRAINT employee_face_template_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.employee_schedule_assignment
    ADD CONSTRAINT employee_schedule_assignment_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.employee_schedule_assignment
    ADD CONSTRAINT employee_schedule_assignment_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.employee_schedule_assignment
    ADD CONSTRAINT employee_schedule_assignment_work_schedule_id_fkey FOREIGN KEY (work_schedule_id) REFERENCES ponto.work_schedule(work_schedule_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.face_consent
    ADD CONSTRAINT face_consent_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.face_consent
    ADD CONSTRAINT face_consent_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.face_match
    ADD CONSTRAINT face_match_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.face_match
    ADD CONSTRAINT face_match_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.face_match
    ADD CONSTRAINT face_match_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record_identity(time_record_id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.face_threshold_config
    ADD CONSTRAINT face_threshold_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.hour_bank
    ADD CONSTRAINT hour_bank_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.hour_bank_movement
    ADD CONSTRAINT hour_bank_movement_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.user_account(id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.hour_bank_movement
    ADD CONSTRAINT hour_bank_movement_hour_bank_id_fkey FOREIGN KEY (hour_bank_id) REFERENCES ponto.hour_bank(hour_bank_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.hour_bank_movement
    ADD CONSTRAINT hour_bank_movement_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.hour_bank_movement
    ADD CONSTRAINT hour_bank_movement_tenant_bank_fk FOREIGN KEY (tenant_id, hour_bank_id) REFERENCES ponto.hour_bank(tenant_id, hour_bank_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.hour_bank_movement
    ADD CONSTRAINT hour_bank_movement_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.hour_bank
    ADD CONSTRAINT hour_bank_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.mobile_clock_in_attempt
    ADD CONSTRAINT mobile_clock_in_attempt_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.mobile_clock_in_attempt
    ADD CONSTRAINT mobile_clock_in_attempt_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.mobile_clock_in_attempt
    ADD CONSTRAINT mobile_clock_in_attempt_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record_identity(time_record_id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.mobile_clock_in_attempt
    ADD CONSTRAINT mobile_clock_in_attempt_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES hr.work_location(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.mobile_device_registration
    ADD CONSTRAINT mobile_device_registration_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.mobile_device_registration
    ADD CONSTRAINT mobile_device_registration_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.mobile_geolocation_consent
    ADD CONSTRAINT mobile_geolocation_consent_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.mobile_geolocation_consent
    ADD CONSTRAINT mobile_geolocation_consent_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_timesheet_period_id_fkey FOREIGN KEY (timesheet_period_id) REFERENCES ponto.timesheet_period(timesheet_period_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.rep_device
    ADD CONSTRAINT rep_device_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.rep_ingestion_batch
    ADD CONSTRAINT rep_ingestion_batch_rep_device_id_fkey FOREIGN KEY (rep_device_id) REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.rep_ingestion_batch
    ADD CONSTRAINT rep_ingestion_batch_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.rep_ingestion_line
    ADD CONSTRAINT rep_ingestion_line_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES ponto.rep_ingestion_batch(batch_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.rep_ingestion_line
    ADD CONSTRAINT rep_ingestion_line_rep_device_id_fkey FOREIGN KEY (rep_device_id) REFERENCES ponto.rep_device(rep_device_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.rep_ingestion_line
    ADD CONSTRAINT rep_ingestion_line_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.rep_ingestion_line
    ADD CONSTRAINT rep_ingestion_line_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record_identity(time_record_id) ON DELETE SET NULL;

ALTER TABLE ONLY ponto.shift_assignment
    ADD CONSTRAINT shift_assignment_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.shift_assignment
    ADD CONSTRAINT shift_assignment_shift_pattern_id_fkey FOREIGN KEY (shift_pattern_id) REFERENCES ponto.shift_pattern(shift_pattern_id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.shift_assignment
    ADD CONSTRAINT shift_assignment_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.shift_pattern_day
    ADD CONSTRAINT shift_pattern_day_shift_pattern_id_fkey FOREIGN KEY (shift_pattern_id) REFERENCES ponto.shift_pattern(shift_pattern_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.shift_pattern_day
    ADD CONSTRAINT shift_pattern_day_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.shift_pattern
    ADD CONSTRAINT shift_pattern_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ponto.time_record
    ADD CONSTRAINT time_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.time_record_identity
    ADD CONSTRAINT time_record_identity_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.time_record_identity
    ADD CONSTRAINT time_record_identity_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_absence_justification_id_fkey FOREIGN KEY (absence_justification_id) REFERENCES ponto.absence_justification(absence_justification_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_justification_fk FOREIGN KEY (tenant_id, absence_justification_id) REFERENCES ponto.absence_justification(tenant_id, absence_justification_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record_identity(time_record_id) ON DELETE CASCADE;

ALTER TABLE ponto.time_record
    ADD CONSTRAINT time_record_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.timesheet_period
    ADD CONSTRAINT timesheet_period_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.timesheet_period
    ADD CONSTRAINT timesheet_period_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.work_schedule
    ADD CONSTRAINT work_schedule_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.work_shift
    ADD CONSTRAINT work_shift_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.work_shift
    ADD CONSTRAINT work_shift_work_schedule_id_fkey FOREIGN KEY (work_schedule_id) REFERENCES ponto.work_schedule(work_schedule_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.absence_justification FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.afd_export FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.afd_import FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.afd_import_line FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.biometric_consent FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.biometric_match FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.day_schedule FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.duty_roster FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.duty_roster_entry FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.employee_biometric_template FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.employee_face_template FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.employee_schedule_assignment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.face_consent FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.face_match FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.face_threshold_config FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.hour_bank FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.hour_bank_movement FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.mobile_clock_in_attempt FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.mobile_device_registration FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.mobile_geolocation_consent FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.payroll_bridge_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.rep_device FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.rep_ingestion_batch FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.rep_ingestion_line FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.shift_assignment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.shift_pattern FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.shift_pattern_day FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.time_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.time_record_identity FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.time_record_justification_link FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.timesheet_period FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.work_schedule FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY ponto.work_shift FORCE ROW LEVEL SECURITY;

ALTER TABLE ponto.absence_justification ENABLE ROW LEVEL SECURITY;

CREATE POLICY absence_justification_rw ON ponto.absence_justification USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.justification.read'::text, 'ponto.justification.write'::text, 'ponto.justification.approve'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.justification.write'::text, 'ponto.justification.approve'::text])));

ALTER TABLE ponto.afd_export ENABLE ROW LEVEL SECURITY;

CREATE POLICY afd_export_rw ON ponto.afd_export USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.afd.read'::text, 'ponto.afd.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.afd.write'::text])));

ALTER TABLE ponto.afd_import ENABLE ROW LEVEL SECURITY;

ALTER TABLE ponto.afd_import_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY afd_import_line_rw ON ponto.afd_import_line USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.afd.read'::text, 'ponto.afd.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.afd.write'::text])));

CREATE POLICY afd_import_rw ON ponto.afd_import USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.afd.read'::text, 'ponto.afd.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.afd.write'::text])));

ALTER TABLE ponto.biometric_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometric_consent_rw ON ponto.biometric_consent USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.read'::text, 'ponto.biometric.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.write'::text])));

ALTER TABLE ponto.biometric_match ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometric_match_rw ON ponto.biometric_match USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.read'::text, 'ponto.biometric.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.write'::text])));

ALTER TABLE ponto.day_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY day_schedule_rw ON ponto.day_schedule USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write'::text])));

ALTER TABLE ponto.duty_roster ENABLE ROW LEVEL SECURITY;

ALTER TABLE ponto.duty_roster_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY duty_roster_entry_rw ON ponto.duty_roster_entry USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read'::text, 'ponto.roster.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write'::text])));

CREATE POLICY duty_roster_rw ON ponto.duty_roster USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read'::text, 'ponto.roster.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write'::text])));

ALTER TABLE ponto.employee_biometric_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_biometric_template_rw ON ponto.employee_biometric_template USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.read'::text, 'ponto.biometric.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.biometric.write'::text])));

ALTER TABLE ponto.employee_face_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_face_template_rw ON ponto.employee_face_template USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.read'::text, 'ponto.face.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.write'::text])));

ALTER TABLE ponto.employee_schedule_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_schedule_assignment_rw ON ponto.employee_schedule_assignment USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write'::text])));

ALTER TABLE ponto.face_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY face_consent_rw ON ponto.face_consent USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.read'::text, 'ponto.face.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.write'::text])));

ALTER TABLE ponto.face_match ENABLE ROW LEVEL SECURITY;

CREATE POLICY face_match_rw ON ponto.face_match USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.read'::text, 'ponto.face.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.write'::text])));

ALTER TABLE ponto.face_threshold_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY face_threshold_config_rw ON ponto.face_threshold_config USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.read'::text, 'ponto.face.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.face.write'::text])));

ALTER TABLE ponto.hour_bank ENABLE ROW LEVEL SECURITY;

ALTER TABLE ponto.hour_bank_movement ENABLE ROW LEVEL SECURITY;

CREATE POLICY hour_bank_movement_rw ON ponto.hour_bank_movement USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.hourbank.read'::text, 'ponto.hourbank.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.hourbank.write'::text])));

CREATE POLICY hour_bank_rw ON ponto.hour_bank USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.hourbank.read'::text, 'ponto.hourbank.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.hourbank.write'::text])));

ALTER TABLE ponto.mobile_clock_in_attempt ENABLE ROW LEVEL SECURITY;

CREATE POLICY mobile_clock_in_attempt_rw ON ponto.mobile_clock_in_attempt USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.read'::text, 'ponto.mobile.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.write'::text])));

ALTER TABLE ponto.mobile_device_registration ENABLE ROW LEVEL SECURITY;

CREATE POLICY mobile_device_registration_rw ON ponto.mobile_device_registration USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.read'::text, 'ponto.mobile.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.write'::text])));

ALTER TABLE ponto.mobile_geolocation_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY mobile_geolocation_consent_rw ON ponto.mobile_geolocation_consent USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.read'::text, 'ponto.mobile.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.mobile.write'::text])));

ALTER TABLE ponto.payroll_bridge_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_bridge_event_rw ON ponto.payroll_bridge_event USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.payroll.read'::text, 'ponto.payroll.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.payroll.write'::text])));

ALTER TABLE ponto.rep_device ENABLE ROW LEVEL SECURITY;

CREATE POLICY rep_device_rw ON ponto.rep_device USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.rep.read'::text, 'ponto.rep.write'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.rep.write'::text])));

ALTER TABLE ponto.rep_ingestion_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY rep_ingestion_batch_rw ON ponto.rep_ingestion_batch USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.rep.read'::text, 'ponto.rep.write'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.rep.write'::text, 'ponto.timerecord.write'::text])));

ALTER TABLE ponto.rep_ingestion_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY rep_ingestion_line_rw ON ponto.rep_ingestion_line USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.rep.read'::text, 'ponto.rep.write'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.rep.write'::text, 'ponto.timerecord.write'::text])));

ALTER TABLE ponto.shift_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_assignment_rw ON ponto.shift_assignment USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read'::text, 'ponto.roster.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write'::text])));

ALTER TABLE ponto.shift_pattern ENABLE ROW LEVEL SECURITY;

ALTER TABLE ponto.shift_pattern_day ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_pattern_day_rw ON ponto.shift_pattern_day USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read'::text, 'ponto.roster.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write'::text])));

CREATE POLICY shift_pattern_rw ON ponto.shift_pattern USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read'::text, 'ponto.roster.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write'::text])));

ALTER TABLE ponto.time_record ENABLE ROW LEVEL SECURITY;

ALTER TABLE ponto.time_record_identity ENABLE ROW LEVEL SECURITY;

ALTER TABLE ponto.time_record_justification_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_record_justification_link_rw ON ponto.time_record_justification_link USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.justification.read'::text, 'ponto.justification.write'::text, 'ponto.justification.approve'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.justification.write'::text, 'ponto.justification.approve'::text])));

CREATE POLICY time_record_identity_rw ON ponto.time_record_identity USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.timerecord.write'::text])));

CREATE POLICY time_record_rw ON ponto.time_record USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.timerecord.write'::text])));

ALTER TABLE ponto.timesheet_period ENABLE ROW LEVEL SECURITY;

CREATE POLICY timesheet_period_rw ON ponto.timesheet_period USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write'::text])));

ALTER TABLE ponto.work_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_schedule_rw ON ponto.work_schedule USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write'::text])));

ALTER TABLE ponto.work_shift ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_shift_rw ON ponto.work_shift USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write'::text])));
