CREATE INDEX banca_membro_concurso_idx ON recrutamento.banca_membro USING btree (tenant_id, concurso_id, active);

CREATE INDEX biometric_consent_active_idx ON recrutamento.biometric_consent USING btree (tenant_id, candidato_id, consent_at DESC) WHERE (withdrawn_at IS NULL);

CREATE INDEX biometric_match_attempt_candidate_idx ON recrutamento.biometric_match_attempt USING btree (tenant_id, candidato_id, occurred_at DESC);

CREATE INDEX candidate_biometric_candidate_kind_idx ON recrutamento.candidate_biometric USING btree (tenant_id, candidato_id, kind, status);

CREATE INDEX candidate_biometric_retention_idx ON recrutamento.candidate_biometric USING btree (tenant_id, retention_until) WHERE (status = 'ACTIVE'::recrutamento.biometric_status);

CREATE INDEX candidato_lookup_idx ON recrutamento.candidato USING btree (tenant_id, cpf);

CREATE INDEX classificacao_item_call_order_idx ON recrutamento.classificacao_item USING btree (tenant_id, snapshot_id, vaga_id, call_order) WHERE (call_order IS NOT NULL);

CREATE INDEX classificacao_item_rank_idx ON recrutamento.classificacao_item USING btree (tenant_id, snapshot_id, vaga_id, rank_general);

CREATE INDEX classificacao_snapshot_concurso_idx ON recrutamento.classificacao_snapshot USING btree (tenant_id, concurso_id, generated_at DESC);

CREATE INDEX classificacao_snapshot_public_idx ON recrutamento.classificacao_snapshot USING btree (concurso_id, status, generated_at DESC) WHERE (status = 'PUBLISHED'::recrutamento.classificacao_snapshot_status);

CREATE INDEX concurso_status_idx ON recrutamento.concurso USING btree (tenant_id, status, valid_until);

CREATE INDEX convocacao_nomeacao_idx ON recrutamento.convocacao USING btree (tenant_id, nomeacao_id, sent_at DESC);

CREATE INDEX document_signature_document_idx ON recrutamento.document_signature USING btree (tenant_id, document_id, signature_order);

CREATE INDEX edital_public_lookup_idx ON recrutamento.edital USING btree (tenant_id, concurso_id, version DESC) WHERE (published_at IS NOT NULL);

CREATE INDEX gabarito_status_idx ON recrutamento.gabarito USING btree (tenant_id, prova_id, status, version DESC);

CREATE INDEX inscricao_public_lookup_idx ON recrutamento.inscricao USING btree (id, access_token_hash);

CREATE INDEX inscricao_status_idx ON recrutamento.inscricao USING btree (tenant_id, concurso_id, status);

CREATE INDEX nomeacao_concurso_vaga_status_idx ON recrutamento.nomeacao USING btree (tenant_id, concurso_id, vaga_id, status);

CREATE INDEX nomeacao_expiration_idx ON recrutamento.nomeacao USING btree (tenant_id, comparecimento_until, status) WHERE (status = ANY (ARRAY['NOMEADO'::recrutamento.nomeacao_status, 'CONVOCADO'::recrutamento.nomeacao_status]));

CREATE INDEX nota_lookup_idx ON recrutamento.nota USING btree (tenant_id, inscricao_id, prova_id);

CREATE INDEX online_exam_session_application_idx ON recrutamento.online_exam_session USING btree (tenant_id, application_id, prova_id, status);

CREATE INDEX payment_charge_status_idx ON recrutamento.payment_charge USING btree (tenant_id, status);

CREATE INDEX posse_employee_idx ON recrutamento.posse USING btree (tenant_id, employee_id) WHERE (employee_id IS NOT NULL);

CREATE INDEX posse_status_due_idx ON recrutamento.posse USING btree (tenant_id, status, exercicio_due_at);

CREATE INDEX proctoring_artifact_retention_idx ON recrutamento.proctoring_artifact USING btree (tenant_id, retention_until);

CREATE INDEX proctoring_event_session_idx ON recrutamento.proctoring_event USING btree (tenant_id, session_id, severity, occurred_at);

CREATE INDEX prova_concurso_idx ON recrutamento.prova USING btree (tenant_id, concurso_id, applied_at);

