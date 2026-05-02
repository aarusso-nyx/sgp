ALTER TABLE ONLY tce.adapter_lifecycle_event
    ADD CONSTRAINT adapter_lifecycle_event_adapter_fk FOREIGN KEY (adapter_id) REFERENCES tce.adapter_registry(adapter_id) ON DELETE CASCADE;

ALTER TABLE ONLY tce.layout_field
    ADD CONSTRAINT layout_field_layout_version_id_fkey FOREIGN KEY (layout_version_id) REFERENCES tce.layout_version(id) ON DELETE CASCADE;

ALTER TABLE ONLY tce.layout_version
    ADD CONSTRAINT layout_version_state_id_fkey FOREIGN KEY (state_id) REFERENCES tce.state(id) ON DELETE RESTRICT;

ALTER TABLE ONLY tce.state
    ADD CONSTRAINT state_parent_fk FOREIGN KEY (parent_state_code) REFERENCES tce.state(code);

ALTER TABLE ONLY tce.submission_attempt
    ADD CONSTRAINT submission_attempt_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES tce.submission_queue(id) ON DELETE CASCADE;

ALTER TABLE ONLY tce.submission
    ADD CONSTRAINT submission_layout_version_id_fkey FOREIGN KEY (layout_version_id) REFERENCES tce.layout_version(id) ON DELETE RESTRICT;

ALTER TABLE ONLY tce.submission
    ADD CONSTRAINT submission_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY tce.submission_queue
    ADD CONSTRAINT submission_queue_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES tce.submission(id) ON DELETE CASCADE;
