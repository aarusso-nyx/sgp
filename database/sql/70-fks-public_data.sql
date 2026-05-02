ALTER TABLE ONLY public_data.transparency_access_log
    ADD CONSTRAINT transparency_access_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY public_data.transparency_payroll_snapshot
    ADD CONSTRAINT transparency_payroll_snapshot_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY public_data.transparency_publish_event
    ADD CONSTRAINT transparency_publish_event_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public_data.transparency_publish_event
    ADD CONSTRAINT transparency_publish_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;
