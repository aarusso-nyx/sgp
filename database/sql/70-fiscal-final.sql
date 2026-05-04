CREATE VIEW fiscal.v_dctfweb_summary WITH (security_invoker='true') AS
 SELECT declaration.tenant_id,
    declaration.id AS declaration_id,
    declaration.competence,
    declaration.kind,
    declaration.status,
    declaration.original_declaration_id,
    declaration.payload_xml_ref,
    declaration.payload_xml,
    declaration.payload_xml_hash,
    declaration.signed_xml_ref,
    declaration.signed_xml,
    declaration.signed_xml_hash,
    declaration.transmitted_xml_hash,
    declaration.receipt_number,
    declaration.receipt_at,
    (count(item.id))::integer AS item_count,
    (COALESCE(sum(item.base_amount), (0)::numeric))::numeric(14,2) AS total_base_amount,
    (COALESCE(sum(item.amount), (0)::numeric))::numeric(14,2) AS total_amount,
    declaration.created_at,
    declaration.updated_at
   FROM (fiscal.dctfweb_declaration declaration
     LEFT JOIN fiscal.dctfweb_item item ON (((item.tenant_id = declaration.tenant_id) AND (item.declaracao_id = declaration.id))))
  WHERE (public.sgp_tenant_matches(declaration.tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text]))
  GROUP BY declaration.tenant_id, declaration.id, declaration.competence, declaration.kind, declaration.status, declaration.original_declaration_id, declaration.payload_xml_ref, declaration.payload_xml, declaration.payload_xml_hash, declaration.signed_xml_ref, declaration.signed_xml, declaration.signed_xml_hash, declaration.transmitted_xml_hash, declaration.receipt_number, declaration.receipt_at, declaration.created_at, declaration.updated_at;

CREATE VIEW fiscal.v_dirf_summary WITH (security_invoker='true') AS
 SELECT arquivo.tenant_id,
    arquivo.id AS arquivo_id,
    arquivo.year_base,
    arquivo.kind,
    arquivo.status,
    arquivo.original_arquivo_id,
    arquivo.txt_ref,
    arquivo.txt_content,
    arquivo.txt_hash,
    arquivo.layout_version,
    arquivo.generated_at,
    (count(DISTINCT beneficiario.id))::integer AS beneficiary_count,
    (count(pagamento.id))::integer AS payment_count,
    (COALESCE(sum(pagamento.amount), (0)::numeric))::numeric(14,2) AS total_amount,
    (COALESCE(sum(pagamento.irrf), (0)::numeric))::numeric(14,2) AS total_irrf,
    arquivo.created_at,
    arquivo.updated_at
   FROM ((fiscal.dirf_arquivo arquivo
     LEFT JOIN fiscal.dirf_beneficiario beneficiario ON (((beneficiario.tenant_id = arquivo.tenant_id) AND (beneficiario.dirf_arquivo_id = arquivo.id))))
     LEFT JOIN fiscal.dirf_pagamento pagamento ON (((pagamento.tenant_id = beneficiario.tenant_id) AND (pagamento.dirf_beneficiario_id = beneficiario.id))))
  WHERE (public.sgp_tenant_matches(arquivo.tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dirf.read'::text, 'fiscal.dirf.write'::text]))
  GROUP BY arquivo.tenant_id, arquivo.id, arquivo.year_base, arquivo.kind, arquivo.status, arquivo.original_arquivo_id, arquivo.txt_ref, arquivo.txt_content, arquivo.txt_hash, arquivo.layout_version, arquivo.generated_at, arquivo.created_at, arquivo.updated_at;

CREATE VIEW fiscal.v_efd_reinf_event_summary WITH (security_invoker='true') AS
 SELECT event.tenant_id,
    event.id AS event_id,
    event.competence,
    event.event_type,
    event.kind,
    event.status,
    event.original_event_id,
    event.payload_xml_ref,
    event.payload_xml,
    event.payload_xml_hash,
    event.signed_xml_ref,
    event.signed_xml,
    event.signed_xml_hash,
    event.transmitted_xml_hash,
    event.receipt_number,
    event.receipt_at,
    (count(item.id))::integer AS item_count,
    (COALESCE(sum(item.gross_amount), (0)::numeric))::numeric(14,2) AS total_gross_amount,
    (COALESCE(sum(item.retained_amount), (0)::numeric))::numeric(14,2) AS total_retained_amount,
    event.created_at,
    event.updated_at
   FROM (fiscal.efd_reinf_event event
     LEFT JOIN fiscal.efd_reinf_item item ON (((item.tenant_id = event.tenant_id) AND (item.event_id = event.id))))
  WHERE (public.sgp_tenant_matches(event.tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text]))
  GROUP BY event.tenant_id, event.id, event.competence, event.event_type, event.kind, event.status, event.original_event_id, event.payload_xml_ref, event.payload_xml, event.payload_xml_hash, event.signed_xml_ref, event.signed_xml, event.signed_xml_hash, event.transmitted_xml_hash, event.receipt_number, event.receipt_at, event.created_at, event.updated_at;

CREATE VIEW fiscal.v_siafic_sync_summary WITH (security_invoker='true') AS
 SELECT batch.tenant_id,
    batch.id AS batch_id,
    batch.payroll_run_id,
    batch.competence,
    batch.ente_code,
    batch.status,
    batch.circuit_state,
    batch.attempts,
    batch.receipt_number,
    batch.last_error,
    batch.stage_status,
    batch.item_count,
    batch.total_amount,
    batch.created_at,
    batch.updated_at,
    (count(item.id))::integer AS synced_item_count,
    (COALESCE(sum(item.amount), (0)::numeric))::numeric(14,2) AS synced_amount
   FROM (fiscal.siafic_sync_batch batch
     LEFT JOIN fiscal.siafic_sync_item item ON (((item.tenant_id = batch.tenant_id) AND (item.batch_id = batch.id))))
  WHERE (public.sgp_tenant_matches(batch.tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text]))
  GROUP BY batch.tenant_id, batch.id, batch.payroll_run_id, batch.competence, batch.ente_code, batch.status, batch.circuit_state, batch.attempts, batch.receipt_number, batch.last_error, batch.stage_status, batch.item_count, batch.total_amount, batch.created_at, batch.updated_at;

