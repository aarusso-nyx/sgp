CREATE INDEX aso_attachment_record_idx ON saude.aso_attachment USING btree (tenant_id, aso_record_id);

CREATE INDEX aso_exam_item_record_idx ON saude.aso_exam_item USING btree (tenant_id, aso_record_id);

CREATE INDEX aso_record_employee_due_idx ON saude.aso_record USING btree (tenant_id, employee_id, next_exam_due_at);

CREATE INDEX aso_record_s2220_missing_idx ON saude.aso_record USING btree (tenant_id, status, s2220_event_id) WHERE (status = 'ARCHIVED'::saude.aso_status);

CREATE INDEX aso_record_status_due_idx ON saude.aso_record USING btree (tenant_id, status, next_exam_due_at);

CREATE INDEX cat_emission_deadline_idx ON saude.cat_emission USING btree (tenant_id, deadline_at, esocial_event_id);

CREATE INDEX environmental_exposure_employee_period_idx ON saude.environmental_exposure USING btree (tenant_id, employee_id, exposure_start, exposure_end);

CREATE INDEX environmental_exposure_pgr_idx ON saude.environmental_exposure USING btree (tenant_id, risk_management_program_id);

CREATE INDEX epi_delivery_employee_idx ON saude.epi_delivery USING btree (tenant_id, employee_id, delivered_at DESC);

CREATE INDEX health_program_location_status_idx ON saude.health_program USING btree (tenant_id, work_location_id, status);

CREATE UNIQUE INDEX health_program_one_active_idx ON saude.health_program USING btree (tenant_id, work_location_id, kind) WHERE (status = 'ACTIVE'::saude.program_status);

CREATE INDEX medical_exam_active_idx ON saude.medical_exam USING btree (tenant_id, active);

CREATE INDEX pcmso_required_exam_program_idx ON saude.pcmso_required_exam USING btree (tenant_id, health_program_id);

CREATE INDEX ppp_record_employee_period_idx ON saude.ppp_record USING btree (tenant_id, employee_id, period_start, period_end);

CREATE INDEX program_revision_parent_idx ON saude.program_revision USING btree (tenant_id, parent_program_kind, parent_program_id, revision_number DESC);

CREATE INDEX risk_management_program_location_status_idx ON saude.risk_management_program USING btree (tenant_id, work_location_id, status);

CREATE UNIQUE INDEX risk_management_program_one_active_idx ON saude.risk_management_program USING btree (tenant_id, work_location_id, kind) WHERE (status = 'ACTIVE'::saude.program_status);

CREATE INDEX work_accident_employee_status_idx ON saude.work_accident USING btree (tenant_id, employee_id, status, accident_at DESC);
