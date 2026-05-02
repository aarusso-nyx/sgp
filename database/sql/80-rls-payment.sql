ALTER TABLE ONLY payment.pis_pasep_base_year FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.consignment_entity FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.consignment_loan FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.consignment_portability_detail FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.consignment_portability_file FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.dirf_payment_source FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.fgts_account FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.fgts_caixa_adapter FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.fgts_grf FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.fgts_grrf FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.fgts_movement FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.fgts_remittance FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY payment.prior_notice FORCE ROW LEVEL SECURITY;

ALTER TABLE payment.consignment_entity ENABLE ROW LEVEL SECURITY;

CREATE POLICY consignment_entity_rw ON payment.consignment_entity USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.consignment.read'::text, 'payment.consignment.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.consignment.write'::text]))));

ALTER TABLE payment.consignment_loan ENABLE ROW LEVEL SECURITY;

CREATE POLICY consignment_loan_rw ON payment.consignment_loan USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.consignment.read'::text, 'payment.consignment.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.consignment.write'::text]))));

ALTER TABLE payment.consignment_portability_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY consignment_portability_detail_rw ON payment.consignment_portability_detail USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.consignment.read'::text, 'payment.consignment.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.consignment.write'::text]))));

ALTER TABLE payment.consignment_portability_file ENABLE ROW LEVEL SECURITY;

CREATE POLICY consignment_portability_file_rw ON payment.consignment_portability_file USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.consignment.read'::text, 'payment.consignment.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payment.consignment.write'::text]))));

ALTER TABLE payment.dirf_payment_source ENABLE ROW LEVEL SECURITY;

CREATE POLICY dirf_payment_source_select ON payment.dirf_payment_source FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.read'::text, 'fiscal.dirf.write'::text])));

CREATE POLICY dirf_payment_source_write ON payment.dirf_payment_source USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'::text])));

ALTER TABLE payment.fgts_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY fgts_account_select ON payment.fgts_account FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text]))));

CREATE POLICY fgts_account_write ON payment.fgts_account USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.write'::text]))));

ALTER TABLE payment.fgts_caixa_adapter ENABLE ROW LEVEL SECURITY;

CREATE POLICY fgts_caixa_adapter_tenant_policy ON payment.fgts_caixa_adapter USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text, 'payment.remittance.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text, 'payment.remittance.write'::text])));

ALTER TABLE payment.fgts_grf ENABLE ROW LEVEL SECURITY;

CREATE POLICY fgts_grf_tenant_policy ON payment.fgts_grf USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text, 'payment.remittance.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text, 'payment.remittance.write'::text])));

ALTER TABLE payment.fgts_grrf ENABLE ROW LEVEL SECURITY;

CREATE POLICY fgts_grrf_tenant_policy ON payment.fgts_grrf USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text, 'payment.remittance.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text, 'payment.remittance.write'::text])));

ALTER TABLE payment.fgts_movement ENABLE ROW LEVEL SECURITY;

CREATE POLICY fgts_movement_select ON payment.fgts_movement FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text]))));

CREATE POLICY fgts_movement_write ON payment.fgts_movement USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.write'::text]))));

ALTER TABLE payment.fgts_remittance ENABLE ROW LEVEL SECURITY;

CREATE POLICY fgts_remittance_tenant_policy ON payment.fgts_remittance USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text, 'payment.remittance.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text, 'payment.remittance.write'::text])));

ALTER TABLE payment.pis_pasep_base_year ENABLE ROW LEVEL SECURITY;

CREATE POLICY pis_pasep_base_year_select ON payment.pis_pasep_base_year FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read'::text, 'payroll.payroll.write'::text])));

CREATE POLICY pis_pasep_base_year_write ON payment.pis_pasep_base_year USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read'::text, 'payroll.payroll.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read'::text, 'payroll.payroll.write'::text])));

ALTER TABLE payment.prior_notice ENABLE ROW LEVEL SECURITY;

CREATE POLICY prior_notice_select ON payment.prior_notice FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.read'::text, 'payroll.run.write'::text]))));

CREATE POLICY prior_notice_write ON payment.prior_notice USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.write'::text]))));
