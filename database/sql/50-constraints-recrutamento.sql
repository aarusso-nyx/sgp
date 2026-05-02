ALTER TABLE ONLY recrutamento.banca_membro
    ADD CONSTRAINT banca_membro_cpf_uq UNIQUE (tenant_id, concurso_id, cpf);

ALTER TABLE ONLY recrutamento.banca_membro
    ADD CONSTRAINT banca_membro_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.biometric_consent
    ADD CONSTRAINT biometric_consent_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.biometric_match_attempt
    ADD CONSTRAINT biometric_match_attempt_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.candidate_biometric
    ADD CONSTRAINT candidate_biometric_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.candidato
    ADD CONSTRAINT candidato_cpf_uq UNIQUE (tenant_id, cpf);

ALTER TABLE ONLY recrutamento.candidato
    ADD CONSTRAINT candidato_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.classificacao_item
    ADD CONSTRAINT classificacao_item_pkey PRIMARY KEY (tenant_id, snapshot_id, vaga_id, inscricao_id);

ALTER TABLE ONLY recrutamento.classificacao_snapshot
    ADD CONSTRAINT classificacao_snapshot_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.classificacao_snapshot
    ADD CONSTRAINT classificacao_snapshot_tenant_id_id_concurso_id_uq UNIQUE (tenant_id, id, concurso_id);

ALTER TABLE ONLY recrutamento.concurso
    ADD CONSTRAINT concurso_code_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY recrutamento.concurso
    ADD CONSTRAINT concurso_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.convocacao
    ADD CONSTRAINT convocacao_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.document_signature
    ADD CONSTRAINT document_signature_membro_uq UNIQUE (tenant_id, document_id, banca_membro_id);

ALTER TABLE ONLY recrutamento.document_signature
    ADD CONSTRAINT document_signature_order_uq UNIQUE (tenant_id, document_id, signature_order);

ALTER TABLE ONLY recrutamento.document_signature
    ADD CONSTRAINT document_signature_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.edital
    ADD CONSTRAINT edital_pkey PRIMARY KEY (tenant_id, concurso_id, version);

ALTER TABLE ONLY recrutamento.gabarito
    ADD CONSTRAINT gabarito_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.gabarito
    ADD CONSTRAINT gabarito_version_uq UNIQUE (tenant_id, prova_id, version);

ALTER TABLE ONLY recrutamento.inscricao
    ADD CONSTRAINT inscricao_candidate_vaga_uq UNIQUE (tenant_id, concurso_id, vaga_id, candidato_id);

ALTER TABLE ONLY recrutamento.inscricao
    ADD CONSTRAINT inscricao_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.nomeacao
    ADD CONSTRAINT nomeacao_inscricao_uq UNIQUE (tenant_id, inscricao_id);

ALTER TABLE ONLY recrutamento.nomeacao
    ADD CONSTRAINT nomeacao_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.nota
    ADD CONSTRAINT nota_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.nota
    ADD CONSTRAINT nota_uq UNIQUE (tenant_id, inscricao_id, prova_id);

ALTER TABLE ONLY recrutamento.online_exam_session
    ADD CONSTRAINT online_exam_session_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.payment_charge
    ADD CONSTRAINT payment_charge_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_employee_uq UNIQUE (tenant_id, employee_id);

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_nomeacao_uq UNIQUE (tenant_id, nomeacao_id);

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.proctoring_artifact
    ADD CONSTRAINT proctoring_artifact_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.proctoring_event
    ADD CONSTRAINT proctoring_event_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.prova
    ADD CONSTRAINT prova_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.questao
    ADD CONSTRAINT questao_number_uq UNIQUE (tenant_id, prova_id, number);

ALTER TABLE ONLY recrutamento.questao
    ADD CONSTRAINT questao_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.recurso
    ADD CONSTRAINT recurso_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.resposta_candidato
    ADD CONSTRAINT resposta_candidato_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.resposta_candidato
    ADD CONSTRAINT resposta_candidato_uq UNIQUE (tenant_id, inscricao_id, prova_id, questao_id);

ALTER TABLE ONLY recrutamento.signed_document
    ADD CONSTRAINT signed_document_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.signed_document
    ADD CONSTRAINT signed_document_token_uq UNIQUE (public_verify_token);

ALTER TABLE ONLY recrutamento.vaga
    ADD CONSTRAINT vaga_pkey PRIMARY KEY (tenant_id, concurso_id, position_id);
