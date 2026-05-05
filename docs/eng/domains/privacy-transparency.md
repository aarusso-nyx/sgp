# Privacy And Transparency Domain Authority

Authored domain authority for LGPD, biometrics, transparency portal, LAI, ROPA, RCIS, legal bases, and data-subject rights.

## Merged Artifact Index

- Biometria de Candidato e LGPD Art. 11
- Reconhecimento Facial no Ponto Eletronico
- Portal da Transparencia
- LGPD Encarregado e Direitos do Titular
- LAI - pedidos de acesso a informacao
- LGPD legal-basis registry per data flow
- PII at rest hardening
- LGPD treatment by public power
- LGPD RCIS security-incident workflow
- LGPD ROPA registry
- LGPD titular-rights portal tickets

## Regulatory References Cross-Reference

This table maps privacy, transparency, and LGPD references to implementation or
retained decision evidence.

| Reference                                    | Obligation cluster                           | Implementation / evidence path:line               | Current posture                                                  |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `docs/refs/lgpd/anpd-guidelines.md`          | ANPD operational guidance                    | docs/user/lgpd.md:1                               | Operator-facing LGPD procedure retained.                         |
| `docs/refs/lgpd/dpo-dsar.md`                 | DPO designation and data-subject requests    | backend/src/lgpd/dpo.controller.ts:1              | Implemented public DPO/DSAR endpoints.                           |
| `docs/refs/lgpd/lei-13709.md`                | LGPD umbrella obligations                    | database/sql/15-pii-encryption.sql:1              | Implemented PII tagging/encryption and protected route surfaces. |
| `docs/refs/lgpd/pii-categorias-cpf-bio.md`   | CPF, health, photo, and biometric categories | database/sql/13-pii-comments.sql:1                | Implemented PII classification comments and encryption scope.    |
| `docs/refs/lgpd/ropa-rcis.md`                | ROPA and security incident records           | backend/src/lgpd/ropa.controller.ts:1             | Implemented ROPA/RCIS controller surfaces.                       |
| `docs/refs/lgpd/tratamento-poder-publico.md` | Public-power treatment basis                 | backend/src/lgpd/public-power.controller.ts:1     | Implemented public-power LGPD route surface.                     |
| `docs/refs/tce/lai-portal-transparencia.md`  | LAI and transparency publication             | backend/src/publico/lai/lai-requests.service.ts:1 | Implemented LAI request and transparency surfaces.               |

## Biometria de Candidato e LGPD Art. 11

## Biometria de Candidato e LGPD Art. 11

**Escopo:** REC-07 — captura biométrica do candidato em concursos públicos.
**Status:** Implementado em v0.0.1.
**Base normativa:** LGPD Lei 13.709/2018 arts. 7, 11, 12, 18 e 46; Lei 14.063/2020 para assinatura eletrônica do termo.

### Decisão

O SGP trata template biométrico de candidato como dado pessoal sensível. A captura de impressão digital e face exige consentimento específico e destacado, registrado em `recrutamento.biometric_consent`, antes de qualquer persistência em `recrutamento.candidate_biometric`. O consentimento genérico da inscrição não autoriza REC-07.

### Modelo Operacional

- O backend extrai template localmente a partir da amostra do leitor/câmera; a amostra bruta não é enviada a serviço externo.
- Apenas o template cifrado é persistido em `template_cipher`; imagem bruta ou fotografia original não é persistida por padrão.
- `template_kms_key_id` identifica a chave usada para envelope encryption e permite cripto-shredding quando o titular solicita exclusão.
- `retention_until` limita a retenção ao encerramento do concurso e prazo legal de recurso.
- A conferência presencial no dia da prova gera `recrutamento.biometric_match_attempt` com `score`, `threshold` e `decision`.
- Cinco rejeições consecutivas do mesmo candidato geram evento antifraude `recrutamento.biometric.fraud_suspect`.

### ROPA

| Operação      | Dado tratado                                            | Finalidade                          | Base                                         | Retenção                                     |
| ------------- | ------------------------------------------------------- | ----------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Consentimento | versão, assinatura, timestamp                           | prova do consentimento destacado    | LGPD art. 11                                 | ciclo do concurso e prazo legal              |
| Captura       | template digital/facial cifrado, qualidade, dispositivo | prevenir substituição de candidato  | LGPD art. 11 e exercício regular de direitos | `retention_until`                            |
| Matching      | score, threshold, decisão, sessão de prova              | conferência presencial e antifraude | LGPD arts. 7, 11 e 46                        | ciclo do concurso e auditoria                |
| Exclusão      | retirada e revogação                                    | direito do titular                  | LGPD art. 18                                 | revoga template ativo e destrói chave lógica |

### Segurança e Auditoria

As tabelas são tenant-scoped, têm RLS forçada e exigem `recrutamento.biometric.read` ou `recrutamento.biometric.write`. Toda mutação chama `public.sgp_append_audit_event(...)`; eventos de `candidate_biometric` removem `template_cipher` do metadata para impedir vazamento de template em claro ou cifrado no log de auditoria.

### Direitos do Titular

O endpoint `DELETE /api/v1/recrutamento/biometria/candidatos/:candidatoId` registra retirada do consentimento, marca templates como `REVOKED`, substitui o envelope cifrado por marcador irreversível e altera `template_kms_key_id` para chave destruída. Tentativas posteriores de matching retornam `REJECT`.

## Reconhecimento Facial no Ponto Eletronico

## Reconhecimento Facial no Ponto Eletronico

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** PONTO-10, LGPD art. 7, 11, 18 e 46, Portaria MTP 671/2021, diretrizes ANPD sobre biometria e reconhecimento facial.

### Decisao

O SGP permite reconhecimento facial como modalidade adicional de identificacao no ponto eletronico, sem substituir o identificador primario do servidor. A tecnologia usa embedding facial gerado por modelo open-source executado localmente no backend ou no dispositivo homologado. Imagens e embeddings nunca sao enviados para servico externo de visao computacional.

### Base Legal e Consentimento

O rosto e dado pessoal sensivel. O tratamento exige consentimento especifico e destacado em `ponto.face_consent`, com versao do termo, data de aceite e retirada. Sem consentimento ativo, o matching facial e bloqueado e o sistema registra evento de auditoria, mas a jornada continua podendo ser registrada por mecanismo primario autorizado.