CREATE VIEW fiscal.v_gps_remittance_summary WITH (security_invoker='true') AS
 SELECT remittance.tenant_id,
    remittance.id,
    remittance.competence,
    remittance.payment_code_id,
    code.code AS payment_code,
    code.description AS payment_code_description,
    remittance.reason,
    remittance.reason_detail,
    remittance.base_amount,
    remittance.amount,
    remittance.interest_amount,
    remittance.fine_amount,
    remittance.total_amount,
    remittance.status,
    remittance.file_uri,
    remittance.txt_hash,
    remittance.generated_at,
    remittance.paid_at,
    remittance.created_at,
    remittance.updated_at
   FROM (fiscal.gps_remittance remittance
     JOIN fiscal.gps_payment_code code ON ((code.id = remittance.payment_code_id)))
  WHERE (public.sgp_tenant_matches(remittance.tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.gps.read'::text, 'fiscal.gps.write'::text]));

CREATE VIEW fiscal.v_yearly_income WITH (security_invoker='true') AS
 SELECT (aggregate.tenant_id)::text AS tenant_id,
    COALESCE(company.legal_name, branch.name, 'Ente publico'::text) AS tenant_name,
    COALESCE(company.cnpj, ''::text) AS tenant_document,
    (aggregate.employee_id)::text AS employee_id,
    employee.registration,
    employee.name AS employee_name,
    employee.cpf,
    COALESCE(link.name, link.code, ''::text) AS employment_link,
    aggregate.year_base,
    aggregate.taxable_total,
    aggregate.thirteenth_salary,
    aggregate.vacation_total,
    aggregate.severance_total,
    aggregate.exempt_total,
    aggregate.inss_rpps_total,
    aggregate.irrf_total,
    aggregate.dependents_count,
    ((aggregate.taxable_total + aggregate.exempt_total))::numeric(14,2) AS s1210_total,
    aggregate.irrf_total AS s1210_irrf_total,
    aggregate.recomputed_at
   FROM ((((fiscal.yearly_income_aggregate aggregate
     JOIN hr.employee employee ON (((employee.id = aggregate.employee_id) AND (employee.tenant_id = aggregate.tenant_id))))
     LEFT JOIN hr.branch branch ON ((branch.id = employee.branch_id)))
     LEFT JOIN hr.company company ON ((company.id = branch.company_id)))
     LEFT JOIN hr.employment_link link ON ((link.id = employee.employment_link_id)))
  WHERE (public.sgp_tenant_matches(aggregate.tenant_id) AND (public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.read'::text, 'fiscal.yearly_income.write'::text, 'report.payslip.read'::text]) OR ((aggregate.employee_id = public.sgp_current_employee_id()) AND public.sgp_has_any_permission(ARRAY['portal.yearly_income.read'::text]))));

CREATE INDEX dctfweb_declaration_competence_idx ON fiscal.dctfweb_declaration USING btree (tenant_id, competence, status);

CREATE UNIQUE INDEX dctfweb_declaration_original_uq ON fiscal.dctfweb_declaration USING btree (tenant_id, competence) WHERE (kind = 'ORIGINAL'::fiscal.dctfweb_declaration_kind);

CREATE INDEX dctfweb_item_declaration_idx ON fiscal.dctfweb_item USING btree (tenant_id, declaracao_id, source_event);

CREATE INDEX dctf_pgd_tax_debit_competence_idx ON fiscal.dctf_pgd_tax_debit USING btree (tenant_id, competence, cnpj_filial, mit_status);

CREATE INDEX efd_reinf_event_competence_idx ON fiscal.efd_reinf_event USING btree (tenant_id, competence, event_type, status);

CREATE UNIQUE INDEX efd_reinf_event_original_uq ON fiscal.efd_reinf_event USING btree (tenant_id, competence, event_type) WHERE (kind = 'ORIGINAL'::fiscal.efd_reinf_event_kind);

CREATE INDEX efd_reinf_item_event_idx ON fiscal.efd_reinf_item USING btree (tenant_id, event_id, revenue_code);

CREATE INDEX efd_reinf_totalizer_lookup_idx ON fiscal.efd_reinf_totalizer USING btree (tenant_id, competence, kind);

CREATE INDEX siafic_sync_batch_competence_idx ON fiscal.siafic_sync_batch USING btree (tenant_id, competence, payroll_run_id, status);

CREATE INDEX siafic_sync_batch_ente_circuit_idx ON fiscal.siafic_sync_batch USING btree (tenant_id, ente_code, circuit_state, updated_at DESC);

CREATE INDEX siafic_sync_item_batch_idx ON fiscal.siafic_sync_item USING btree (tenant_id, batch_id, stage, status);

CREATE UNIQUE INDEX dirf_arquivo_original_uq ON fiscal.dirf_arquivo USING btree (tenant_id, year_base) WHERE (kind = 'ORIGINAL'::fiscal.dirf_arquivo_kind);

CREATE INDEX dirf_arquivo_year_idx ON fiscal.dirf_arquivo USING btree (tenant_id, year_base, status);

CREATE UNIQUE INDEX dirf_beneficiario_document_uq ON fiscal.dirf_beneficiario USING btree (tenant_id, dirf_arquivo_id, cpf_cnpj);

CREATE INDEX dirf_pagamento_beneficiario_idx ON fiscal.dirf_pagamento USING btree (tenant_id, dirf_beneficiario_id, code, month_year);

CREATE UNIQUE INDEX gps_remittance_competence_code_uq ON fiscal.gps_remittance USING btree (tenant_id, competence, payment_code_id);

CREATE INDEX gps_remittance_reason_status_idx ON fiscal.gps_remittance USING btree (tenant_id, reason, status, competence DESC);

CREATE INDEX yearly_income_aggregate_year_idx ON fiscal.yearly_income_aggregate USING btree (tenant_id, year_base, employee_id);

CREATE TRIGGER dctfweb_declaration_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dctfweb_declaration FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER dctfweb_declaration_touch_updated_at BEFORE UPDATE ON fiscal.dctfweb_declaration FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_touch_updated_at();

CREATE TRIGGER dctfweb_item_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dctfweb_item FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER efd_reinf_event_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.efd_reinf_event FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER efd_reinf_event_touch_updated_at BEFORE UPDATE ON fiscal.efd_reinf_event FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_touch_updated_at();

CREATE TRIGGER efd_reinf_item_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.efd_reinf_item FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER efd_reinf_totalizer_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.efd_reinf_totalizer FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER siafic_sync_batch_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.siafic_sync_batch FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER siafic_sync_batch_touch_updated_at BEFORE UPDATE ON fiscal.siafic_sync_batch FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_touch_updated_at();

CREATE TRIGGER siafic_sync_item_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.siafic_sync_item FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_audit();

CREATE TRIGGER siafic_sync_item_touch_updated_at BEFORE UPDATE ON fiscal.siafic_sync_item FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dctfweb_touch_updated_at();

CREATE TRIGGER dirf_arquivo_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dirf_arquivo FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

CREATE TRIGGER dirf_arquivo_touch_updated_at BEFORE UPDATE ON fiscal.dirf_arquivo FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_touch_updated_at();

CREATE TRIGGER dirf_beneficiario_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dirf_beneficiario FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

CREATE TRIGGER dirf_pagamento_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dirf_pagamento FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_dirf_audit();

CREATE TRIGGER gps_payment_code_touch_updated_at BEFORE UPDATE ON fiscal.gps_payment_code FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_touch_updated_at();

CREATE TRIGGER gps_remittance_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.gps_remittance FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_audit();

CREATE TRIGGER gps_remittance_touch_updated_at BEFORE UPDATE ON fiscal.gps_remittance FOR EACH ROW EXECUTE FUNCTION fiscal.sgp_gps_touch_updated_at();

ALTER TABLE ONLY fiscal.dctfweb_declaration
    ADD CONSTRAINT dctfweb_declaration_original_fk FOREIGN KEY (tenant_id, original_declaration_id) REFERENCES fiscal.dctfweb_declaration(tenant_id, id);

ALTER TABLE ONLY fiscal.dctfweb_declaration
    ADD CONSTRAINT dctfweb_declaration_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.dctfweb_item
    ADD CONSTRAINT dctfweb_item_declaration_fk FOREIGN KEY (tenant_id, declaracao_id) REFERENCES fiscal.dctfweb_declaration(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY fiscal.dctfweb_item
    ADD CONSTRAINT dctfweb_item_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.dctf_pgd_tax_debit
    ADD CONSTRAINT dctf_pgd_tax_debit_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.efd_reinf_event
    ADD CONSTRAINT efd_reinf_event_original_fk FOREIGN KEY (tenant_id, original_event_id) REFERENCES fiscal.efd_reinf_event(tenant_id, id);

ALTER TABLE ONLY fiscal.efd_reinf_event
    ADD CONSTRAINT efd_reinf_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.efd_reinf_item
    ADD CONSTRAINT efd_reinf_item_event_fk FOREIGN KEY (tenant_id, event_id) REFERENCES fiscal.efd_reinf_event(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY fiscal.efd_reinf_item
    ADD CONSTRAINT efd_reinf_item_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.efd_reinf_totalizer
    ADD CONSTRAINT efd_reinf_totalizer_event_fk FOREIGN KEY (tenant_id, source_event_id) REFERENCES fiscal.efd_reinf_event(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY fiscal.efd_reinf_totalizer
    ADD CONSTRAINT efd_reinf_totalizer_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.siafic_sync_batch
    ADD CONSTRAINT siafic_sync_batch_payroll_run_fk FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY fiscal.siafic_sync_batch
    ADD CONSTRAINT siafic_sync_batch_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.siafic_sync_item
    ADD CONSTRAINT siafic_sync_item_accounting_account_fk FOREIGN KEY (accounting_account_id) REFERENCES payroll.accounting_account(id) ON DELETE RESTRICT;

ALTER TABLE ONLY fiscal.siafic_sync_item
    ADD CONSTRAINT siafic_sync_item_batch_fk FOREIGN KEY (tenant_id, batch_id) REFERENCES fiscal.siafic_sync_batch(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY fiscal.siafic_sync_item
    ADD CONSTRAINT siafic_sync_item_source_line_fk FOREIGN KEY (source_line_id) REFERENCES payroll.employee_payroll_item(id) ON DELETE RESTRICT;

ALTER TABLE ONLY fiscal.siafic_sync_item
    ADD CONSTRAINT siafic_sync_item_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.dirf_arquivo
    ADD CONSTRAINT dirf_arquivo_original_fk FOREIGN KEY (tenant_id, original_arquivo_id) REFERENCES fiscal.dirf_arquivo(tenant_id, id);

ALTER TABLE ONLY fiscal.dirf_arquivo
    ADD CONSTRAINT dirf_arquivo_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.dirf_beneficiario
    ADD CONSTRAINT dirf_beneficiario_arquivo_fk FOREIGN KEY (tenant_id, dirf_arquivo_id) REFERENCES fiscal.dirf_arquivo(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY fiscal.dirf_beneficiario
    ADD CONSTRAINT dirf_beneficiario_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.dirf_pagamento
    ADD CONSTRAINT dirf_pagamento_beneficiario_fk FOREIGN KEY (tenant_id, dirf_beneficiario_id) REFERENCES fiscal.dirf_beneficiario(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY fiscal.dirf_pagamento
    ADD CONSTRAINT dirf_pagamento_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.gps_remittance
    ADD CONSTRAINT gps_remittance_payment_code_id_fkey FOREIGN KEY (payment_code_id) REFERENCES fiscal.gps_payment_code(id);

ALTER TABLE ONLY fiscal.gps_remittance
    ADD CONSTRAINT gps_remittance_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.yearly_income_aggregate
    ADD CONSTRAINT yearly_income_aggregate_employee_fk FOREIGN KEY (employee_id) REFERENCES hr.employee(id);

ALTER TABLE ONLY fiscal.yearly_income_aggregate
    ADD CONSTRAINT yearly_income_aggregate_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.yearly_income_aggregate FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.dctfweb_declaration FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.dctfweb_item FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.dctf_pgd_tax_debit FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.efd_reinf_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.efd_reinf_item FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.efd_reinf_totalizer FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.siafic_sync_batch FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY fiscal.siafic_sync_item FORCE ROW LEVEL SECURITY;

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

ALTER TABLE fiscal.dctf_pgd_tax_debit ENABLE ROW LEVEL SECURITY;

CREATE POLICY dctf_pgd_tax_debit_select ON fiscal.dctf_pgd_tax_debit FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text])));

CREATE POLICY dctf_pgd_tax_debit_write ON fiscal.dctf_pgd_tax_debit USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text])));

ALTER TABLE fiscal.efd_reinf_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY efd_reinf_event_select ON fiscal.efd_reinf_event FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text])));

