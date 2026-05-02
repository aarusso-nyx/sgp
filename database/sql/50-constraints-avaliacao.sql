ALTER TABLE ONLY avaliacao.career_plan_job_position
    ADD CONSTRAINT career_plan_job_position_pkey PRIMARY KEY (career_plan_id, job_position_id);

ALTER TABLE ONLY avaliacao.career_plan
    ADD CONSTRAINT career_plan_pkey PRIMARY KEY (id);
