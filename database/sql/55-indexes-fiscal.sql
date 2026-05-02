CREATE INDEX dctfweb_declaration_competence_idx ON fiscal.dctfweb_declaration USING btree (tenant_id, competence, status);

CREATE UNIQUE INDEX dctfweb_declaration_original_uq ON fiscal.dctfweb_declaration USING btree (tenant_id, competence) WHERE (kind = 'ORIGINAL'::fiscal.dctfweb_declaration_kind);

CREATE INDEX dctfweb_item_declaration_idx ON fiscal.dctfweb_item USING btree (tenant_id, declaracao_id, source_event);

CREATE UNIQUE INDEX dirf_arquivo_original_uq ON fiscal.dirf_arquivo USING btree (tenant_id, year_base) WHERE (kind = 'ORIGINAL'::fiscal.dirf_arquivo_kind);

CREATE INDEX dirf_arquivo_year_idx ON fiscal.dirf_arquivo USING btree (tenant_id, year_base, status);

CREATE UNIQUE INDEX dirf_beneficiario_document_uq ON fiscal.dirf_beneficiario USING btree (tenant_id, dirf_arquivo_id, cpf_cnpj);

CREATE INDEX dirf_pagamento_beneficiario_idx ON fiscal.dirf_pagamento USING btree (tenant_id, dirf_beneficiario_id, code, month_year);

CREATE UNIQUE INDEX gps_remittance_competence_code_uq ON fiscal.gps_remittance USING btree (tenant_id, competence, payment_code_id);

CREATE INDEX gps_remittance_reason_status_idx ON fiscal.gps_remittance USING btree (tenant_id, reason, status, competence DESC);

CREATE INDEX yearly_income_aggregate_year_idx ON fiscal.yearly_income_aggregate USING btree (tenant_id, year_base, employee_id);