CREATE INDEX recurso_status_idx ON recrutamento.recurso USING btree (tenant_id, prova_id, status, created_at);

CREATE INDEX signed_document_concurso_idx ON recrutamento.signed_document USING btree (tenant_id, concurso_id, status, kind);

CREATE TRIGGER biometric_consent_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.biometric_consent FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_biometric_audit();

CREATE TRIGGER biometric_match_attempt_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.biometric_match_attempt FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_biometric_audit();

CREATE TRIGGER candidate_biometric_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.candidate_biometric FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_biometric_audit();

CREATE TRIGGER candidato_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.candidato FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_inscricao_audit();

CREATE TRIGGER classificacao_item_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.classificacao_item FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_classificacao_audit();

CREATE TRIGGER classificacao_item_immutable BEFORE INSERT OR DELETE OR UPDATE ON recrutamento.classificacao_item FOR EACH ROW EXECUTE FUNCTION recrutamento.prevent_published_classificacao_item_change();

CREATE TRIGGER classificacao_snapshot_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.classificacao_snapshot FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_classificacao_audit();

CREATE TRIGGER classificacao_snapshot_immutable BEFORE DELETE OR UPDATE ON recrutamento.classificacao_snapshot FOR EACH ROW EXECUTE FUNCTION recrutamento.prevent_published_classificacao_snapshot_change();

CREATE TRIGGER concurso_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.concurso FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_concurso_audit();

CREATE TRIGGER convocacao_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.convocacao FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_nomeacao_audit();

CREATE TRIGGER edital_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.edital FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_concurso_audit();

CREATE TRIGGER gabarito_no_final_update BEFORE UPDATE ON recrutamento.gabarito FOR EACH ROW EXECUTE FUNCTION recrutamento.prevent_final_gabarito_in_place();

CREATE TRIGGER inscricao_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.inscricao FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_inscricao_audit();

CREATE TRIGGER nomeacao_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.nomeacao FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_nomeacao_audit();

CREATE TRIGGER nomeacao_touch_updated_at BEFORE UPDATE ON recrutamento.nomeacao FOR EACH ROW EXECUTE FUNCTION recrutamento.touch_nomeacao_updated_at();

CREATE TRIGGER payment_charge_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.payment_charge FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_inscricao_audit();

CREATE TRIGGER posse_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.posse FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_posse_audit();

CREATE TRIGGER posse_touch_updated_at BEFORE UPDATE ON recrutamento.posse FOR EACH ROW EXECUTE FUNCTION recrutamento.touch_posse_updated_at();

CREATE TRIGGER recrutamento_banca_membro_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.banca_membro FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_banca_audit();

CREATE TRIGGER recrutamento_document_signature_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.document_signature FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_banca_audit();

CREATE TRIGGER recrutamento_gabarito_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.gabarito FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_avaliacao_audit();

CREATE TRIGGER recrutamento_nota_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.nota FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_avaliacao_audit();

CREATE TRIGGER recrutamento_online_exam_session_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.online_exam_session FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_proctoring_audit();

CREATE TRIGGER recrutamento_proctoring_artifact_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.proctoring_artifact FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_proctoring_audit();

CREATE TRIGGER recrutamento_proctoring_event_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.proctoring_event FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_proctoring_audit();

CREATE TRIGGER recrutamento_prova_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.prova FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_avaliacao_audit();

CREATE TRIGGER recrutamento_questao_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.questao FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_avaliacao_audit();

CREATE TRIGGER recrutamento_recurso_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.recurso FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_avaliacao_audit();

CREATE TRIGGER recrutamento_resposta_candidato_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.resposta_candidato FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_avaliacao_audit();

CREATE TRIGGER recrutamento_signed_document_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.signed_document FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_banca_audit();

CREATE TRIGGER vaga_audit AFTER INSERT OR DELETE OR UPDATE ON recrutamento.vaga FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_concurso_audit();

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

ALTER TABLE ONLY recrutamento.banca_membro FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.biometric_consent FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.biometric_match_attempt FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.candidate_biometric FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.candidato FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.classificacao_item FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.classificacao_snapshot FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.concurso FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.convocacao FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.document_signature FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.edital FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.gabarito FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.inscricao FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.nomeacao FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.nota FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.online_exam_session FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.payment_charge FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.posse FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.proctoring_artifact FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.proctoring_event FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.prova FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.questao FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.recurso FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.resposta_candidato FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.signed_document FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY recrutamento.vaga FORCE ROW LEVEL SECURITY;

