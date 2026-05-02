CREATE INDEX endpoint_circuit_state_state_idx ON esocial.endpoint_circuit_state USING btree (state, opened_at);

CREATE INDEX esocial_totalizer_lookup_idx ON esocial.esocial_totalizer USING btree (tenant_id, competence, kind);

CREATE INDEX event_retry_schedule_due_idx ON esocial.event_retry_schedule USING btree (tenant_id, next_at, attempt);

CREATE INDEX s1200_emission_state_employee_idx ON esocial.s1200_emission_state USING btree (tenant_id, employee_id, emitted_at DESC);

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
