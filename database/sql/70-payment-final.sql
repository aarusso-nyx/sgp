CREATE MATERIALIZED VIEW payment.consignment_margin_view AS
 WITH parameters AS (
         SELECT system_parameter.tenant_id,
            max((system_parameter.value)::numeric) FILTER (WHERE (system_parameter.key = 'consignment.margin.general_pct'::text)) AS general_pct,
            max((system_parameter.value)::numeric) FILTER (WHERE (system_parameter.key = 'consignment.margin.credit_card_pct'::text)) AS credit_card_pct,
            max((system_parameter.value)::numeric) FILTER (WHERE (system_parameter.key = 'consignment.margin.benefit_card_pct'::text)) AS benefit_card_pct
           FROM public.system_parameter
          WHERE (system_parameter.key = ANY (ARRAY['consignment.margin.general_pct'::text, 'consignment.margin.credit_card_pct'::text, 'consignment.margin.benefit_card_pct'::text]))
          GROUP BY system_parameter.tenant_id
        ), base AS (
         SELECT DISTINCT ON (record.tenant_id, record.employee_id, record.competence_year, record.competence_month) record.tenant_id,
            record.employee_id,
            make_date(record.competence_year, record.competence_month, 1) AS reference_competence,
            (record.net_amount)::numeric(14,2) AS net_base
           FROM payroll.payroll_financial_record record
          ORDER BY record.tenant_id, record.employee_id, record.competence_year, record.competence_month, record.generated_at DESC
        ), used AS (
         SELECT loan.tenant_id,
            loan.employee_id,
            base_1.reference_competence,
            (sum(
                CASE
                    WHEN (loan.kind = 'PAYROLL_LOAN'::payment.consignment_loan_kind) THEN loan.monthly_amount
                    ELSE (0)::numeric
                END))::numeric(14,2) AS used_general,
            (sum(
                CASE
                    WHEN (loan.kind = 'CARD'::payment.consignment_loan_kind) THEN loan.monthly_amount
                    ELSE (0)::numeric
                END))::numeric(14,2) AS used_credit_card,
            (sum(
                CASE
                    WHEN (loan.kind = 'OTHER'::payment.consignment_loan_kind) THEN loan.monthly_amount
                    ELSE (0)::numeric
                END))::numeric(14,2) AS used_benefit_card
           FROM (payment.consignment_loan loan
             JOIN base base_1 ON (((base_1.tenant_id = loan.tenant_id) AND (base_1.employee_id = loan.employee_id) AND ((base_1.reference_competence >= (date_trunc('month'::text, (loan.valid_from)::timestamp with time zone))::date) AND (base_1.reference_competence <= (date_trunc('month'::text, (loan.valid_to)::timestamp with time zone))::date)))))
          WHERE (loan.status = 'ACTIVE'::payment.consignment_loan_status)
          GROUP BY loan.tenant_id, loan.employee_id, base_1.reference_competence
        )
 SELECT base.tenant_id,
    base.employee_id,
    base.reference_competence,
    base.net_base,
    (GREATEST((round((base.net_base * COALESCE(parameters.general_pct, 0.35)), 2) - COALESCE(used.used_general, (0)::numeric)), (0)::numeric))::numeric(14,2) AS available_general,
    (GREATEST((round((base.net_base * COALESCE(parameters.credit_card_pct, 0.05)), 2) - COALESCE(used.used_credit_card, (0)::numeric)), (0)::numeric))::numeric(14,2) AS available_credit_card,
    (GREATEST((round((base.net_base * COALESCE(parameters.benefit_card_pct, 0.05)), 2) - COALESCE(used.used_benefit_card, (0)::numeric)), (0)::numeric))::numeric(14,2) AS available_benefit_card,
    (COALESCE(used.used_general, (0)::numeric))::numeric(14,2) AS used_general,
    (COALESCE(used.used_credit_card, (0)::numeric))::numeric(14,2) AS used_credit_card,
    (COALESCE(used.used_benefit_card, (0)::numeric))::numeric(14,2) AS used_benefit_card
   FROM ((base
     LEFT JOIN parameters ON ((parameters.tenant_id = base.tenant_id)))
     LEFT JOIN used ON (((used.tenant_id = base.tenant_id) AND (used.employee_id = base.employee_id) AND (used.reference_competence = base.reference_competence))))
  WITH NO DATA;

