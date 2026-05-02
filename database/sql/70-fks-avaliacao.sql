ALTER TABLE ONLY avaliacao.career_plan_job_position
    ADD CONSTRAINT career_plan_job_position_career_plan_id_fkey FOREIGN KEY (career_plan_id) REFERENCES avaliacao.career_plan(id) ON DELETE CASCADE;

ALTER TABLE ONLY avaliacao.career_plan_job_position
    ADD CONSTRAINT career_plan_job_position_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES hr.job_position(id) ON DELETE RESTRICT;

ALTER TABLE ONLY avaliacao.career_plan_job_position
    ADD CONSTRAINT career_plan_job_position_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);

ALTER TABLE ONLY avaliacao.career_plan
    ADD CONSTRAINT career_plan_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id);
