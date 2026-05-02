CREATE INDEX consignment_entity_status_idx ON payment.consignment_entity USING btree (tenant_id, status);

CREATE INDEX consignment_loan_employee_status_idx ON payment.consignment_loan USING btree (tenant_id, employee_id, status, valid_from, valid_to);

CREATE INDEX consignment_loan_entity_idx ON payment.consignment_loan USING btree (tenant_id, consignment_entity_id);

CREATE UNIQUE INDEX consignment_loan_transfer_from_uq ON payment.consignment_loan USING btree (tenant_id, transferred_from_loan_id) WHERE (transferred_from_loan_id IS NOT NULL);

CREATE UNIQUE INDEX consignment_loan_transfer_to_uq ON payment.consignment_loan USING btree (tenant_id, transferred_to_loan_id) WHERE (transferred_to_loan_id IS NOT NULL);

CREATE UNIQUE INDEX consignment_margin_view_uq ON payment.consignment_margin_view USING btree (tenant_id, employee_id, reference_competence);

CREATE INDEX consignment_portability_detail_status_idx ON payment.consignment_portability_detail USING btree (tenant_id, file_id, internal_status);

CREATE INDEX consignment_portability_file_status_idx ON payment.consignment_portability_file USING btree (tenant_id, status, received_at DESC);

CREATE INDEX dirf_payment_source_year_idx ON payment.dirf_payment_source USING btree (tenant_id, year_base, beneficiary_document, revenue_code);

CREATE INDEX fgts_account_employee_idx ON payment.fgts_account USING btree (tenant_id, employee_id, status);

CREATE UNIQUE INDEX fgts_caixa_adapter_active_uq ON payment.fgts_caixa_adapter USING btree (tenant_id) WHERE active;

CREATE INDEX fgts_grf_run_idx ON payment.fgts_grf USING btree (tenant_id, payroll_run_id);

CREATE INDEX fgts_grrf_link_idx ON payment.fgts_grrf USING btree (tenant_id, employment_link_id, termination_date);

CREATE INDEX fgts_movement_account_competence_idx ON payment.fgts_movement USING btree (tenant_id, fgts_account_id, competence);

CREATE UNIQUE INDEX fgts_movement_manual_idempotency_uq ON payment.fgts_movement USING btree (tenant_id, fgts_account_id, competence, kind, source_event) WHERE (payroll_run_id IS NULL);

CREATE UNIQUE INDEX fgts_movement_run_idempotency_uq ON payment.fgts_movement USING btree (tenant_id, fgts_account_id, competence, kind, source_event, payroll_run_id) WHERE (payroll_run_id IS NOT NULL);

CREATE INDEX fgts_remittance_tenant_competence_idx ON payment.fgts_remittance USING btree (tenant_id, competence, kind, status);

CREATE INDEX pis_pasep_base_year_year_idx ON payment.pis_pasep_base_year USING btree (tenant_id, year_base, program);

CREATE INDEX prior_notice_tenant_kind_idx ON payment.prior_notice USING btree (tenant_id, kind);
