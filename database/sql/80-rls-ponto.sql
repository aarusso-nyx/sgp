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

ALTER TABLE ponto.time_record_justification_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_record_justification_link_rw ON ponto.time_record_justification_link USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.justification.read'::text, 'ponto.justification.write'::text, 'ponto.justification.approve'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.justification.write'::text, 'ponto.justification.approve'::text])));

CREATE POLICY time_record_rw ON ponto.time_record USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.timerecord.write'::text])));

ALTER TABLE ponto.timesheet_period ENABLE ROW LEVEL SECURITY;

CREATE POLICY timesheet_period_rw ON ponto.timesheet_period USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write'::text])));

ALTER TABLE ponto.work_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_schedule_rw ON ponto.work_schedule USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write'::text])));

ALTER TABLE ponto.work_shift ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_shift_rw ON ponto.work_shift USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read'::text, 'ponto.schedule.write'::text, 'ponto.timerecord.read'::text, 'ponto.timerecord.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write'::text])));
