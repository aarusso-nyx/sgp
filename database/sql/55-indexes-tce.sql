CREATE INDEX adapter_lifecycle_event_adapter_time_idx ON tce.adapter_lifecycle_event USING btree (adapter_id, occurred_at DESC);

CREATE INDEX adapter_registry_state_organ_idx ON tce.adapter_registry USING btree (state_code, organ_kind, status);

CREATE INDEX layout_field_version_order_idx ON tce.layout_field USING btree (layout_version_id, ordering, field_path);

CREATE INDEX layout_version_state_system_idx ON tce.layout_version USING btree (state_id, system_name, status, effective_from);

CREATE INDEX submission_adapter_status_idx ON tce.submission USING btree (adapter_id, status);

CREATE INDEX submission_attempt_queue_idx ON tce.submission_attempt USING btree (queue_id, started_at DESC);

CREATE INDEX submission_payroll_run_idx ON tce.submission USING btree (payroll_run_id);

CREATE INDEX submission_queue_claim_idx ON tce.submission_queue USING btree (status, next_attempt_at);

CREATE INDEX submission_queue_submission_idx ON tce.submission_queue USING btree (submission_id);

CREATE INDEX submission_queue_tenant_adapter_idx ON tce.submission_queue USING btree (tenant_id, adapter_id, created_at DESC);

CREATE INDEX submission_tenant_competence_idx ON tce.submission USING btree (tenant_id, competence_year DESC, competence_month DESC);
