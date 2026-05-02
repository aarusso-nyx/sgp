ALTER TABLE ONLY recrutamento.banca_membro
    ADD CONSTRAINT banca_membro_concurso_fk FOREIGN KEY (tenant_id, concurso_id) REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.biometric_consent
    ADD CONSTRAINT biometric_consent_candidato_fk FOREIGN KEY (tenant_id, candidato_id) REFERENCES recrutamento.candidato(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.biometric_match_attempt
    ADD CONSTRAINT biometric_match_attempt_candidato_fk FOREIGN KEY (tenant_id, candidato_id) REFERENCES recrutamento.candidato(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.biometric_match_attempt
    ADD CONSTRAINT biometric_match_attempt_exam_session_fk FOREIGN KEY (tenant_id, exam_session_id) REFERENCES recrutamento.online_exam_session(tenant_id, id) ON DELETE SET NULL (exam_session_id);

ALTER TABLE ONLY recrutamento.candidate_biometric
    ADD CONSTRAINT candidate_biometric_candidato_fk FOREIGN KEY (tenant_id, candidato_id) REFERENCES recrutamento.candidato(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.candidato
    ADD CONSTRAINT candidato_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.classificacao_item
    ADD CONSTRAINT classificacao_item_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id) REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.classificacao_item
    ADD CONSTRAINT classificacao_item_snapshot_fk FOREIGN KEY (tenant_id, snapshot_id) REFERENCES recrutamento.classificacao_snapshot(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.classificacao_item
    ADD CONSTRAINT classificacao_item_vaga_fk FOREIGN KEY (tenant_id, vaga_id) REFERENCES hr.job_position(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.classificacao_snapshot
    ADD CONSTRAINT classificacao_snapshot_concurso_fk FOREIGN KEY (tenant_id, concurso_id) REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.concurso
    ADD CONSTRAINT concurso_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.convocacao
    ADD CONSTRAINT convocacao_nomeacao_fk FOREIGN KEY (tenant_id, nomeacao_id) REFERENCES recrutamento.nomeacao(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.document_signature
    ADD CONSTRAINT document_signature_document_fk FOREIGN KEY (tenant_id, document_id) REFERENCES recrutamento.signed_document(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.document_signature
    ADD CONSTRAINT document_signature_membro_fk FOREIGN KEY (tenant_id, banca_membro_id) REFERENCES recrutamento.banca_membro(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.edital
    ADD CONSTRAINT edital_concurso_fk FOREIGN KEY (tenant_id, concurso_id) REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.gabarito
    ADD CONSTRAINT gabarito_prova_fk FOREIGN KEY (tenant_id, prova_id) REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.inscricao
    ADD CONSTRAINT inscricao_candidato_fk FOREIGN KEY (tenant_id, candidato_id) REFERENCES recrutamento.candidato(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.inscricao
    ADD CONSTRAINT inscricao_concurso_fk FOREIGN KEY (tenant_id, concurso_id) REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.inscricao
    ADD CONSTRAINT inscricao_payment_charge_fk FOREIGN KEY (tenant_id, payment_charge_id) REFERENCES recrutamento.payment_charge(tenant_id, id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY recrutamento.inscricao
    ADD CONSTRAINT inscricao_vaga_fk FOREIGN KEY (tenant_id, concurso_id, vaga_id) REFERENCES recrutamento.vaga(tenant_id, concurso_id, position_id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.nomeacao
    ADD CONSTRAINT nomeacao_concurso_fk FOREIGN KEY (tenant_id, concurso_id) REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.nomeacao
    ADD CONSTRAINT nomeacao_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id) REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.nomeacao
    ADD CONSTRAINT nomeacao_vaga_fk FOREIGN KEY (tenant_id, concurso_id, vaga_id) REFERENCES recrutamento.vaga(tenant_id, concurso_id, position_id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.nota
    ADD CONSTRAINT nota_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id) REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.nota
    ADD CONSTRAINT nota_prova_fk FOREIGN KEY (tenant_id, prova_id) REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.online_exam_session
    ADD CONSTRAINT online_exam_session_application_fk FOREIGN KEY (tenant_id, application_id) REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.online_exam_session
    ADD CONSTRAINT online_exam_session_prova_fk FOREIGN KEY (tenant_id, prova_id) REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.payment_charge
    ADD CONSTRAINT payment_charge_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id) REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_employee_fk FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_lotacao_fk FOREIGN KEY (lotacao_id) REFERENCES hr.work_location(id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_nomeacao_fk FOREIGN KEY (tenant_id, nomeacao_id) REFERENCES recrutamento.nomeacao(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE ONLY recrutamento.proctoring_artifact
    ADD CONSTRAINT proctoring_artifact_session_fk FOREIGN KEY (tenant_id, session_id) REFERENCES recrutamento.online_exam_session(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.proctoring_event
    ADD CONSTRAINT proctoring_event_session_fk FOREIGN KEY (tenant_id, session_id) REFERENCES recrutamento.online_exam_session(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.prova
    ADD CONSTRAINT prova_concurso_fk FOREIGN KEY (tenant_id, concurso_id) REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.questao
    ADD CONSTRAINT questao_prova_fk FOREIGN KEY (tenant_id, prova_id) REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.recurso
    ADD CONSTRAINT recurso_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id) REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.recurso
    ADD CONSTRAINT recurso_prova_fk FOREIGN KEY (tenant_id, prova_id) REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.recurso
    ADD CONSTRAINT recurso_questao_fk FOREIGN KEY (tenant_id, questao_id) REFERENCES recrutamento.questao(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.resposta_candidato
    ADD CONSTRAINT resposta_candidato_inscricao_fk FOREIGN KEY (tenant_id, inscricao_id) REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.resposta_candidato
    ADD CONSTRAINT resposta_candidato_prova_fk FOREIGN KEY (tenant_id, prova_id) REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.resposta_candidato
    ADD CONSTRAINT resposta_candidato_questao_fk FOREIGN KEY (tenant_id, questao_id) REFERENCES recrutamento.questao(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.signed_document
    ADD CONSTRAINT signed_document_concurso_fk FOREIGN KEY (tenant_id, concurso_id) REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.vaga
    ADD CONSTRAINT vaga_concurso_fk FOREIGN KEY (tenant_id, concurso_id) REFERENCES recrutamento.concurso(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE ONLY recrutamento.vaga
    ADD CONSTRAINT vaga_position_fk FOREIGN KEY (tenant_id, position_id) REFERENCES hr.job_position(tenant_id, id) ON DELETE RESTRICT;
