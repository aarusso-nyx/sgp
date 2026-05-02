CREATE TRIGGER dctfweb_declaration_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dctfweb_declaration FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER dctfweb_declaration_touch_updated_at BEFORE UPDATE ON fiscal.dctfweb_declaration FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_touch_updated_at();

CREATE TRIGGER dctfweb_item_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dctfweb_item FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER dirf_arquivo_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dirf_arquivo FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

CREATE TRIGGER dirf_arquivo_touch_updated_at BEFORE UPDATE ON fiscal.dirf_arquivo FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_touch_updated_at();

CREATE TRIGGER dirf_beneficiario_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dirf_beneficiario FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

CREATE TRIGGER dirf_pagamento_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dirf_pagamento FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

CREATE TRIGGER gps_payment_code_touch_updated_at BEFORE UPDATE ON fiscal.gps_payment_code FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_touch_updated_at();

CREATE TRIGGER gps_remittance_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.gps_remittance FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_audit();

CREATE TRIGGER gps_remittance_touch_updated_at BEFORE UPDATE ON fiscal.gps_remittance FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_touch_updated_at();
