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

CREATE TRIGGER time_record_justification_link_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.time_record_justification_link FOR EACH ROW EXECUTE FUNCTION ponto.ponto06_audit_row();

CREATE TRIGGER timesheet_period_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.timesheet_period FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER timesheet_period_touch_updated_at BEFORE UPDATE ON ponto.timesheet_period FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();

CREATE TRIGGER work_schedule_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.work_schedule FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER work_schedule_touch_updated_at BEFORE UPDATE ON ponto.work_schedule FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();

CREATE TRIGGER work_shift_audit AFTER INSERT OR DELETE OR UPDATE ON ponto.work_shift FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

CREATE TRIGGER work_shift_touch_updated_at BEFORE UPDATE ON ponto.work_shift FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();
