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