O registro de operacoes de tratamento deve incluir finalidade, categorias de titulares, base legal, modelo usado, prazo de retencao, controles de seguranca, criterios de compartilhamento inexistente para servicos externos de visao e canal de direitos do titular.

### Modelo Local, Threshold e Liveness

O embedding e persistido em `ponto.employee_face_template.embedding_cipher` com envelope cifrado e `embedding_kms_key_id`. `model_id` e `model_version` sao gravados para reprodutibilidade. A decisao de matching usa similaridade local contra template ativo, threshold default `0.700000` e configuracao por tenant em `ponto.face_threshold_config`.

O liveness e obrigatorio por padrao. A sequencia de captura deve conter piscada e virada de cabeca. Foto impressa, frame estatico ou video que nao satisfaça o desafio resulta em `ponto.face_match.liveness_passed=false` e `decision='REJECT'`.

### Vies e Mitigacao

Como reconhecimento facial pode apresentar vies por raca, genero e idade, o SGP trata a decisao facial como fator auxiliar. Rejeicao facial nao gera sancao automatica e pode ser resolvida por fluxo alternativo de ponto. Thresholds devem ser calibrados por tenant com amostras representativas, revisao humana quando houver `MANUAL_REVIEW` e monitoramento periodico de falso aceite e falsa rejeicao.

### Direitos do Titular e Retencao

O portal `/meus-dados/face` mostra status, data de captura, modelo e versao. A solicitacao de exclusao executa cripto-shredding: a chave logica e marcada como destruida, o embedding cifrado e substituido por material irreversivel e o template passa para `REVOKED`. Novos matchings apos a exclusao resultam em rejeicao ate novo consentimento e recaptura.

### Auditoria e RLS

Todas as tabelas sao tenant-scoped, usam RLS com `public.sgp_tenant_matches(tenant_id)` e permissoes `ponto.face.read` / `ponto.face.write`. Mutacoes disparam `public.sgp_append_audit_event(...)` sem armazenar imagem original ou embedding em claro nos metadados.

## Portal da Transparencia

## Portal da Transparencia

### Base legal

O portal publico de transparencia ativa publica remuneracao de servidores conforme Lei 12.527/2011, Decreto 7.724/2012 e entendimento do STF no Tema 483. A exposicao usa as bases legais da LGPD para cumprimento de obrigacao legal e execucao de politicas publicas, especialmente os arts. 7o, III, e 23.

### Dados publicados

O snapshot mensal e gerado somente a partir de `payroll.payroll_run` com status `APPROVED` e apenas para tenants com `transparency_enabled=true`. A competencia publicada fica congelada em `public_data.transparency_payroll_snapshot` com os campos: identificador publico do servidor, nome, matricula funcional, cargo, lotacao, total de proventos, total de descontos, liquido e data de captura.

CPF, RG, PIS/PASEP, dependentes, endereco, telefone, e-mail, dados bancarios e demais dados pessoais sensiveis ou nao necessarios a transparencia remuneratoria nao fazem parte da superficie publica.

### Publicacao e auditoria

A publicacao e executada por `public_data.publish_transparency_snapshot(...)`, que recalcula a competencia aprovada, registra `public_data.transparency_publish_event`, calcula hash deterministico do snapshot e chama `sgp_append_audit_event(...)`. Mutacoes exigem a permissao `transparency.publish`.

Cada requisicao publica em `/api/v1/public/transparency/*` registra `public_data.transparency_access_log` com hash SHA-256 de IP e user-agent, caminho, query e status HTTP, preservando evidencia de acesso sem armazenar identificadores diretos.

### Consulta, cache e retencao

A API publica aplica teto de 200 itens por pagina e 50 paginas, com erro 400 para tentativas acima do limite. As respostas usam `Cache-Control` publico e `ETag` baseado no `snapshot_hash`; o CSV e emitido em UTF-8 com BOM e exatamente as colunas do snapshot.

Snapshots devem ser retidos pelo prazo definido na politica arquivistica municipal aplicavel ao registro financeiro e de transparencia ativa. A remocao ou retificacao de snapshot publicado deve ocorrer por nova publicacao auditada, preservando trilha de eventos.

## LGPD Encarregado e Direitos do Titular

## LGPD Encarregado e Direitos do Titular

R2-42 expõe o contato público do encarregado pelo tratamento de dados pessoais.
R2-43 adiciona o canal público de direitos do titular vinculado ao ROPA vigente
do tenant.
R3-030 adiciona o ciclo administrativo auditável de designação do encarregado.

### Contrato público

`GET /api/v1/public/lgpd/encarregado` retorna:

```json
{
  "name": "Encarregado pelo Tratamento de Dados Pessoais",
  "contact": {
    "email": "dpo@example.invalid",
    "phone": "",
    "channelUrl": "/lgpd/encarregado",
    "officeHours": "Dias uteis, 9h as 17h",
    "postalAddress": ""
  },
  "updatedAt": null
}
```

O cabeçalho opcional `x-tenant-id` seleciona o tenant quando o canal público
nao resolve o tenant por host. Sem cabeçalho, a API usa o contato LGPD
configurado mais recente de tenant ativo; se nao houver linha configurada,
retorna os defaults acima.

### Parametrização

Os valores configuráveis ficam em `public.system_parameter`:

| Chave              | Modulo | Valor                                                                                                                                 |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `lgpd.encarregado` | `lgpd` | JSON com `name`, `email`, `phone`, `channelUrl`, `officeHours`, `postalAddress`, `status`, `designationAct`, `designatedAt` e `notes` |

O seed local cria a linha para o tenant fixture com os defaults públicos. Em
produção, cada tenant deve substituir `email`, `phone`, `channelUrl`,
`officeHours` e `postalAddress` antes da publicação do portal.

### Ciclo administrativo

O operador com `gestao.read` consulta a designação corrente em:

- `GET /api/v1/admin/lgpd/dpo`

O operador com `gestao.write` cria ou atualiza a designação em:

- `POST /api/v1/admin/lgpd/dpo`
- `PATCH /api/v1/admin/lgpd/dpo`

As mutações gravam `public.system_parameter` e emitem auditoria com
`resourceType=lgpd_dpo_designation`, `tableName=public.system_parameter` e o
estado de ciclo (`status`, `designationAct`, `designatedAt`). Os status
aceitos sao `ACTIVE`, `UNDER_REVIEW` e `REPLACED`. Decisões jurídicas sobre
nomeação, substituição, publicação externa e prazos fora desses campos devem
ser registradas fora da API ate que o dono jurídico aprove regra mais
específica.

