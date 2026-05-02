CREATE TRIGGER audit_reintegration_order_mutation AFTER INSERT OR DELETE OR UPDATE ON hr.reintegration_order FOR EACH ROW EXECUTE FUNCTION hr.audit_reintegration_order_mutation();

CREATE TRIGGER audit_tsv_contract_change_mutation AFTER INSERT OR DELETE OR UPDATE ON hr.tsv_contract_change FOR EACH ROW EXECUTE FUNCTION hr.audit_tsv_contract_change_mutation();

CREATE TRIGGER audit_tsv_contract_mutation AFTER INSERT OR DELETE OR UPDATE ON hr.tsv_contract FOR EACH ROW EXECUTE FUNCTION hr.audit_tsv_contract_mutation();

CREATE TRIGGER employee_alimony_audit AFTER INSERT OR DELETE OR UPDATE ON hr.employee_alimony FOR EACH ROW EXECUTE FUNCTION hr.sgp_employee_alimony_mutation();

CREATE TRIGGER employee_bank_account_audit AFTER INSERT OR DELETE OR UPDATE ON hr.employee_bank_account FOR EACH ROW EXECUTE FUNCTION hr.sgp_employee_bank_account_audit();

CREATE TRIGGER employee_transfer_effect_after_update AFTER UPDATE ON hr.employee_transfer FOR EACH ROW EXECUTE FUNCTION hr.sgp_effect_employee_transfer();

CREATE TRIGGER es03_employment_link_s2299 AFTER UPDATE ON hr.employment_link FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2299_from_employment_link();

CREATE TRIGGER es03_leave_record_s2230 AFTER INSERT OR UPDATE ON hr.leave_record FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2230_from_leave();

CREATE TRIGGER es03_vacation_record_s2230 AFTER INSERT OR UPDATE ON hr.vacation_record FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2230_from_vacation();

CREATE TRIGGER hr01_employee_timeline AFTER INSERT OR UPDATE OF functional_status_id, terminated_on, lifecycle_status ON hr.employee FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_employee_timeline();

CREATE TRIGGER hr01_employment_contract_updated_at BEFORE UPDATE ON hr.employment_contract FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_set_updated_at();

CREATE TRIGGER hr01_status_history_immutable BEFORE DELETE OR UPDATE ON hr.employee_status_history FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_status_history_immutable();

CREATE TRIGGER hr02_employment_link_timeline AFTER UPDATE OF contract_type, functional_status_id ON hr.employment_link FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr02_employment_link_timeline();

CREATE TRIGGER hr03_vacation_record_audit AFTER INSERT OR DELETE OR UPDATE ON hr.vacation_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr03_vacation_record_audit();

CREATE TRIGGER hr04_leave_record_audit AFTER INSERT OR DELETE OR UPDATE ON hr.leave_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

CREATE TRIGGER hr04_medical_appointment_audit AFTER INSERT OR DELETE OR UPDATE ON hr.medical_appointment FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

CREATE TRIGGER hr04_medical_record_audit AFTER INSERT OR DELETE OR UPDATE ON hr.medical_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

CREATE TRIGGER hr04_medical_record_conclude AFTER INSERT OR UPDATE OF decision ON hr.medical_record FOR EACH ROW WHEN ((new.decision = 'granted'::text)) EXECUTE FUNCTION hr.sgp_hr04_medical_record_conclude();

CREATE TRIGGER hr05_leave_record_approval_history AFTER UPDATE OF approved_at ON hr.leave_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr05_leave_record_approval_history();

CREATE TRIGGER hr05_leave_record_validate BEFORE INSERT OR UPDATE OF absence_reason_id, starts_on, ends_on, days, supporting_document_ref, paid ON hr.leave_record FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr05_leave_record_validate();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.cost_center FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.job_function FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.job_position FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.job_structure_employment_link FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.work_location FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr06_org_structure_audit BEFORE INSERT OR UPDATE ON hr.work_location_structure_assignment FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure();

CREATE TRIGGER hr07_cadastral_change_audit AFTER INSERT OR DELETE OR UPDATE ON hr.cadastral_change_request FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr07_cadastral_change_audit();

CREATE TRIGGER hr08_probation_evaluation_updated_at BEFORE UPDATE ON hr.probation_evaluation FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_set_updated_at();

CREATE TRIGGER hr08_probation_statutory_only BEFORE INSERT OR UPDATE ON hr.probation_evaluation FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_probation_statutory_only();

CREATE TRIGGER hr08_status_history_immutable BEFORE DELETE OR UPDATE ON hr.employee_status_history FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_status_history_immutable();

CREATE TRIGGER trg_apply_merit_progression BEFORE UPDATE OF status ON hr.merit_progression FOR EACH ROW EXECUTE FUNCTION avaliacao.apply_merit_progression();

CREATE TRIGGER trg_employee_dependent_s2205_pending AFTER INSERT OR DELETE OR UPDATE ON hr.employee_dependent FOR EACH ROW EXECUTE FUNCTION esocial.trg_employee_dependent_s2205_pending();

CREATE TRIGGER trg_employee_s2205_pending AFTER UPDATE ON hr.employee FOR EACH ROW EXECUTE FUNCTION esocial.trg_employee_s2205_pending();