ALTER TABLE recrutamento.banca_membro ENABLE ROW LEVEL SECURITY;

CREATE POLICY banca_membro_select ON recrutamento.banca_membro FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.read'::text, 'recrutamento.banca.write'::text]))));

CREATE POLICY banca_membro_write ON recrutamento.banca_membro USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.write'::text]))));

ALTER TABLE recrutamento.biometric_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometric_consent_select ON recrutamento.biometric_consent FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.read'::text, 'recrutamento.biometric.write'::text]))));

CREATE POLICY biometric_consent_write ON recrutamento.biometric_consent USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'::text]))));

ALTER TABLE recrutamento.biometric_match_attempt ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometric_match_attempt_select ON recrutamento.biometric_match_attempt FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.read'::text, 'recrutamento.biometric.write'::text]))));

CREATE POLICY biometric_match_attempt_write ON recrutamento.biometric_match_attempt USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'::text]))));

ALTER TABLE recrutamento.candidate_biometric ENABLE ROW LEVEL SECURITY;

CREATE POLICY candidate_biometric_select ON recrutamento.candidate_biometric FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.read'::text, 'recrutamento.biometric.write'::text]))));

CREATE POLICY candidate_biometric_write ON recrutamento.candidate_biometric USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.biometric.write'::text]))));

ALTER TABLE recrutamento.candidato ENABLE ROW LEVEL SECURITY;

CREATE POLICY candidato_select ON recrutamento.candidato FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY candidato_write ON recrutamento.candidato USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text]))));

ALTER TABLE recrutamento.classificacao_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY classificacao_item_select ON recrutamento.classificacao_item FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.read'::text, 'recrutamento.classificacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'recrutamento:read'::text, 'recrutamento:write'::text]))));

CREATE POLICY classificacao_item_write ON recrutamento.classificacao_item USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.write'::text, 'recrutamento.write'::text, 'recrutamento:write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.write'::text, 'recrutamento.write'::text, 'recrutamento:write'::text]))));

ALTER TABLE recrutamento.classificacao_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY classificacao_snapshot_select ON recrutamento.classificacao_snapshot FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.read'::text, 'recrutamento.classificacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'recrutamento:read'::text, 'recrutamento:write'::text]))));

CREATE POLICY classificacao_snapshot_write ON recrutamento.classificacao_snapshot USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.write'::text, 'recrutamento.write'::text, 'recrutamento:write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.classificacao.write'::text, 'recrutamento.write'::text, 'recrutamento:write'::text]))));

ALTER TABLE recrutamento.concurso ENABLE ROW LEVEL SECURITY;

CREATE POLICY concurso_select ON recrutamento.concurso FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.read'::text, 'recrutamento.concurso.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY concurso_write ON recrutamento.concurso USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.convocacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY convocacao_select ON recrutamento.convocacao FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.read'::text, 'recrutamento.nomeacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'recrutamento:read'::text, 'recrutamento:write'::text]))));

CREATE POLICY convocacao_write ON recrutamento.convocacao USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.write'::text, 'recrutamento.write'::text, 'recrutamento:write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.write'::text, 'recrutamento.write'::text, 'recrutamento:write'::text]))));

ALTER TABLE recrutamento.document_signature ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_signature_select ON recrutamento.document_signature FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.read'::text, 'recrutamento.banca.write'::text]))));

CREATE POLICY document_signature_write ON recrutamento.document_signature USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.write'::text]))));

ALTER TABLE recrutamento.edital ENABLE ROW LEVEL SECURITY;

CREATE POLICY edital_select ON recrutamento.edital FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.read'::text, 'recrutamento.concurso.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY edital_write ON recrutamento.edital USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.gabarito ENABLE ROW LEVEL SECURITY;

CREATE POLICY gabarito_select ON recrutamento.gabarito FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.read'::text, 'recrutamento.avaliacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY gabarito_write ON recrutamento.gabarito USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.inscricao ENABLE ROW LEVEL SECURITY;

CREATE POLICY inscricao_select ON recrutamento.inscricao FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY inscricao_write ON recrutamento.inscricao USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text]))));

