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
    ADD CONSTRAINT afd_import_line_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record(time_record_id) ON DELETE SET NULL;

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
    ADD CONSTRAINT biometric_match_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record(time_record_id) ON DELETE CASCADE;

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
    ADD CONSTRAINT face_match_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record(time_record_id) ON DELETE SET NULL;

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
    ADD CONSTRAINT mobile_clock_in_attempt_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record(time_record_id) ON DELETE SET NULL;

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
    ADD CONSTRAINT rep_ingestion_line_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record(time_record_id) ON DELETE SET NULL;

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

ALTER TABLE ONLY ponto.time_record
    ADD CONSTRAINT time_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_absence_justification_id_fkey FOREIGN KEY (absence_justification_id) REFERENCES ponto.absence_justification(absence_justification_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_justification_fk FOREIGN KEY (tenant_id, absence_justification_id) REFERENCES ponto.absence_justification(tenant_id, absence_justification_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT;

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_time_record_id_fkey FOREIGN KEY (time_record_id) REFERENCES ponto.time_record(time_record_id) ON DELETE CASCADE;

ALTER TABLE ONLY ponto.time_record
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
