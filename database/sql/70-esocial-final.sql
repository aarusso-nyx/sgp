CREATE VIEW esocial.v_competence_periodics_pending WITH (security_invoker='true') AS
 WITH run_workers AS (
         SELECT DISTINCT run.tenant_id,
            make_date(run.competence_year, run.competence_month, 1) AS competence,
            run.id AS payroll_run_id,
            item.employee_id,
                CASE
                    WHEN link.contract_type = ANY (ARRAY['statutory'::text, 'commissioned'::text]) THEN 'S-1202'::text
                    ELSE 'S-1200'::text
                END AS event_kind,
                CASE
                    WHEN link.contract_type = ANY (ARRAY['statutory'::text, 'commissioned'::text]) THEN 'missing_s1202_receipt'::text
                    ELSE 'missing_s1200_receipt'::text
                END AS reason
           FROM (payroll.payroll_run run
             JOIN payroll.employee_payroll_item item ON (((item.tenant_id = run.tenant_id) AND (item.payroll_run_id = run.id) AND (item.deleted_at IS NULL)))
             JOIN hr.employee employee ON (((employee.tenant_id = item.tenant_id) AND (employee.id = item.employee_id)))
             LEFT JOIN hr.employment_link link ON (((link.tenant_id = employee.tenant_id) AND (link.id = employee.employment_link_id))))
          WHERE (run.status = ANY (ARRAY['GENERATED'::public."PayrollRunStatus", 'APPROVED'::public."PayrollRunStatus", 'PAID'::public."PayrollRunStatus", 'CLOSED'::public."PayrollRunStatus"]))
        ), paid_workers AS (
         SELECT DISTINCT file.tenant_id,
            make_date(file.competence_year, file.competence_month, 1) AS competence,
            file.payroll_run_id,
            file.id AS payment_batch_id,
            detail.employee_id
           FROM (payroll.payment_remittance_file file
             JOIN payroll.payment_remittance_detail detail ON (((detail.tenant_id = file.tenant_id) AND (detail.file_id = file.id))))
          WHERE ((file.status = 'PAID'::public."PaymentRemittanceStatus") AND (COALESCE(NULLIF(detail.occurrence_code, ''::text), '00'::text) = ANY (ARRAY['0'::text, '00'::text, '000'::text])))
        )
 SELECT run_workers.tenant_id,
    run_workers.competence,
    run_workers.event_kind,
    run_workers.payroll_run_id,
    NULL::uuid AS payment_batch_id,
    run_workers.employee_id,
    run_workers.reason
   FROM run_workers
  WHERE (((run_workers.event_kind = 'S-1200'::text) AND (NOT (EXISTS ( SELECT 1
           FROM esocial.s1200_emission_state state
          WHERE ((state.tenant_id = run_workers.tenant_id) AND (state.payroll_run_id = run_workers.payroll_run_id) AND (state.employee_id = run_workers.employee_id) AND (NULLIF(btrim(state.recibo), ''::text) IS NOT NULL)))))) OR ((run_workers.event_kind = 'S-1202'::text) AND (NOT (EXISTS ( SELECT 1
           FROM esocial.s1202_emission_state state
          WHERE ((state.tenant_id = run_workers.tenant_id) AND (state.payroll_run_id = run_workers.payroll_run_id) AND (state.employee_id = run_workers.employee_id) AND (NULLIF(btrim(state.recibo), ''::text) IS NOT NULL)))))))
UNION ALL
 SELECT paid_workers.tenant_id,
    paid_workers.competence,
    'S-1210'::text AS event_kind,
    paid_workers.payroll_run_id,
    paid_workers.payment_batch_id,
    paid_workers.employee_id,
    'missing_s1210_receipt'::text AS reason
   FROM paid_workers
  WHERE (NOT (EXISTS ( SELECT 1
           FROM esocial.s1210_emission_state state
          WHERE ((state.tenant_id = paid_workers.tenant_id) AND (state.payment_batch_id = paid_workers.payment_batch_id) AND (state.employee_id = paid_workers.employee_id) AND (NULLIF(btrim(state.recibo), ''::text) IS NOT NULL)))));

