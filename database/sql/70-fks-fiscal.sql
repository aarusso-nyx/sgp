ALTER TABLE ONLY fiscal.dctfweb_declaration
    ADD CONSTRAINT dctfweb_declaration_original_fk FOREIGN KEY (tenant_id, original_declaration_id) REFERENCES fiscal.dctfweb_declaration(tenant_id, id);

ALTER TABLE ONLY fiscal.dctfweb_declaration
    ADD CONSTRAINT dctfweb_declaration_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY fiscal.dctfweb_item
    ADD CONSTRAINT dctfweb_item_declaration_fk FOREIGN KEY (tenant_id, declaracao_id) REFERENCES fiscal.dctfweb_declaration(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY fiscal.dctfweb_item
    ADD CONSTRAINT dctfweb_item_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

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
