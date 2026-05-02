ALTER TABLE ONLY fiscal.yearly_income_aggregate FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.dctfweb_declaration FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.dctfweb_item FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.dirf_arquivo FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.dirf_beneficiario FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.dirf_pagamento FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.gps_remittance FORCE ROW LEVEL SECURITY;

ALTER TABLE fiscal.dctfweb_declaration ENABLE ROW LEVEL SECURITY;

CREATE POLICY dctfweb_declaration_select ON fiscal.dctfweb_declaration FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text])));

CREATE POLICY dctfweb_declaration_write ON fiscal.dctfweb_declaration USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text])));

ALTER TABLE fiscal.dctfweb_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY dctfweb_item_select ON fiscal.dctfweb_item FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text])));

CREATE POLICY dctfweb_item_write ON fiscal.dctfweb_item USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text])));

ALTER TABLE fiscal.dirf_arquivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY dirf_arquivo_select ON fiscal.dirf_arquivo FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.read'::text, 'fiscal.dirf.write'::text])));

CREATE POLICY dirf_arquivo_write ON fiscal.dirf_arquivo USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'::text])));

ALTER TABLE fiscal.dirf_beneficiario ENABLE ROW LEVEL SECURITY;

CREATE POLICY dirf_beneficiario_select ON fiscal.dirf_beneficiario FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.read'::text, 'fiscal.dirf.write'::text])));

CREATE POLICY dirf_beneficiario_write ON fiscal.dirf_beneficiario USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'::text])));

ALTER TABLE fiscal.dirf_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY dirf_pagamento_select ON fiscal.dirf_pagamento FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.read'::text, 'fiscal.dirf.write'::text])));

CREATE POLICY dirf_pagamento_write ON fiscal.dirf_pagamento USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.write'::text])));

ALTER TABLE fiscal.gps_remittance ENABLE ROW LEVEL SECURITY;

CREATE POLICY gps_remittance_select ON fiscal.gps_remittance FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.gps.read'::text, 'fiscal.gps.write'::text])));

CREATE POLICY gps_remittance_write ON fiscal.gps_remittance USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.gps.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.gps.write'::text])));

ALTER TABLE fiscal.yearly_income_aggregate ENABLE ROW LEVEL SECURITY;

CREATE POLICY yearly_income_aggregate_select ON fiscal.yearly_income_aggregate FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.read'::text, 'fiscal.yearly_income.write'::text, 'report.payslip.read'::text])) OR (public.sgp_tenant_matches(tenant_id) AND (employee_id = public.sgp_current_employee_id()) AND public.sgp_has_any_permission(ARRAY['portal.yearly_income.read'::text]))));

CREATE POLICY yearly_income_aggregate_write ON fiscal.yearly_income_aggregate USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write'::text]))));