CREATE VIEW esocial.v_event_failures AS
 SELECT event.tenant_id,
    event.id AS event_id,
    event.event_type,
    event.reference,
    event.competence,
    event.status,
    event.response_code,
    COALESCE(classification.description, event.response_description, event.last_error_message) AS translated_message,
    event.response_description,
    event.response_errors,
    event.last_response_at,
    event.retry_count,
    retry.attempt,
    retry.next_at,
    retry.last_error,
    event.created_at,
    event.updated_at
   FROM ((public.esocial_event event
     LEFT JOIN esocial.response_classification classification ON ((classification.response_code = event.response_code)))
     LEFT JOIN esocial.event_retry_schedule retry ON (((retry.tenant_id = event.tenant_id) AND (retry.event_id = event.id))))
  WHERE (event.status = ANY (ARRAY['PROCESSADO_COM_ERROS'::public."ESocialEventStatus", 'ERRO_TECNICO_RETENTAVEL'::public."ESocialEventStatus", 'ERRO_DEFINITIVO'::public."ESocialEventStatus"]));

CREATE INDEX endpoint_circuit_state_state_idx ON esocial.endpoint_circuit_state USING btree (state, opened_at);

CREATE INDEX esocial_totalizer_lookup_idx ON esocial.esocial_totalizer USING btree (tenant_id, competence, kind);

CREATE INDEX event_retry_schedule_due_idx ON esocial.event_retry_schedule USING btree (tenant_id, next_at, attempt);

CREATE INDEX s1200_emission_state_employee_idx ON esocial.s1200_emission_state USING btree (tenant_id, employee_id, emitted_at DESC);

CREATE INDEX s1202_emission_state_employee_idx ON esocial.s1202_emission_state USING btree (tenant_id, employee_id, emitted_at DESC);

CREATE INDEX s1210_emission_state_employee_idx ON esocial.s1210_emission_state USING btree (tenant_id, employee_id, emitted_at DESC);

CREATE INDEX s2205_pending_alteration_pending_idx ON esocial.s2205_pending_alteration USING btree (tenant_id, employee_id, status, created_at);

CREATE INDEX s2210_pending_tenant_enqueued_idx ON esocial.s2210_pending USING btree (tenant_id, enqueued_at);

CREATE INDEX s2220_pending_tenant_enqueued_idx ON esocial.s2220_pending USING btree (tenant_id, enqueued_at);

CREATE INDEX s2230_pending_tenant_status_idx ON esocial.s2230_pending USING btree (tenant_id, status, enqueued_at);

CREATE INDEX s2240_pending_tenant_enqueued_idx ON esocial.s2240_pending USING btree (tenant_id, enqueued_at);

CREATE UNIQUE INDEX s2298_event_order_key ON esocial.s2298_event USING btree (tenant_id, reintegration_order_id);

CREATE INDEX s2299_pending_tenant_status_idx ON esocial.s2299_pending USING btree (tenant_id, status, ready_at);

CREATE UNIQUE INDEX s2306_event_change_key ON esocial.s2306_event USING btree (tenant_id, tsv_contract_change_id);

CREATE INDEX s3000_request_status_idx ON esocial.s3000_request USING btree (tenant_id, status, requested_at DESC);

CREATE UNIQUE INDEX s3000_request_target_open_key ON esocial.s3000_request USING btree (tenant_id, target_event_id) WHERE (status = ANY (ARRAY['PENDING'::esocial.s3000_request_status, 'EMITTED'::esocial.s3000_request_status, 'ACCEPTED'::esocial.s3000_request_status]));

CREATE INDEX submission_batch_event_ids_gin_idx ON esocial.submission_batch USING gin (event_ids);

CREATE INDEX submission_batch_status_idx ON esocial.submission_batch USING btree (tenant_id, status, next_attempt_at, created_at);

CREATE UNIQUE INDEX tenant_certificate_active_alias_key ON esocial.tenant_certificate USING btree (tenant_id, lower(alias)) WHERE (status = 'ACTIVE'::esocial.certificate_status);

CREATE INDEX tenant_certificate_rotation_due_idx ON esocial.tenant_certificate USING btree (status, rotation_due_at);

CREATE INDEX tenant_certificate_valid_to_idx ON esocial.tenant_certificate USING btree (tenant_id, valid_to DESC);

