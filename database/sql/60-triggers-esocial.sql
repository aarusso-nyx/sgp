CREATE TRIGGER audit_s2298_event_mutation AFTER INSERT OR DELETE OR UPDATE ON esocial.s2298_event FOR EACH ROW EXECUTE FUNCTION esocial.audit_s2298_event_mutation();

CREATE TRIGGER audit_s2306_event_mutation AFTER INSERT OR DELETE OR UPDATE ON esocial.s2306_event FOR EACH ROW EXECUTE FUNCTION esocial.audit_s2306_event_mutation();

CREATE TRIGGER es03_s2230_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2230_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es03_pending_audit();

CREATE TRIGGER es03_s2299_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2299_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es03_pending_audit();

CREATE TRIGGER es04_s1200_emission_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1200_emission_state FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es04_emission_state_audit();

CREATE TRIGGER es04_s1210_emission_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1210_emission_state FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es04_emission_state_audit();

CREATE TRIGGER s2210_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2210_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2210_pending_audit();

CREATE TRIGGER s2220_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2220_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2220_pending_audit();

CREATE TRIGGER s2240_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2240_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2240_pending_audit();

CREATE TRIGGER s2240_pending_touch_updated_at BEFORE UPDATE ON esocial.s2240_pending FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER trg_endpoint_circuit_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.endpoint_circuit_state FOR EACH ROW EXECUTE FUNCTION esocial.audit_endpoint_circuit_state_mutation();

CREATE TRIGGER trg_esocial_totalizer_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.esocial_totalizer FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es05_state_totalizer_audit();

CREATE TRIGGER trg_event_retry_schedule_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.event_retry_schedule FOR EACH ROW EXECUTE FUNCTION esocial.audit_event_retry_schedule_mutation();

CREATE TRIGGER trg_s1299_emission_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1299_emission_state FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es05_state_totalizer_audit();

CREATE TRIGGER trg_s1xxx_dispatch_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1xxx_dispatch_state FOR EACH ROW EXECUTE FUNCTION esocial.audit_s1xxx_dispatch_state_mutation();

CREATE TRIGGER trg_s3000_prepare_request BEFORE INSERT OR UPDATE OF target_event_id, target_recibo, target_event_kind, status ON esocial.s3000_request FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s3000_prepare_request();

CREATE TRIGGER trg_s3000_request_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s3000_request FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s3000_request_audit();

CREATE TRIGGER trg_submission_batch_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.submission_batch FOR EACH ROW EXECUTE FUNCTION esocial.audit_submission_batch_mutation();

CREATE TRIGGER trg_tenant_certificate_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.tenant_certificate FOR EACH ROW EXECUTE FUNCTION esocial.audit_tenant_certificate_mutation();

CREATE TRIGGER trg_xsd_validation_failure_audit AFTER INSERT ON esocial.xsd_validation_failure FOR EACH ROW EXECUTE FUNCTION esocial.audit_xsd_validation_failure_mutation();
