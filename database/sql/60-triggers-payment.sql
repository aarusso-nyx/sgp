CREATE TRIGGER consignment_entity_audit AFTER INSERT OR DELETE OR UPDATE ON payment.consignment_entity FOR EACH ROW EXECUTE FUNCTION payment.sgp_consignment_audit();

CREATE TRIGGER consignment_loan_audit AFTER INSERT OR DELETE OR UPDATE ON payment.consignment_loan FOR EACH ROW EXECUTE FUNCTION payment.sgp_consignment_audit();

CREATE TRIGGER consignment_portability_detail_audit AFTER INSERT OR DELETE OR UPDATE ON payment.consignment_portability_detail FOR EACH ROW EXECUTE FUNCTION payment.sgp_consignment_portability_audit();

CREATE TRIGGER consignment_portability_file_audit AFTER INSERT OR DELETE OR UPDATE ON payment.consignment_portability_file FOR EACH ROW EXECUTE FUNCTION payment.sgp_consignment_portability_audit();

CREATE TRIGGER dirf_payment_source_audit AFTER INSERT OR DELETE OR UPDATE ON payment.dirf_payment_source FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

CREATE TRIGGER dirf_payment_source_touch_updated_at BEFORE UPDATE ON payment.dirf_payment_source FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_touch_updated_at();

CREATE TRIGGER fgts_account_audit AFTER INSERT OR DELETE OR UPDATE ON payment.fgts_account FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_audit();

CREATE TRIGGER fgts_caixa_adapter_audit AFTER INSERT OR DELETE OR UPDATE ON payment.fgts_caixa_adapter FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_remittance_audit();

CREATE TRIGGER fgts_caixa_adapter_touch_updated_at BEFORE UPDATE ON payment.fgts_caixa_adapter FOR EACH ROW EXECUTE FUNCTION payment.sgp_touch_updated_at();

CREATE TRIGGER fgts_grf_audit AFTER INSERT OR DELETE OR UPDATE ON payment.fgts_grf FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_remittance_audit();

CREATE TRIGGER fgts_grrf_audit AFTER INSERT OR DELETE OR UPDATE ON payment.fgts_grrf FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_remittance_audit();

CREATE TRIGGER fgts_movement_audit AFTER INSERT OR DELETE OR UPDATE ON payment.fgts_movement FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_audit();

CREATE TRIGGER fgts_remittance_audit AFTER INSERT OR DELETE OR UPDATE ON payment.fgts_remittance FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_remittance_audit();

CREATE TRIGGER fgts_remittance_touch_updated_at BEFORE UPDATE ON payment.fgts_remittance FOR EACH ROW EXECUTE FUNCTION payment.sgp_touch_updated_at();

CREATE TRIGGER pis_pasep_base_year_audit AFTER INSERT OR DELETE OR UPDATE ON payment.pis_pasep_base_year FOR EACH ROW EXECUTE FUNCTION payment.sgp_pis_pasep_audit();

CREATE TRIGGER prior_notice_audit AFTER INSERT OR DELETE OR UPDATE ON payment.prior_notice FOR EACH ROW EXECUTE FUNCTION payment.sgp_prior_notice_audit();
