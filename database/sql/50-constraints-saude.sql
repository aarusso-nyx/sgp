ALTER TABLE ONLY saude.aso_attachment
    ADD CONSTRAINT aso_attachment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.aso_exam_item
    ADD CONSTRAINT aso_exam_item_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.aso_exam_item
    ADD CONSTRAINT aso_exam_item_record_exam_uq UNIQUE (aso_record_id, medical_exam_id);

ALTER TABLE ONLY saude.aso_record
    ADD CONSTRAINT aso_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.cat_emission
    ADD CONSTRAINT cat_emission_kind_accident_uq UNIQUE (tenant_id, work_accident_id, cat_kind);

ALTER TABLE ONLY saude.cat_emission
    ADD CONSTRAINT cat_emission_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.environmental_exposure
    ADD CONSTRAINT environmental_exposure_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.epi_delivery
    ADD CONSTRAINT epi_delivery_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.epi_inventory
    ADD CONSTRAINT epi_inventory_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.epi_inventory
    ADD CONSTRAINT epi_inventory_tenant_ca_uq UNIQUE (tenant_id, ca_number);

ALTER TABLE ONLY saude.health_program
    ADD CONSTRAINT health_program_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.medical_exam
    ADD CONSTRAINT medical_exam_code_tenant_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY saude.medical_exam
    ADD CONSTRAINT medical_exam_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.pcmso_required_exam
    ADD CONSTRAINT pcmso_required_exam_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.pcmso_required_exam
    ADD CONSTRAINT pcmso_required_exam_unique_uq UNIQUE (health_program_id, medical_exam_id, applies_to_role_id);

ALTER TABLE ONLY saude.ppp_record
    ADD CONSTRAINT ppp_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.program_revision
    ADD CONSTRAINT program_revision_parent_uq UNIQUE (tenant_id, parent_program_kind, parent_program_id, revision_number);

ALTER TABLE ONLY saude.program_revision
    ADD CONSTRAINT program_revision_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.risk_management_program
    ADD CONSTRAINT risk_management_program_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saude.work_accident
    ADD CONSTRAINT work_accident_pkey PRIMARY KEY (id);
