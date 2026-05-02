# Biometria de Candidato e LGPD Art. 11

**Escopo:** REC-07 — captura biométrica do candidato em concursos públicos.
**Status:** Implementado em v0.0.1.
**Base normativa:** LGPD Lei 13.709/2018 arts. 7, 11, 12, 18 e 46; Lei 14.063/2020 para assinatura eletrônica do termo.

## Decisão

O SGP trata template biométrico de candidato como dado pessoal sensível. A captura de impressão digital e face exige consentimento específico e destacado, registrado em `recrutamento.biometric_consent`, antes de qualquer persistência em `recrutamento.candidate_biometric`. O consentimento genérico da inscrição não autoriza REC-07.

## Modelo Operacional

- O backend extrai template localmente a partir da amostra do leitor/câmera; a amostra bruta não é enviada a serviço externo.
- Apenas o template cifrado é persistido em `template_cipher`; imagem bruta ou fotografia original não é persistida por padrão.
- `template_kms_key_id` identifica a chave usada para envelope encryption e permite cripto-shredding quando o titular solicita exclusão.
- `retention_until` limita a retenção ao encerramento do concurso e prazo legal de recurso.
- A conferência presencial no dia da prova gera `recrutamento.biometric_match_attempt` com `score`, `threshold` e `decision`.
- Cinco rejeições consecutivas do mesmo candidato geram evento antifraude `recrutamento.biometric.fraud_suspect`.

## ROPA

| Operação      | Dado tratado                                            | Finalidade                          | Base                                         | Retenção                                     |
| ------------- | ------------------------------------------------------- | ----------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Consentimento | versão, assinatura, timestamp                           | prova do consentimento destacado    | LGPD art. 11                                 | ciclo do concurso e prazo legal              |
| Captura       | template digital/facial cifrado, qualidade, dispositivo | prevenir substituição de candidato  | LGPD art. 11 e exercício regular de direitos | `retention_until`                            |
| Matching      | score, threshold, decisão, sessão de prova              | conferência presencial e antifraude | LGPD arts. 7, 11 e 46                        | ciclo do concurso e auditoria                |
| Exclusão      | retirada e revogação                                    | direito do titular                  | LGPD art. 18                                 | revoga template ativo e destrói chave lógica |

## Segurança e Auditoria

As tabelas são tenant-scoped, têm RLS forçada e exigem `recrutamento.biometric.read` ou `recrutamento.biometric.write`. Toda mutação chama `public.sgp_append_audit_event(...)`; eventos de `candidate_biometric` removem `template_cipher` do metadata para impedir vazamento de template em claro ou cifrado no log de auditoria.

## Direitos do Titular

O endpoint `DELETE /api/v1/recrutamento/biometria/candidatos/:candidatoId` registra retirada do consentimento, marca templates como `REVOKED`, substitui o envelope cifrado por marcador irreversível e altera `template_kms_key_id` para chave destruída. Tentativas posteriores de matching retornam `REJECT`.