CREATE VIEW payment.v_fgts_balance WITH (security_invoker='true') AS
 SELECT account.tenant_id,
    account.fgts_account_id,
    account.employee_id,
    account.employment_link_id,
    account.status,
    account.opened_at,
    account.closed_at,
    (COALESCE(sum(movement.amount) FILTER (WHERE (movement.kind = ANY (ARRAY['DEPOSIT_8'::payment.fgts_movement_kind, 'DEPOSIT_AVISO'::payment.fgts_movement_kind, 'ADJUSTMENT'::payment.fgts_movement_kind]))), (0)::numeric))::numeric(14,2) AS deposit_balance,
    (COALESCE(sum(movement.amount) FILTER (WHERE (movement.kind = 'RESCISION_FINE_40'::payment.fgts_movement_kind)), (0)::numeric))::numeric(14,2) AS rescission_fine_total,
    (count(movement.fgts_movement_id))::integer AS movement_count,
    max(movement.created_at) AS latest_movement_at
   FROM (payment.fgts_account account
     LEFT JOIN payment.fgts_movement movement ON (((movement.tenant_id = account.tenant_id) AND (movement.fgts_account_id = account.fgts_account_id))))
  WHERE (public.sgp_tenant_matches(account.tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text]))
  GROUP BY account.tenant_id, account.fgts_account_id, account.employee_id, account.employment_link_id, account.status, account.opened_at, account.closed_at;

CREATE VIEW payment.v_pis_pasep_year WITH (security_invoker='true') AS
 SELECT base.tenant_id,
    base.employee_id,
    employee.registration,
    employee.name AS employee_name,
    employee.cpf,
    base.year_base,
    (base.program)::text AS program,
    base.monthly_base,
    base.total_base,
    base.updated_at
   FROM (payment.pis_pasep_base_year base
     JOIN hr.employee employee ON (((employee.tenant_id = base.tenant_id) AND (employee.id = base.employee_id))))
  WHERE (public.sgp_tenant_matches(base.tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read'::text, 'payroll.payroll.write'::text]));

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

ALTER TABLE ONLY payment.consignment_entity
    ADD CONSTRAINT consignment_entity_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_employee_fk FOREIGN KEY (tenant_id, employee_id) REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_entity_fk FOREIGN KEY (tenant_id, consignment_entity_id) REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_transferred_from_fk FOREIGN KEY (tenant_id, transferred_from_loan_id) REFERENCES payment.consignment_loan(tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_transferred_to_fk FOREIGN KEY (tenant_id, transferred_to_loan_id) REFERENCES payment.consignment_loan(tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_portability_detail
    ADD CONSTRAINT consignment_portability_detail_created_fk FOREIGN KEY (tenant_id, created_loan_id) REFERENCES payment.consignment_loan(tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_portability_detail
    ADD CONSTRAINT consignment_portability_detail_file_fk FOREIGN KEY (tenant_id, file_id) REFERENCES payment.consignment_portability_file(tenant_id, file_id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.consignment_portability_detail
    ADD CONSTRAINT consignment_portability_detail_matched_fk FOREIGN KEY (tenant_id, matched_loan_id) REFERENCES payment.consignment_loan(tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_portability_file
    ADD CONSTRAINT consignment_portability_file_source_fk FOREIGN KEY (tenant_id, source_consignment_entity_id) REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id);

ALTER TABLE ONLY payment.consignment_portability_file
    ADD CONSTRAINT consignment_portability_file_target_fk FOREIGN KEY (tenant_id, target_consignment_entity_id) REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id);

ALTER TABLE ONLY payment.consignment_portability_file
    ADD CONSTRAINT consignment_portability_file_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.dirf_payment_source
    ADD CONSTRAINT dirf_payment_source_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_employee_fk FOREIGN KEY (tenant_id, employee_id) REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id) REFERENCES hr.employment_link(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_caixa_adapter
    ADD CONSTRAINT fgts_caixa_adapter_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_fgts_remittance_id_fkey FOREIGN KEY (fgts_remittance_id) REFERENCES payment.fgts_remittance(id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id) REFERENCES hr.employment_link(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_fgts_remittance_id_fkey FOREIGN KEY (fgts_remittance_id) REFERENCES payment.fgts_remittance(id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_movement
    ADD CONSTRAINT fgts_movement_account_fk FOREIGN KEY (tenant_id, fgts_account_id) REFERENCES payment.fgts_account(tenant_id, fgts_account_id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.fgts_movement
    ADD CONSTRAINT fgts_movement_payroll_run_fk FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE SET NULL;

ALTER TABLE ONLY payment.fgts_movement
    ADD CONSTRAINT fgts_movement_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.fgts_remittance
    ADD CONSTRAINT fgts_remittance_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.pis_pasep_base_year
    ADD CONSTRAINT pis_pasep_base_year_employee_fk FOREIGN KEY (tenant_id, employee_id) REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.pis_pasep_base_year
    ADD CONSTRAINT pis_pasep_base_year_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY payment.prior_notice
    ADD CONSTRAINT prior_notice_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id) REFERENCES hr.employment_link(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY payment.prior_notice
    ADD CONSTRAINT prior_notice_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

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