### Portal

O frontend expõe a mesma informação em `/lgpd/encarregado` e
`/portal/lgpd/encarregado`. A página consome somente o endpoint público acima.

### Direitos do titular

`POST /api/portal/v1/lgpd/direitos` cria solicitação autenticada de exercício
de direitos do titular em `lgpd.data_subject_request`. A API exige
`rightType`, `flowKey` e `description`, captura a base ROPA ativa vinculada ao
tratamento informado, registra o ator portal autenticado e devolve o ticket com
SLA, status e snapshot de retenção/compartilhamento para triagem operacional.

Tipos aceitos:

- `CONFIRMATION`
- `ACCESS`
- `CORRECTION`
- `ANONYMIZATION_BLOCKING_DELETION`
- `PORTABILITY`
- `CONSENT_DELETION`

Solicitações de apagamento, bloqueio ou eliminação sao classificadas como
`RETENTION_RESTRICTED` quando a base ROPA vigente indicar retenção legal ou
operacional; as demais entram como `EXECUTABLE`. O endpoint nao decide mérito
jurídico nem executa alteração automática de dados pessoais.

## LAI - pedidos de acesso a informacao

## LAI - pedidos de acesso a informacao

### Escopo

O modulo `publico/lai` recebe pedidos publicos de acesso a informacao para um
tenant, retorna protocolo e chave de acompanhamento, e expoe consulta publica de
status sem autenticar o solicitante.

Base legal operacional: Lei 12.527/2011, art. 10 e art. 11. Quando a resposta
imediata nao for possivel, o prazo inicial e de ate 20 dias corridos; a prorrogacao
e unica, por mais 10 dias, com justificativa registrada.

### API

- `POST /api/v1/public/lai/:tenantId/requests`
  - Entrada: `requesterName`, `requesterEmail`, `requesterDocument?`,
    `requestText`.
  - Saida: `protocol`, `accessKey`, `status`, `submittedAt`, `dueAt`,
    `slaStatus`.
  - O documento do solicitante e armazenado somente como hash SHA-256 quando
    informado. A chave de acompanhamento tambem e armazenada somente como hash.
- `GET /api/v1/public/lai/:tenantId/requests/:protocol/status?accessKey=...`
  - Saida: `protocol`, `status`, `submittedAt`, `dueAt`, `extendedDueAt?`,
    `effectiveDueAt`, `answeredAt?`, `closedAt?`, `remainingDays`, `slaStatus`.
  - Nao retorna nome, e-mail, documento nem texto do pedido.

### Persistencia e auditoria

As tabelas canonicas sao `public_data.lai_request` e
`public_data.lai_request_event`. A criacao do pedido insere o evento inicial
`RECEIVED`; transicoes posteriores sao registradas na tabela de eventos.

`public_data.create_lai_request`, `public_data.get_lai_request_status` e
`public_data.transition_lai_request` sao funcoes `SECURITY DEFINER` usadas pelo
runtime para manter o endpoint publico sem criar permissao RBAC nova. As tabelas
tem RLS forcado; operadores internos reutilizam `transparency.publish` para
leitura/escrita operacional do fluxo de transparencia, sem introduzir novo
identificador de permissao em v0.0.1.

Toda mutacao de `public_data.lai_request` dispara trigger de auditoria para
`public.audit_event`; o controller tambem declara `@AuditMutation` para cumprir
o contrato global de mutacoes HTTP auditadas.

### Estados

Estados validos:

- `RECEIVED`
- `IN_REVIEW`
- `AWAITING_CLARIFICATION`
- `EXTENDED`
- `ANSWERED`
- `DENIED`
- `CLOSED`

Transicoes permitidas:

- `RECEIVED` -> `IN_REVIEW`, `AWAITING_CLARIFICATION`, `EXTENDED`, `ANSWERED`,
  `DENIED`, `CLOSED`
- `IN_REVIEW` -> `AWAITING_CLARIFICATION`, `EXTENDED`, `ANSWERED`, `DENIED`
- `AWAITING_CLARIFICATION` -> `IN_REVIEW`, `CLOSED`
- `EXTENDED` -> `ANSWERED`, `DENIED`, `CLOSED`
- `ANSWERED` -> `CLOSED`
- `DENIED` -> `CLOSED`

`CLOSED` e terminal.

## LGPD legal-basis registry per data flow

## LGPD legal-basis registry per data flow

**Status:** Accepted for v0.0.1 R2-40.
**Law source:** Lei 13.709/2018 (LGPD), especially Art. 7 for ordinary personal data and Art. 11 for sensitive personal data.
**Canonical rule table:** `lgpd.legal_basis_rule`.
**Backend enforcement point:** `LgpdLegalBasisService.assertPiiReadAllowed(flowKey)` is called before report-service PII reads for payslips and yearly income; further R2 waves must reuse the same service instead of inventing parallel registries.

This file is not ROPA. R2-39 must derive operation records from this registry and add operation owners, processor/receiver details, risk classification, and lifecycle evidence.

### Decision Model

Each data flow has one stable `flow_key`, one ordinary-data basis from LGPD Art. 7, and, when the flow includes sensitive data, one Art. 11 basis. Consent is recorded only where the product flow needs highlighted operational evidence; it is not used as the default basis for statutory HR, payroll, fiscal, health, or regulator reporting duties of a public controller.

Sensitive or mixed flows set `requires_dpia = true` as a planning flag for R2-39/R2-41 governance evidence. This flag does not itself implement RCIS, ROPA, or titular-rights workflows.

### Data-Flow Registry

