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