ALTER TABLE recrutamento.nomeacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY nomeacao_select ON recrutamento.nomeacao FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.read'::text, 'recrutamento.nomeacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text, 'recrutamento:read'::text, 'recrutamento:write'::text]))));

CREATE POLICY nomeacao_write ON recrutamento.nomeacao USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.write'::text, 'recrutamento.write'::text, 'recrutamento:write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.nomeacao.write'::text, 'recrutamento.write'::text, 'recrutamento:write'::text]))));

ALTER TABLE recrutamento.nota ENABLE ROW LEVEL SECURITY;

CREATE POLICY nota_select ON recrutamento.nota FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.read'::text, 'recrutamento.avaliacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY nota_write ON recrutamento.nota USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.online_exam_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY online_exam_session_select ON recrutamento.online_exam_session FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.read'::text, 'recrutamento.exam.review'::text, 'recrutamento.exam.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY online_exam_session_write ON recrutamento.online_exam_session USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.write'::text, 'recrutamento.exam.review'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.write'::text, 'recrutamento.exam.review'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.payment_charge ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_charge_select ON recrutamento.payment_charge FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY payment_charge_write ON recrutamento.payment_charge USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.write'::text]))));

ALTER TABLE recrutamento.posse ENABLE ROW LEVEL SECURITY;

CREATE POLICY posse_select ON recrutamento.posse FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.posse.read'::text, 'recrutamento.posse.write'::text, 'recrutamento:read'::text, 'recrutamento:write'::text, 'rh:write'::text]))));

CREATE POLICY posse_write ON recrutamento.posse USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.posse.write'::text, 'recrutamento:write'::text, 'rh:write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.posse.write'::text, 'recrutamento:write'::text, 'rh:write'::text]))));

ALTER TABLE recrutamento.proctoring_artifact ENABLE ROW LEVEL SECURITY;

CREATE POLICY proctoring_artifact_select ON recrutamento.proctoring_artifact FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.read'::text, 'recrutamento.exam.review'::text, 'recrutamento.exam.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY proctoring_artifact_write ON recrutamento.proctoring_artifact USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.write'::text, 'recrutamento.exam.review'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.write'::text, 'recrutamento.exam.review'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.proctoring_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY proctoring_event_select ON recrutamento.proctoring_event FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.read'::text, 'recrutamento.exam.review'::text, 'recrutamento.exam.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY proctoring_event_write ON recrutamento.proctoring_event USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.write'::text, 'recrutamento.exam.review'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.exam.write'::text, 'recrutamento.exam.review'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.prova ENABLE ROW LEVEL SECURITY;

CREATE POLICY prova_select ON recrutamento.prova FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.read'::text, 'recrutamento.avaliacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY prova_write ON recrutamento.prova USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.questao ENABLE ROW LEVEL SECURITY;

CREATE POLICY questao_select ON recrutamento.questao FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.read'::text, 'recrutamento.avaliacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY questao_write ON recrutamento.questao USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.recurso ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurso_select ON recrutamento.recurso FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.read'::text, 'recrutamento.avaliacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY recurso_write ON recrutamento.recurso USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.resposta_candidato ENABLE ROW LEVEL SECURITY;

CREATE POLICY resposta_candidato_select ON recrutamento.resposta_candidato FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.read'::text, 'recrutamento.avaliacao.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY resposta_candidato_write ON recrutamento.resposta_candidato USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.avaliacao.write'::text, 'recrutamento.write'::text]))));

ALTER TABLE recrutamento.signed_document ENABLE ROW LEVEL SECURITY;

CREATE POLICY signed_document_select ON recrutamento.signed_document FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.read'::text, 'recrutamento.banca.write'::text]))));

CREATE POLICY signed_document_write ON recrutamento.signed_document USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.banca.write'::text]))));

ALTER TABLE recrutamento.vaga ENABLE ROW LEVEL SECURITY;

CREATE POLICY vaga_select ON recrutamento.vaga FOR SELECT USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.read'::text, 'recrutamento.concurso.write'::text, 'recrutamento.read'::text, 'recrutamento.write'::text]))));

CREATE POLICY vaga_write ON recrutamento.vaga USING ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write'::text, 'recrutamento.write'::text])))) WITH CHECK ((public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['recrutamento.concurso.write'::text, 'recrutamento.write'::text]))));