| ADR          | flow_key                                | Flow                                            | Data category | Ordinary basis | Sensitive basis | Consent evidence | Backend/current surface                                                            |
| ------------ | --------------------------------------- | ----------------------------------------------- | ------------- | -------------- | --------------- | ---------------- | ---------------------------------------------------------------------------------- |
| ADR-LGPD-001 | `payroll.payslip_pdf`                   | Contracheque oficial PDF/A                      | Mixed         | Art. 7, II     | Art. 11, II, a  | No               | `report-service/payslip` calls legal-basis service before source PII read          |
| ADR-LGPD-002 | `fiscal.yearly_income_pdf`              | Comprovante anual de rendimentos e IRRF         | Mixed         | Art. 7, II     | Art. 11, II, a  | No               | `report-service/yearly-income` calls legal-basis service before aggregate PII read |
| ADR-LGPD-003 | `time.attendance_register`              | Registro de jornada e banco de horas            | Personal      | Art. 7, II     | n/a             | No               | Ponto services must bind reads to this key when R2-39 instruments ROPA             |
| ADR-LGPD-004 | `time.biometric_clock`                  | Biometria para controle de ponto                | Sensitive     | Art. 7, II     | Art. 11, II, a  | Yes              | Existing ponto biometric/face consent services remain flow evidence                |
| ADR-LGPD-005 | `recruitment.public_application`        | Inscricao publica em concurso/processo seletivo | Mixed         | Art. 7, V      | Art. 11, II, d  | Yes              | Existing public inscription consent remains flow evidence                          |
| ADR-LGPD-006 | `recruitment.online_exam_proctoring`    | Proctoring e biometria em prova online          | Sensitive     | Art. 7, VI     | Art. 11, II, d  | Yes              | Existing prova-online LGPD exclusion/consent tests remain flow evidence            |
| ADR-LGPD-007 | `health.medical_record`                 | Prontuario, ASO e PCMSO/PGR                     | Sensitive     | Art. 7, II     | Art. 11, II, f  | No               | Saude/pericia reads must bind to this key before ROPA closure                      |
| ADR-LGPD-008 | `regulatory.esocial_reporting`          | eSocial, DCTFWeb, DIRF/Reinf e TCE              | Mixed         | Art. 7, II     | Art. 11, II, a  | No               | Worker/regulatory submissions must bind to this key before ROPA closure            |
| ADR-LGPD-009 | `transparency.remuneration_publication` | Transparencia ativa de remuneracao              | Personal      | Art. 7, III    | n/a             | No               | Transparency output keeps minimization with `employee_public_id`                   |

### Production gate: legal-basis and ROPA checklist for `@stynx/privacy`

R2-40 is production-gating for every PII-touching flow. The SGP legal-basis
registry remains the product authority, while `@stynx/privacy` consumes the
field set needed to generate ROPA, export, erasure, and retention evidence for
live and archive data. New PII flows cannot go to production until they have a
row in this checklist, matching active `lgpd.legal_basis_rule` data and the PII
column map consumed by stynx.

Required fields for each flow:

