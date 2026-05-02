CREATE TRIGGER aso_attachment_audit AFTER INSERT OR DELETE OR UPDATE ON saude.aso_attachment FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER aso_attachment_touch_updated_at BEFORE UPDATE ON saude.aso_attachment FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER aso_exam_item_audit AFTER INSERT OR DELETE OR UPDATE ON saude.aso_exam_item FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER aso_exam_item_touch_updated_at BEFORE UPDATE ON saude.aso_exam_item FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER aso_record_audit AFTER INSERT OR DELETE OR UPDATE ON saude.aso_record FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER aso_record_touch_updated_at BEFORE UPDATE ON saude.aso_record FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER cat_emission_audit AFTER INSERT OR DELETE OR UPDATE ON saude.cat_emission FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER cat_emission_touch_updated_at BEFORE UPDATE ON saude.cat_emission FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER cat_emission_validate BEFORE INSERT OR UPDATE ON saude.cat_emission FOR EACH ROW EXECUTE FUNCTION saude.sst03_validate_cat_emission();

CREATE TRIGGER environmental_exposure_audit AFTER INSERT OR DELETE OR UPDATE ON saude.environmental_exposure FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER environmental_exposure_touch_updated_at BEFORE UPDATE ON saude.environmental_exposure FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER environmental_exposure_validate BEFORE INSERT OR UPDATE ON saude.environmental_exposure FOR EACH ROW EXECUTE FUNCTION saude.sst05_validate_environmental_exposure();

CREATE TRIGGER epi_delivery_audit AFTER INSERT OR DELETE OR UPDATE ON saude.epi_delivery FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER epi_delivery_touch_updated_at BEFORE UPDATE ON saude.epi_delivery FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER epi_delivery_validate BEFORE INSERT OR UPDATE ON saude.epi_delivery FOR EACH ROW EXECUTE FUNCTION saude.sst05_validate_epi_delivery();

CREATE TRIGGER epi_inventory_audit AFTER INSERT OR DELETE OR UPDATE ON saude.epi_inventory FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER epi_inventory_touch_updated_at BEFORE UPDATE ON saude.epi_inventory FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER health_program_audit AFTER INSERT OR DELETE OR UPDATE ON saude.health_program FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER health_program_touch_updated_at BEFORE UPDATE ON saude.health_program FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER medical_exam_audit AFTER INSERT OR DELETE OR UPDATE ON saude.medical_exam FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER medical_exam_touch_updated_at BEFORE UPDATE ON saude.medical_exam FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER pcmso_required_exam_audit AFTER INSERT OR DELETE OR UPDATE ON saude.pcmso_required_exam FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER pcmso_required_exam_touch_updated_at BEFORE UPDATE ON saude.pcmso_required_exam FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER ppp_record_audit AFTER INSERT OR DELETE ON saude.ppp_record FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER ppp_record_no_delete BEFORE DELETE ON saude.ppp_record FOR EACH ROW EXECUTE FUNCTION saude.sst05_block_ppp_record_mutation();

CREATE TRIGGER ppp_record_no_update BEFORE UPDATE ON saude.ppp_record FOR EACH ROW EXECUTE FUNCTION saude.sst05_block_ppp_record_mutation();

CREATE TRIGGER program_revision_audit AFTER INSERT OR DELETE ON saude.program_revision FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER program_revision_no_delete BEFORE DELETE ON saude.program_revision FOR EACH ROW EXECUTE FUNCTION saude.sst02_block_program_revision_mutation();

CREATE TRIGGER program_revision_no_update BEFORE UPDATE ON saude.program_revision FOR EACH ROW EXECUTE FUNCTION saude.sst02_block_program_revision_mutation();

CREATE TRIGGER risk_management_program_audit AFTER INSERT OR DELETE OR UPDATE ON saude.risk_management_program FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER risk_management_program_touch_updated_at BEFORE UPDATE ON saude.risk_management_program FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER sst03_cat_emission_s2210 AFTER INSERT ON saude.cat_emission FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2210_from_cat();

CREATE TRIGGER sst04_aso_record_s2220 AFTER UPDATE ON saude.aso_record FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2220_from_aso();

CREATE TRIGGER sst05_environmental_exposure_s2240 AFTER INSERT OR UPDATE ON saude.environmental_exposure FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2240_from_exposure();

CREATE TRIGGER work_accident_audit AFTER INSERT OR DELETE OR UPDATE ON saude.work_accident FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE TRIGGER work_accident_state_machine BEFORE UPDATE ON saude.work_accident FOR EACH ROW EXECUTE FUNCTION saude.sst03_validate_work_accident_state();

CREATE TRIGGER work_accident_touch_updated_at BEFORE UPDATE ON saude.work_accident FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