CREATE INDEX xsd_validation_failure_event_kind_idx ON esocial.xsd_validation_failure USING btree (tenant_id, event_kind, occurred_at DESC);

CREATE TRIGGER audit_s2298_event_mutation AFTER INSERT OR DELETE OR UPDATE ON esocial.s2298_event FOR EACH ROW EXECUTE FUNCTION esocial.audit_s2298_event_mutation();

CREATE TRIGGER audit_s2306_event_mutation AFTER INSERT OR DELETE OR UPDATE ON esocial.s2306_event FOR EACH ROW EXECUTE FUNCTION esocial.audit_s2306_event_mutation();

CREATE TRIGGER es03_s2230_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2230_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es03_pending_audit();

CREATE TRIGGER es03_s2230_pending_touch_updated_at BEFORE UPDATE ON esocial.s2230_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_touch_updated_at();

CREATE TRIGGER es03_s2299_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2299_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es03_pending_audit();

CREATE TRIGGER es03_s2299_pending_touch_updated_at BEFORE UPDATE ON esocial.s2299_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_touch_updated_at();

CREATE TRIGGER es04_s1200_emission_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1200_emission_state FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es04_emission_state_audit();

CREATE TRIGGER es04_s1202_emission_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1202_emission_state FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es04_emission_state_audit();

CREATE TRIGGER es04_s1210_emission_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1210_emission_state FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es04_emission_state_audit();

CREATE TRIGGER s2210_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2210_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2210_pending_audit();

CREATE TRIGGER s2220_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2220_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2220_pending_audit();

CREATE TRIGGER s2240_pending_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s2240_pending FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2240_pending_audit();

CREATE TRIGGER s2240_pending_touch_updated_at BEFORE UPDATE ON esocial.s2240_pending FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER trg_endpoint_circuit_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.endpoint_circuit_state FOR EACH ROW EXECUTE FUNCTION esocial.audit_endpoint_circuit_state_mutation();

CREATE TRIGGER trg_esocial_totalizer_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.esocial_totalizer FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es05_state_totalizer_audit();

CREATE TRIGGER trg_event_retry_schedule_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.event_retry_schedule FOR EACH ROW EXECUTE FUNCTION esocial.audit_event_retry_schedule_mutation();

CREATE TRIGGER trg_s1299_emission_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1299_emission_state FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es05_state_totalizer_audit();

CREATE TRIGGER trg_s1xxx_dispatch_state_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s1xxx_dispatch_state FOR EACH ROW EXECUTE FUNCTION esocial.audit_s1xxx_dispatch_state_mutation();

CREATE TRIGGER trg_s3000_prepare_request BEFORE INSERT OR UPDATE OF target_event_id, target_recibo, target_event_kind, status ON esocial.s3000_request FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s3000_prepare_request();

CREATE TRIGGER trg_s3000_request_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.s3000_request FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s3000_request_audit();

CREATE TRIGGER trg_submission_batch_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.submission_batch FOR EACH ROW EXECUTE FUNCTION esocial.audit_submission_batch_mutation();

CREATE TRIGGER trg_tenant_certificate_audit AFTER INSERT OR DELETE OR UPDATE ON esocial.tenant_certificate FOR EACH ROW EXECUTE FUNCTION esocial.audit_tenant_certificate_mutation();

CREATE TRIGGER trg_xsd_validation_failure_audit AFTER INSERT ON esocial.xsd_validation_failure FOR EACH ROW EXECUTE FUNCTION esocial.audit_xsd_validation_failure_mutation();