| Field                   | Acceptance criterion                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flow_id`               | Stable `lgpd.legal_basis_rule.flow_key`; no route, report, worker, or export may invent a second flow key.                                                                                          |
| `legal_basis`           | One stynx-facing tag from `consent`, `legitimate-interest`, `legal-obligation`, `vital-interests`, `contract`, or `public-task`, plus the canonical LGPD Art. 7 and Art. 11 codes where applicable. |
| `data_subject_category` | Human category whose data is processed, such as public employee, beneficiary, candidate, requester, or external-system contact.                                                                     |
| `retention_horizon`     | Operational horizon from the rule's `retention_rule`, expressed as a policy trigger or legal/control period rather than "forever".                                                                  |
| `pii_map`               | Source tables and columns have parseable PII metadata with category, subject link, erasure strategy, and live/archive retention target for `@stynx/privacy`.                                        |
| `ropa_owner`            | ROPA entry identifies controller area, processors/receivers, safeguards, lifecycle evidence, status, and risk classification.                                                                       |
| `consent_evidence`      | Required only when the product flow records highlighted consent or acknowledgement; consent evidence never replaces statutory bases for mandatory public-controller duties.                         |
| `production_gate`       | The flow has at least one focused test or generated evidence path proving the legal-basis lookup before PII read or the ROPA linkage before titular-rights/incident handling.                       |

Current accepted PII-flow checklist:

| flow_id                                 | legal_basis        | Canonical LGPD basis       | data_subject_category                             | retention_horizon                                                                       | Production gate                                                                                          |
| --------------------------------------- | ------------------ | -------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `payroll.payslip_pdf`                   | `legal-obligation` | Art. 7, II; Art. 11, II, a | Public employee                                   | Functional, fiscal, and external-control period applicable to official payslips         | `report-service/payslip` must call `LgpdLegalBasisService.assertPiiReadAllowed` before source PII reads. |
| `fiscal.yearly_income_pdf`              | `legal-obligation` | Art. 7, II; Art. 11, II, a | Public employee; fiscal beneficiary               | At least 10 years for generated official fiscal files                                   | `report-service/yearly-income` must call the legal-basis service before aggregate PII reads.             |
| `time.attendance_register`              | `legal-obligation` | Art. 7, II                 | Public employee                                   | Portaria MTP 671/2021 and labor/administrative limitation periods                       | Ponto reads and payroll integration must bind to this flow key before ROPA closure.                      |
| `time.biometric_clock`                  | `legal-obligation` | Art. 7, II; Art. 11, II, a | Public employee                                   | Active template only while employment relationship and time-clock purpose remain active | Ponto biometric/face consent records remain required operational evidence; DPIA remains required.        |
| `recruitment.public_application`        | `contract`         | Art. 7, V; Art. 11, II, d  | Candidate                                         | Edital lifecycle, appeal period, and administrative-control limitation period           | Public application intake must preserve consent/exemption/quota evidence and route through the registry. |
| `recruitment.online_exam_proctoring`    | `public-task`      | Art. 7, VI; Art. 11, II, d | Candidate                                         | Recruitment process, appeal window, and control period                                  | Online exam artifacts and biometric/proctoring records require DPIA and ROPA linkage before production.  |
| `health.medical_record`                 | `legal-obligation` | Art. 7, II; Art. 11, II, f | Public employee; occupational-health subject      | PCMSO/PGR, eSocial SST, and medical-legal periods                                       | Saude/pericia reads must bind to this key before ROPA closure; access is restricted to health staff.     |
| `regulatory.esocial_reporting`          | `legal-obligation` | Art. 7, II; Art. 11, II, a | Public employee; beneficiary; appointed candidate | Official layouts, Receita Federal, eSocial, and courts-of-accounts periods              | stynx-esocial, integrations-worker, and TCE adapters must bind regulatory submissions to this key.       |
| `transparency.remuneration_publication` | `public-task`      | Art. 7, III                | Public employee                                   | LAI, Transparency Law, and active-publicity policy                                      | Transparency output must keep minimization and exclude CPF, bank, contact, and sensitive fields.         |

Acceptance for `@stynx/privacy` adoption:

- `stynx privacy ropa` output must be derivable from SGP PII annotations plus
  this legal-basis/ROPA field set; generated ROPA cannot depend on free-form
  prose only.
- Erasure/export policy must cover both live tables and archive mirrors. Where
  deletion is legally restricted, the flow must declare the retention horizon
  and use nullification, hash-with-salt, tombstone, or denial evidence instead
  of silent hard delete.
- A route, worker, report, or public export touching PII without a known
  `flow_id` is a production blocker, even if RBAC/RLS tests pass.

### ADR-LGPD-001: Contracheque oficial PDF/A

**Decision.** Use LGPD Art. 7, II and Art. 11, II, a.

**Rationale.** Payslip generation is a statutory payroll and employment-administration obligation. The flow reads CPF, bank information, functional identity, earnings, deductions, and tax/social-security bases. Consent is inappropriate as the primary basis because the controller must issue and retain the official demonstrative independently of optional employee consent.

**Rule table mapping.** `payroll.payslip_pdf` covers `hr.employee`, `payroll.payroll_run`, `payroll.payroll_financial_record`, `payroll.v_payroll_run_line_active`, and `public.generated_report_file`.

### ADR-LGPD-002: Comprovante anual de rendimentos e IRRF

**Decision.** Use LGPD Art. 7, II and Art. 11, II, a.

**Rationale.** Annual income certificates support tax compliance and delivery to the beneficiary. The flow reads CPF, income, withholding, and dependent totals. Consent is not the legal basis because fiscal issuance and retention are legal/regulatory duties.

**Rule table mapping.** `fiscal.yearly_income_pdf` covers `fiscal.v_yearly_income`, `fiscal.yearly_income_aggregate`, and `public.generated_report_file`.

### ADR-LGPD-003: Registro de jornada e banco de horas

**Decision.** Use LGPD Art. 7, II.

**Rationale.** Attendance recording, AFDT/ACJEF formation, payroll integration, and auditability are employment and statutory-control obligations. Ordinary attendance data does not require Art. 11 unless biometric or health data enters the flow.

**Rule table mapping.** `time.attendance_register` covers `ponto.time_record`, `ponto.mobile_clock_in_attempt`, and `hr.employee`.

### ADR-LGPD-004: Biometria para controle de ponto

**Decision.** Use LGPD Art. 7, II and Art. 11, II, a; keep highlighted consent/acknowledgement as operational evidence, not as the sole legal basis.

**Rationale.** Biometric templates are sensitive personal data. In this product context they serve authenticity of statutory time records. Consent evidence remains necessary for transparency and product control, but the statutory attendance obligation is the primary basis.

**Rule table mapping.** `time.biometric_clock` covers biometric template, face template, match, and consent tables under `ponto`.

### ADR-LGPD-005: Inscricao publica em concurso/processo seletivo

**Decision.** Use LGPD Art. 7, V for ordinary application data and Art. 11, II, d for quota/sensitive declarations used in administrative selection proceedings.

**Rationale.** The candidate initiates the application and asks for preliminary selection procedures. When quota declarations or other sensitive evidence are processed, the controller must preserve the administrative record and exercise/defend regular rights during the certame.

**Rule table mapping.** `recruitment.public_application` covers candidate, inscription, and payment-charge tables under `recrutamento`.

### ADR-LGPD-006: Proctoring e biometria em prova online

**Decision.** Use LGPD Art. 7, VI and Art. 11, II, d.

**Rationale.** Online exam artifacts exist to prevent fraud, audit the administrative competition, and support appeals. Deletion requests before the end of appeal/control deadlines must be handled by R2-43 policy and cannot remove evidence still needed for the administrative process.

**Rule table mapping.** `recruitment.online_exam_proctoring` covers online exam session, artifact, and biometric-template records.

### ADR-LGPD-007: Prontuario, ASO e PCMSO/PGR

**Decision.** Use LGPD Art. 7, II and Art. 11, II, f.

**Rationale.** Occupational health records are sensitive health data. Processing is tied to legal workplace-health obligations and performed by health professionals/services or under sanitary/occupational-health authority constraints.

**Rule table mapping.** `health.medical_record` covers health/pericia, ASO, medical leave, and work-accident tables.

### ADR-LGPD-008: eSocial, DCTFWeb, DIRF/Reinf e TCE

**Decision.** Use LGPD Art. 7, II and Art. 11, II, a.

**Rationale.** Regulatory transmissions are mandatory government reporting. They may include payroll, tax, functional, and SST facts, including sensitive data in specific official layouts.

**Rule table mapping.** `regulatory.esocial_reporting` covers generated eSocial events, fiscal debits, payroll financial records, and employee identifiers used by worker/regulatory adapters.

### ADR-LGPD-009: Transparencia ativa de remuneracao

**Decision.** Use LGPD Art. 7, III.

**Rationale.** Remuneration transparency is a public-policy/public-administration disclosure flow. It must keep minimization: publish public identifiers and remuneration aggregates without exposing CPF or private bank/contact fields.

**Rule table mapping.** `transparency.remuneration_publication` covers transparency snapshots and minimized employee references.

### R2 Follow-ups

- R2-39 creates tenant ROPA entries in `lgpd.ropa_entry`, exposed at `/api/v1/admin/lgpd/ropa`, referencing `lgpd.legal_basis_rule.flow_key` without duplicating legal-basis text in a second registry. See `docs/eng/domains/privacy-transparency.md`.
- R2-41 uses `requires_dpia`, `data_category`, and `sharing_scope` as classification inputs for RCIS triage while keeping incident workflow and deadlines in `lgpd.security_incident`. See `docs/eng/domains/privacy-transparency.md`.
- R2-43 creates tenant Art. 18 request tickets in `lgpd.data_subject_request`, exposed at `POST /api/portal/v1/lgpd/direitos`, referencing an active `lgpd.ropa_entry` and snapshotting this registry's retention/sharing rules without duplicating legal-basis text. See `docs/eng/domains/privacy-transparency.md`.

## PII at rest hardening

## PII at rest hardening

R2-204 tags PII-bearing database columns with `COMMENT ON COLUMN` metadata in `database/sql/13-pii-comments.sql`. The metadata uses `pii=true`, a classification, and `ropa_export=true`; `lgpd.v_pii_column_catalog` exposes those tags with active ROPA flow keys derived from `lgpd.legal_basis_rule.source_tables`.

`npm run db:alignment:check` treats the following PII classifications as
high-risk and requires both `<column>_cipher` and `<column>_cipher_key_id`
siblings for each tagged column: `banking`, `contact`, `national_identifier`,
`social_program_identifier`, and `tax_identifier`. This is the v0.0.1
machine-enforced scope for `scripts/lib/checks/db/pii-cipher-coverage.mjs`;
broader PII categories can be promoted only by updating this authority section
and the checker together.

R2-206 uses PostgreSQL `pgcrypto` for new writes to the highest-sensitivity payroll/RH identifiers:

- `hr.employee.bank_account` -> `hr.employee.bank_account_cipher`
- `hr.employee.pis_pasep` -> `hr.employee.pis_pasep_cipher`
- `hr.employee_complement_data.pis_pasep` -> `hr.employee_complement_data.pis_pasep_cipher`
- `hr.employee_bank_account.account_number` -> `hr.employee_bank_account.account_number_cipher`

R3-032 expands the non-destructive new-write batch to these high-risk HR
identity/banking columns from the live inventory:

- `hr.employee.cpf` -> `hr.employee.cpf_cipher`
- `hr.employee.rg` -> `hr.employee.rg_cipher`
- `hr.employee.bank_agency` -> `hr.employee.bank_agency_cipher`
- `hr.employee_complement_data.rg` -> `hr.employee_complement_data.rg_cipher`
- `hr.employee_complement_data.voter_registration` -> `hr.employee_complement_data.voter_registration_cipher`
- `hr.employee_bank_account.holder_cpf` -> `hr.employee_bank_account.holder_cpf_cipher`
- `hr.employee_dependent.cpf` -> `hr.employee_dependent.cpf_cipher`

R4-20 completes the high/medium candidate set from the round-3 live inventory
with ciphertext siblings for the remaining 19 CPF/CNPJ and contact columns:

- `fiscal.dirf_beneficiario.cpf_cnpj` -> `fiscal.dirf_beneficiario.cpf_cnpj_cipher`
- `hr.employee_alimony.beneficiary_cpf` -> `hr.employee_alimony.beneficiary_cpf_cipher`
- `hr.employee_benefit_dependent.dependent_cpf` -> `hr.employee_benefit_dependent.dependent_cpf_cipher`
- `hr.internship_record.intern_cpf` -> `hr.internship_record.intern_cpf_cipher`
- `hr.legal_responsible.cpf` -> `hr.legal_responsible.cpf_cipher`
- `hr.pension_grant.beneficiary_cpf` -> `hr.pension_grant.beneficiary_cpf_cipher`
- `hr.service_provider.cpf_cnpj` -> `hr.service_provider.cpf_cnpj_cipher`
- `public.user_account.cpf` -> `public.user_account.cpf_cipher`
- `recrutamento.banca_membro.cpf` -> `recrutamento.banca_membro.cpf_cipher`
- `recrutamento.candidato.cpf` -> `recrutamento.candidato.cpf_cipher`
- `hr.employee.email` -> `hr.employee.email_cipher`
- `hr.employee.phone` -> `hr.employee.phone_cipher`
- `hr.employee_complement_data.emergency_contact` -> `hr.employee_complement_data.emergency_contact_cipher`
- `hr.medical_appointment.contact_phone` -> `hr.medical_appointment.contact_phone_cipher`
- `hr.service_provider.email` -> `hr.service_provider.email_cipher`
- `hr.service_provider.phone` -> `hr.service_provider.phone_cipher`
- `public.user_account.email` -> `public.user_account.email_cipher`
- `recrutamento.candidato.email` -> `recrutamento.candidato.email_cipher`
- `recrutamento.candidato.phone` -> `recrutamento.candidato.phone_cipher`

The runtime supplies `SGP_PII_PGCRYPTO_KEY` and optional `SGP_PII_PGCRYPTO_KEY_ID`; the database session stores them as `app.pii_encryption_key` and `app.pii_encryption_key_id`. Decrypting views under `hr.v_*_pii_decrypted` preserve existing service contracts and append `PII_DECRYPT` audit events when ciphertext is decrypted.

No destructive backfill is part of R2-206 or R3-032. Existing plaintext rows
remain readable through fallback view columns until an owner-approved migration
defines the backfill window, operational freeze rules, verification evidence,
and key-rotation/retirement policy. R3-032 intentionally keeps the newly
covered plaintext columns populated for application compatibility while adding
ciphertext siblings for new writes when a session key is present; if the key is
absent, those non-destructive R3 fields keep plaintext and leave ciphertext
empty rather than blocking seed/import workflows.

R4-20 keeps the same non-destructive rule for the expanded batch. Existing rows
are not bulk-updated, nullable plaintext columns are not tightened, and triggers
encrypt only new writes or changed values when a session key is present. A future
owner-approved backfill must define the freeze window, row-count parity evidence,
key-retirement criteria, and rollback posture before plaintext retirement.

### Key rotation and backfill boundary

`database/sql/15a-pii-encryption-rotation.sql` adds the non-mutating rotation
primitive `hr.sgp_rotate_pii_cipher(...)` and the reviewed manifest
`hr.sgp_pii_cipher_rotation_manifest()`. The manifest is the operator checklist
for every high-risk plaintext/cipher/key-id triplet covered by
`scripts/lib/checks/db/pii-cipher-coverage.mjs`.

Rotation uses a dual-key window:

1. Load the old and new pgcrypto keys through the deployment secret boundary.
2. Run an operator-reviewed batch script generated from
   `hr.sgp_pii_cipher_rotation_manifest()`.
3. For each row, decrypt with the old key, re-encrypt with the new key through
   `hr.sgp_rotate_pii_cipher(...)`, and update the paired `_cipher_key_id`.
4. Verify row-count parity, non-null cipher count parity, and a sampled
   decrypt-read through the existing `hr.v_*_pii_decrypted` views.
5. Retire the old key only after rollback evidence and audit export are retained.

Backfill of existing plaintext into ciphertext remains owner-approved operator
work. SGP code and SQL may provide primitives and manifests, but automated
backfill execution, plaintext column tightening, and old-key retirement are not
part of normal migrations.

## LGPD treatment by public power

## LGPD treatment by public power

**Status:** Accepted for v0.0.1 R3-031.
**Runtime table:** `lgpd.public_power_treatment`.
**Backend surface:** `backend/src/lgpd/public-power.controller.ts`.

This workflow records the minimum auditable evidence for LGPD treatment by a
public controller under the existing ROPA/legal-basis model. It does not create
a second legal-basis registry and does not decide new legal interpretations.
Each record must point to an active tenant ROPA entry and the linked
`lgpd.legal_basis_rule`.

### Contract

`GET /api/v1/admin/lgpd/public-power-treatments` lists workflow records for the
tenant. It accepts optional `status` and `flowKey` filters. Read access follows
the LGPD audit pattern and requires `auditoria.read`.

`POST /api/v1/admin/lgpd/public-power-treatments` creates a workflow record
from either `ropaEntryId` or `flowKey`. Write access requires `gestao.write`.
When the operator does not supply a narrower value, the service defaults:

- `purpose` from the active legal-basis rule purpose
- `legalBasisReference` from the active legal-basis article and sensitive-basis
  article when present
- `responsibleArea` from the selected ROPA `controller_area`
- `evidenceRefs` from the legal-basis `decision_record_anchor`

`PATCH /api/v1/admin/lgpd/public-power-treatments/:id` updates mutable workflow
fields and the lifecycle status. Write access requires `gestao.write`.

Accepted statuses are:

- `REGISTERED`
- `UNDER_REVIEW`
- `SUSPENDED`
- `RETIRED`

### Captured Evidence

Each record stores:

- active `ropaEntryId`
- active `legalBasisRuleId`
- `flowKey`
- treatment `purpose`
- `legalBasisReference`
- `responsibleArea`
- `evidenceRefs`
- `status`
- `notes`
- `createdByRef` and `updatedByRef`

Create and update operations emit audit events with
`resourceType=lgpd_public_power_treatment` and
`tableName=lgpd.public_power_treatment`. Tenant isolation is enforced by RLS on
`lgpd.public_power_treatment`, and the table uses the same `gestao.write` write
policy shape as ROPA and RCIS.

### Exclusions

This workflow records operational evidence only. It does not publish public
notices, decide data-sharing legality, override ROPA/retention rules, perform
DPIA approval, or automate suspension of processing. Those decisions remain
owner/legal process until a future engineering spec defines exact rules.

## LGPD RCIS security-incident workflow

## LGPD RCIS security-incident workflow

**Status:** Accepted for v0.0.1 R2-41.
**Canonical table:** `lgpd.security_incident`.
**API:** `/api/v1/admin/lgpd/incidents`.
**Regulatory source:** Resolução CD/ANPD 15/2024, published in DOU on 2024-04-26.

R2-41 implements the Comunicação de Incidente de Segurança (RCIS) workflow for incidents that affect personal data and may create relevant risk or harm to data subjects. The workflow reuses the R2-39 ROPA entry and R2-40 legal-basis rule as classification evidence; it does not create another legal-basis registry.

### State Machine

| State          | Meaning                                                                                                                         | Exit                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `DETECTED`     | Incident registered and under initial investigation.                                                                            | `PATCH /:id/triage`     |
| `TRIAGED`      | Personal-data impact and relevant-risk assessment recorded. The ANPD clock is running when personal data is confirmed affected. | `PATCH /:id/report`     |
| `REPORTED`     | Initial ANPD communication recorded with protocol/contact evidence. The complementation clock is running.                       | `PATCH /:id/complement` |
| `COMPLEMENTED` | Complementary information/report submitted.                                                                                     | `PATCH /:id/close`      |
| `CLOSED`       | RCIS process closed after communication and mitigation evidence.                                                                | terminal                |

Out-of-order transitions are rejected by the service. The API intentionally keeps mutation access on existing `gestao.write` and read access on existing `auditoria.read`.

### Deadline Rules

The official RCIS clock is three business days for communication to ANPD, counted from controller knowledge that the incident affected personal data. The implementation records:

| Field                        | Rule                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `personal_data_confirmed_at` | Start of the communication timer.                                                                         |
| `anpd_due_at`                | `personal_data_confirmed_at` plus 3 business days.                                                        |
| `anpd_alert_at`              | `personal_data_confirmed_at` plus 2 business days, used by list responses to surface `requiresAnpdAlert`. |
| `anpd_reported_at`           | Date/time of initial ANPD communication.                                                                  |
| `complement_due_at`          | `anpd_reported_at` plus 20 business days.                                                                 |

The v0.0.1 deadline helper counts weekdays and preserves the source timestamp. Holiday-calendar integration can replace the helper later without changing the persisted RCIS fields.

### API Contract

| Method  | Route                                         | Permission       | Audit                           |
| ------- | --------------------------------------------- | ---------------- | ------------------------------- |
| `GET`   | `/api/v1/admin/lgpd/incidents`                | `auditoria.read` | read-only                       |
| `POST`  | `/api/v1/admin/lgpd/incidents`                | `gestao.write`   | `CREATE lgpd_security_incident` |
| `PATCH` | `/api/v1/admin/lgpd/incidents/:id/triage`     | `gestao.write`   | `UPDATE lgpd_security_incident` |
| `PATCH` | `/api/v1/admin/lgpd/incidents/:id/report`     | `gestao.write`   | `UPDATE lgpd_security_incident` |
| `PATCH` | `/api/v1/admin/lgpd/incidents/:id/complement` | `gestao.write`   | `UPDATE lgpd_security_incident` |
| `PATCH` | `/api/v1/admin/lgpd/incidents/:id/close`      | `gestao.write`   | `UPDATE lgpd_security_incident` |

`POST` accepts either a `flowKey`, a `ropaEntryId`, both, or neither. When a source is provided, the service resolves an active tenant ROPA entry and snapshots the linked `legal_basis_rule_id`/`flow_key` into the incident. List responses include ROPA classification hints (`dataCategory`, `requiresDpia`, `sharingScope`) and timer booleans (`requiresAnpdAlert`, `isAnpdOverdue`).

### Logging And Data Minimization

Incident workflow logs are structured with stable fields: `event`, `action`, `incidentId`, `fromStatus`, `toStatus`, `flowKey`, `severity`, `riskRelevant`, `anpdDueAt`, and `complementDueAt`. Free-text summaries, risk details, contact details, and affected category values are kept in the database and audit metadata only where required; they are not emitted in service logs. This lets the R2-58 pino redaction contract protect nested PII paths while keeping operational incident telemetry useful.

### Contract Evidence

Focused coverage:

| Test                                            | Evidence                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `backend/src/lgpd/incidents.service.spec.ts`    | business-day deadlines, ROPA linkage, transition ordering, 3-day ANPD timer, 20-day complementation timer          |
| `backend/src/lgpd/incidents.controller.spec.ts` | audit calls for creation and every state transition                                                                |
| `tests/backend/lgpd-rcis.e2e-spec.ts`           | HTTP contract for `DETECTED -> TRIAGED -> REPORTED -> COMPLEMENTED -> CLOSED` under `/api/v1/admin/lgpd/incidents` |

## LGPD ROPA registry

## LGPD ROPA registry

**Canonical table:** `lgpd.ropa_entry`
**API:** `/api/v1/admin/lgpd/ropa`
**Legal-basis source:** `lgpd.legal_basis_rule`

R2-39 implements the Registro de Operacoes de Tratamento (ROPA) as tenant-scoped operation records linked to the R2-40 legal-basis registry. ROPA entries store operational ownership, processors/recipients, safeguards, lifecycle evidence, review status, and risk level. Legal-basis text is not duplicated in ROPA; API responses join the active legal-basis rule by `flow_key`.

### API contract

| Method  | Route                         | Permission       | Audit                    |
| ------- | ----------------------------- | ---------------- | ------------------------ |
| `GET`   | `/api/v1/admin/lgpd/ropa`     | `auditoria.read` | read-only                |
| `POST`  | `/api/v1/admin/lgpd/ropa`     | `gestao.write`   | `CREATE lgpd_ropa_entry` |
| `PATCH` | `/api/v1/admin/lgpd/ropa/:id` | `gestao.write`   | `UPDATE lgpd_ropa_entry` |

`GET` accepts optional `flowKey` and `status` filters. `POST` requires `flowKey`, `operationName`, and `controllerArea`; it rejects unknown or inactive data-flow keys through `LgpdLegalBasisService.assertPiiReadAllowed(flowKey)`. `PATCH` can update mutable ROPA operation fields and can relink the entry to another active legal-basis flow key.

### Seed baseline

The seed script creates one tenant ROPA entry for each major R2-39 acceptance flow:

| Major flow   | Seeded `flow_key`                | Operation                                        |
| ------------ | -------------------------------- | ------------------------------------------------ |
| Folha        | `payroll.payslip_pdf`            | Payroll payslip generation and employee delivery |
| Ponto        | `time.attendance_register`       | Attendance register and time-bank processing     |
| Recrutamento | `recruitment.public_application` | Public recruitment application intake            |

Additional LGPD flows remain available from `lgpd.legal_basis_rule` and can be added to ROPA through the admin API without creating another legal-basis registry.

R2-41 RCIS incidents can link to an active ROPA entry through `lgpd.security_incident.ropa_entry_id`; the incident workflow snapshots the linked legal-basis rule and flow key without duplicating ROPA operation metadata. See `docs/eng/domains/privacy-transparency.md`.

### Database controls

`lgpd.ropa_entry` is tenant scoped, has RLS enabled, and uses these permissions:

| Operation     | RLS permission                                         |
| ------------- | ------------------------------------------------------ |
| Select        | any of `auditoria.read`, `gestao.read`, `gestao.write` |
| Insert/update | `gestao.write`                                         |

The table references `public.tenant` and `lgpd.legal_basis_rule`, with a uniqueness constraint on `(tenant_id, flow_key, operation_name)`.

### Contract evidence

Focused coverage:

| Test                                       | Evidence                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `backend/src/lgpd/ropa.service.spec.ts`    | joins ROPA with legal-basis rules, creates only for active flow keys, patches mutable fields |
| `backend/src/lgpd/ropa.controller.spec.ts` | verifies audit calls for POST/PATCH                                                          |
| `tests/backend/lgpd-ropa.e2e-spec.ts`      | exercises GET/POST/PATCH under `/api/v1/admin/lgpd/ropa` with RBAC and mutation audit        |

## LGPD titular-rights portal tickets

## LGPD titular-rights portal tickets

**Canonical table:** `lgpd.data_subject_request`
**API:** `POST /api/portal/v1/lgpd/direitos`
**Legal source:** LGPD Art. 18, incisos I through VI.
**ROPA source:** `lgpd.ropa_entry`
**Legal-basis source:** `lgpd.legal_basis_rule`

The employee portal creates an LGPD Art. 18 request ticket instead of executing
data mutation inline. The ticket is tenant-scoped, records the authenticated
portal actor, links to an active ROPA entry by `flow_key`, snapshots the
retention and sharing rules from `lgpd.legal_basis_rule`, and starts the local
manual-process SLA timer documented in `docs/eng/platform.md`.

### Accepted right types

| Type                              | Art. 18 grounding                                                                     | Initial triage         |
| --------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- |
| `CONFIRMATION`                    | I - confirmation of processing existence                                              | `EXECUTABLE`           |
| `ACCESS`                          | II - access to data                                                                   | `EXECUTABLE`           |
| `CORRECTION`                      | III - correction of incomplete, inaccurate, or outdated data                          | `EXECUTABLE`           |
| `ANONYMIZATION_BLOCKING_DELETION` | IV - anonymization, blocking, or deletion of unnecessary, excessive, or unlawful data | `RETENTION_RESTRICTED` |
| `PORTABILITY`                     | V - portability on express request, subject to ANPD regulation and protected secrets  | `EXECUTABLE`           |
| `CONSENT_DELETION`                | VI - deletion of personal data processed with consent, except Art. 16 cases           | `RETENTION_RESTRICTED` |

`RETENTION_RESTRICTED` means the portal has accepted the request, but execution
requires controller/DPO triage against the stored retention rule. R2-43 does not
implement RCIS, does not create another legal-basis registry, and does not add a
new RBAC permission; the portal endpoint uses the existing
`portal.profile.write` permission.

### Contract evidence

`tests/backend/lgpd-direitos-titular.e2e-spec.ts` exercises the six accepted
right types through `POST /api/portal/v1/lgpd/direitos`, verifies ticket
creation, SLA timestamps, ROPA/legal-basis snapshots, and mutation audit.
