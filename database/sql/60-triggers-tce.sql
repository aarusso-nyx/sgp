CREATE TRIGGER adapter_circuit_state_touch_updated_at BEFORE UPDATE ON tce.adapter_circuit_state FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_circuit_touch_updated_at();

CREATE TRIGGER adapter_lifecycle_event_audit AFTER INSERT OR DELETE OR UPDATE ON tce.adapter_lifecycle_event FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_adapter_audit();

CREATE TRIGGER adapter_registry_audit AFTER INSERT OR DELETE OR UPDATE ON tce.adapter_registry FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_adapter_audit();

CREATE TRIGGER layout_field_audit AFTER INSERT OR DELETE OR UPDATE ON tce.layout_field FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_audit();

CREATE TRIGGER layout_field_touch_updated_at BEFORE UPDATE ON tce.layout_field FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_touch_updated_at();

CREATE TRIGGER layout_version_audit AFTER INSERT OR DELETE OR UPDATE ON tce.layout_version FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_audit();

CREATE TRIGGER layout_version_no_active_overlap BEFORE INSERT OR UPDATE ON tce.layout_version FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_layout_version_no_active_overlap();

CREATE TRIGGER layout_version_touch_updated_at BEFORE UPDATE ON tce.layout_version FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_touch_updated_at();

CREATE TRIGGER state_audit AFTER INSERT OR DELETE OR UPDATE ON tce.state FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_audit();

CREATE TRIGGER state_touch_updated_at BEFORE UPDATE ON tce.state FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_catalog_touch_updated_at();

CREATE TRIGGER submission_attempt_audit AFTER INSERT OR DELETE OR UPDATE ON tce.submission_attempt FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_audit();

CREATE TRIGGER submission_audit AFTER INSERT OR DELETE OR UPDATE ON tce.submission FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_submission_audit();

CREATE TRIGGER submission_queue_audit AFTER INSERT OR DELETE OR UPDATE ON tce.submission_queue FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_audit();

CREATE TRIGGER submission_queue_touch_updated_at BEFORE UPDATE ON tce.submission_queue FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_queue_touch_updated_at();

CREATE TRIGGER submission_touch_updated_at BEFORE UPDATE ON tce.submission FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_submission_touch_updated_at();