CREATE POLICY efd_reinf_event_write ON fiscal.efd_reinf_event USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text])));

ALTER TABLE fiscal.efd_reinf_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY efd_reinf_item_select ON fiscal.efd_reinf_item FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text])));

CREATE POLICY efd_reinf_item_write ON fiscal.efd_reinf_item USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text])));

ALTER TABLE fiscal.efd_reinf_totalizer ENABLE ROW LEVEL SECURITY;

CREATE POLICY efd_reinf_totalizer_select ON fiscal.efd_reinf_totalizer FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text])));

CREATE POLICY efd_reinf_totalizer_write ON fiscal.efd_reinf_totalizer USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text])));

ALTER TABLE fiscal.siafic_sync_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY siafic_sync_batch_select ON fiscal.siafic_sync_batch FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text])));

CREATE POLICY siafic_sync_batch_write ON fiscal.siafic_sync_batch USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text])));

ALTER TABLE fiscal.siafic_sync_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY siafic_sync_item_select ON fiscal.siafic_sync_item FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.read'::text, 'fiscal.dctfweb.write'::text])));

CREATE POLICY siafic_sync_item_write ON fiscal.siafic_sync_item USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['fiscal.dctfweb.write'::text])));

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

COMMENT ON TABLE fiscal.gps_payment_code IS 'R4-72 global GPS payment-code reference catalog. Non-tenant-scoped: rows are statutory payment-code definitions shared by every tenant and contain no tenant data or PII.';