ALTER TABLE ONLY esocial.esocial_totalizer
    ADD CONSTRAINT esocial_totalizer_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.event_retry_schedule
    ADD CONSTRAINT event_retry_schedule_event_fk FOREIGN KEY (event_id) REFERENCES public.esocial_event(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.event_retry_schedule
    ADD CONSTRAINT event_retry_schedule_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s1299_emission_state
    ADD CONSTRAINT s1299_emission_state_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s1299_emission_state
    ADD CONSTRAINT s1299_emission_state_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s1xxx_dispatch_state
    ADD CONSTRAINT s1xxx_dispatch_state_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2200_emission_state
    ADD CONSTRAINT s2200_emission_state_employee_fk FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2200_emission_state
    ADD CONSTRAINT s2200_emission_state_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_field_path_fkey FOREIGN KEY (field_path) REFERENCES esocial.s2205_trigger_field(field_path);

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2210_pending
    ADD CONSTRAINT s2210_pending_cat_emission_id_fkey FOREIGN KEY (cat_emission_id) REFERENCES saude.cat_emission(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2210_pending
    ADD CONSTRAINT s2210_pending_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2220_pending
    ADD CONSTRAINT s2220_pending_aso_record_id_fkey FOREIGN KEY (aso_record_id) REFERENCES saude.aso_record(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2220_pending
    ADD CONSTRAINT s2220_pending_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2230_pending
    ADD CONSTRAINT s2230_pending_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s2240_pending
    ADD CONSTRAINT s2240_pending_environmental_exposure_id_fkey FOREIGN KEY (environmental_exposure_id) REFERENCES saude.environmental_exposure(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2240_pending
    ADD CONSTRAINT s2240_pending_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2298_event
    ADD CONSTRAINT s2298_event_reintegration_order_id_fkey FOREIGN KEY (reintegration_order_id) REFERENCES hr.reintegration_order(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s2298_event
    ADD CONSTRAINT s2298_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2299_pending
    ADD CONSTRAINT s2299_pending_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s2306_event
    ADD CONSTRAINT s2306_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.s2306_event
    ADD CONSTRAINT s2306_event_tsv_contract_change_id_fkey FOREIGN KEY (tsv_contract_change_id) REFERENCES hr.tsv_contract_change(id) ON DELETE CASCADE;

ALTER TABLE ONLY esocial.s3000_request
    ADD CONSTRAINT s3000_request_emitted_event_id_fkey FOREIGN KEY (emitted_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s3000_request
    ADD CONSTRAINT s3000_request_target_event_fk FOREIGN KEY (target_event_id) REFERENCES public.esocial_event(id);

ALTER TABLE ONLY esocial.s3000_request
    ADD CONSTRAINT s3000_request_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.submission_batch
    ADD CONSTRAINT submission_batch_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.tenant_certificate
    ADD CONSTRAINT tenant_certificate_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.xsd_validation_failure
    ADD CONSTRAINT xsd_validation_failure_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY esocial.endpoint_circuit_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.esocial_totalizer FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.event_retry_schedule FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1200_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1202_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1210_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1299_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s1xxx_dispatch_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2200_emission_state FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2205_pending_alteration FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2210_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2220_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2230_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2240_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2298_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2299_pending FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s2306_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.s3000_request FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.submission_batch FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.tenant_certificate FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY esocial.xsd_validation_failure FORCE ROW LEVEL SECURITY;

ALTER TABLE esocial.endpoint_circuit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY endpoint_circuit_state_select ON esocial.endpoint_circuit_state FOR SELECT USING ((public.sgp_bypass_rls() OR public.sgp_has_any_permission(ARRAY['esocial.submission.read'::text, 'esocial.submission.retry'::text])));

CREATE POLICY endpoint_circuit_state_worker_write ON esocial.endpoint_circuit_state USING (public.sgp_bypass_rls()) WITH CHECK (public.sgp_bypass_rls());

ALTER TABLE esocial.esocial_totalizer ENABLE ROW LEVEL SECURITY;

CREATE POLICY esocial_totalizer_select ON esocial.esocial_totalizer FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY esocial_totalizer_write ON esocial.esocial_totalizer USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.event_retry_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_retry_schedule_select ON esocial.event_retry_schedule FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.retry'::text]))));

CREATE POLICY event_retry_schedule_write ON esocial.event_retry_schedule USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.retry'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.retry'::text]))));

CREATE POLICY p_s2230_pending_select ON esocial.s2230_pending FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY p_s2230_pending_write ON esocial.s2230_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

CREATE POLICY p_s2299_pending_select ON esocial.s2299_pending FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY p_s2299_pending_write ON esocial.s2299_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1200_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1200_emission_state_select ON esocial.s1200_emission_state FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s1200_emission_state_write ON esocial.s1200_emission_state USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1202_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1202_emission_state_select ON esocial.s1202_emission_state FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s1202_emission_state_write ON esocial.s1202_emission_state USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1210_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1210_emission_state_select ON esocial.s1210_emission_state FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s1210_emission_state_write ON esocial.s1210_emission_state USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1299_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1299_emission_state_select ON esocial.s1299_emission_state FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s1299_emission_state_write ON esocial.s1299_emission_state USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s1xxx_dispatch_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1xxx_dispatch_state_select ON esocial.s1xxx_dispatch_state FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text]))));

