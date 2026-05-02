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
    aggregate.recomputed_at
   FROM ((((fiscal.yearly_income_aggregate aggregate
     JOIN hr.employee employee ON (((employee.id = aggregate.employee_id) AND (employee.tenant_id = aggregate.tenant_id))))
     LEFT JOIN hr.branch branch ON ((branch.id = employee.branch_id)))
     LEFT JOIN hr.company company ON ((company.id = branch.company_id)))
     LEFT JOIN hr.employment_link link ON ((link.id = employee.employment_link_id)))
  WHERE (public.sgp_tenant_matches(aggregate.tenant_id) AND (public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.read'::text, 'fiscal.yearly_income.write'::text, 'report.payslip.read'::text]) OR ((aggregate.employee_id = public.sgp_current_employee_id()) AND public.sgp_has_any_permission(ARRAY['portal.yearly_income.read'::text]))));
