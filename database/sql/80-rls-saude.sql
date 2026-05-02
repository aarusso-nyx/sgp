ALTER TABLE ONLY saude.aso_attachment FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.aso_exam_item FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.aso_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.cat_emission FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.environmental_exposure FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.epi_delivery FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.epi_inventory FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.health_program FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.medical_exam FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.pcmso_required_exam FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.ppp_record FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.program_revision FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.risk_management_program FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY saude.work_accident FORCE ROW LEVEL SECURITY;

ALTER TABLE saude.aso_attachment ENABLE ROW LEVEL SECURITY;

CREATE POLICY aso_attachment_select ON saude.aso_attachment FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND (public.sgp_has_any_permission(ARRAY['saude.aso.read'::text, 'saude.aso.write'::text]) OR (public.sgp_has_any_permission(ARRAY['saude.aso.self_read'::text]) AND (EXISTS ( SELECT 1
   FROM saude.aso_record ar
  WHERE ((ar.id = aso_attachment.aso_record_id) AND (ar.tenant_id = aso_attachment.tenant_id) AND (ar.employee_id = public.sgp_current_employee_id()))))))));

CREATE POLICY aso_attachment_write ON saude.aso_attachment USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text])));

ALTER TABLE saude.aso_exam_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY aso_exam_item_select ON saude.aso_exam_item FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND (public.sgp_has_any_permission(ARRAY['saude.aso.read'::text, 'saude.aso.write'::text]) OR (public.sgp_has_any_permission(ARRAY['saude.aso.self_read'::text]) AND (EXISTS ( SELECT 1
   FROM saude.aso_record ar
  WHERE ((ar.id = aso_exam_item.aso_record_id) AND (ar.tenant_id = aso_exam_item.tenant_id) AND (ar.employee_id = public.sgp_current_employee_id()))))))));

CREATE POLICY aso_exam_item_write ON saude.aso_exam_item USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text])));

ALTER TABLE saude.aso_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY aso_record_select ON saude.aso_record FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND (public.sgp_has_any_permission(ARRAY['saude.aso.read'::text, 'saude.aso.write'::text]) OR (public.sgp_has_any_permission(ARRAY['saude.aso.self_read'::text]) AND (employee_id = public.sgp_current_employee_id())))));

CREATE POLICY aso_record_write ON saude.aso_record USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text])));

ALTER TABLE saude.cat_emission ENABLE ROW LEVEL SECURITY;

CREATE POLICY cat_emission_rw ON saude.cat_emission USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.read'::text, 'saude.cat.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.write'::text, 'esocial.event.write'::text])));

ALTER TABLE saude.environmental_exposure ENABLE ROW LEVEL SECURITY;

CREATE POLICY environmental_exposure_rw ON saude.environmental_exposure USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.write'::text, 'esocial.event.write'::text])));

ALTER TABLE saude.epi_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY epi_delivery_rw ON saude.epi_delivery USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.epi.write'::text])));

ALTER TABLE saude.epi_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY epi_inventory_rw ON saude.epi_inventory USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.epi.write'::text])));

ALTER TABLE saude.health_program ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_program_rw ON saude.health_program USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.medical_exam ENABLE ROW LEVEL SECURITY;

CREATE POLICY medical_exam_rw ON saude.medical_exam USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.read'::text, 'saude.aso.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write'::text])));

ALTER TABLE saude.pcmso_required_exam ENABLE ROW LEVEL SECURITY;

CREATE POLICY pcmso_required_exam_rw ON saude.pcmso_required_exam USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.ppp_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY ppp_record_rw ON saude.ppp_record USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.write'::text])));

ALTER TABLE saude.program_revision ENABLE ROW LEVEL SECURITY;

CREATE POLICY program_revision_rw ON saude.program_revision USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.risk_management_program ENABLE ROW LEVEL SECURITY;

CREATE POLICY risk_management_program_rw ON saude.risk_management_program USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read'::text, 'saude.program.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write'::text])));

ALTER TABLE saude.work_accident ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_accident_rw ON saude.work_accident USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.read'::text, 'saude.cat.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.write'::text, 'esocial.event.write'::text])));