CREATE POLICY s1xxx_dispatch_state_write ON esocial.s1xxx_dispatch_state USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))));

ALTER TABLE esocial.s2200_emission_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2200_emission_state_select ON esocial.s2200_emission_state FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text]))));

CREATE POLICY s2200_emission_state_write ON esocial.s2200_emission_state USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))));

ALTER TABLE esocial.s2205_pending_alteration ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2205_pending_alteration_select ON esocial.s2205_pending_alteration FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text]))));

CREATE POLICY s2205_pending_alteration_write ON esocial.s2205_pending_alteration USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))));

ALTER TABLE esocial.s2210_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2210_pending_select ON esocial.s2210_pending FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.read'::text, 'saude.cat.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s2210_pending_write ON esocial.s2210_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.write'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.cat.write'::text, 'esocial.event.write'::text])));

ALTER TABLE esocial.s2220_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2220_pending_select ON esocial.s2220_pending FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s2220_pending_write ON esocial.s2220_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.write'::text])));

ALTER TABLE esocial.s2230_pending ENABLE ROW LEVEL SECURITY;

ALTER TABLE esocial.s2240_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2240_pending_rw ON esocial.s2240_pending USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.read'::text, 'saude.exposure.write'::text, 'saude.epi.read'::text, 'saude.epi.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.exposure.write'::text, 'esocial.event.write'::text])));

ALTER TABLE esocial.s2298_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2298_event_read ON esocial.s2298_event FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s2298_event_write ON esocial.s2298_event USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

ALTER TABLE esocial.s2299_pending ENABLE ROW LEVEL SECURITY;

ALTER TABLE esocial.s2306_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2306_event_read ON esocial.s2306_event FOR SELECT USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.read'::text, 'hr.employment.write'::text, 'esocial.event.read'::text, 'esocial.event.write'::text])));

CREATE POLICY s2306_event_write ON esocial.s2306_event USING ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.write'::text]))) WITH CHECK ((public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['hr.employment.write'::text, 'esocial.event.write'::text])));

ALTER TABLE esocial.s3000_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY s3000_request_select ON esocial.s3000_request FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.read'::text, 'esocial.event.exclude'::text]))));

CREATE POLICY s3000_request_write ON esocial.s3000_request USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.exclude'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.event.exclude'::text]))));

ALTER TABLE esocial.submission_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY submission_batch_select ON esocial.submission_batch FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.submission.read'::text, 'esocial.submission.retry'::text]))));

CREATE POLICY submission_batch_write ON esocial.submission_batch USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.submission.retry'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.submission.retry'::text]))));

ALTER TABLE esocial.tenant_certificate ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_certificate_select ON esocial.tenant_certificate FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.read'::text, 'esocial.certificate.write'::text]))));

CREATE POLICY tenant_certificate_write ON esocial.tenant_certificate USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'::text]))));

ALTER TABLE esocial.xsd_validation_failure ENABLE ROW LEVEL SECURITY;

CREATE POLICY xsd_validation_failure_select ON esocial.xsd_validation_failure FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.read'::text, 'esocial.certificate.write'::text]))));

CREATE POLICY xsd_validation_failure_write ON esocial.xsd_validation_failure USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['esocial.certificate.write'::text]))));

COMMENT ON TABLE esocial.response_classification IS 'R4-72 global eSocial response-code reference catalog. Non-tenant-scoped: rows are regulatory code classifications shared by every tenant and contain no tenant data or PII.';

COMMENT ON TABLE esocial.s2205_trigger_field IS 'R4-72 global eSocial S-2205 trigger-field whitelist. Non-tenant-scoped: rows are static regulatory field paths shared by every tenant and contain no tenant data or PII.';
