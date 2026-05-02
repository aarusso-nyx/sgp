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
