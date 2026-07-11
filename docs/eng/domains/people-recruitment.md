# People And Recruitment Domain Authority

Authored domain authority for people, recruitment, concursos, appointment, quotas, and related workflows.

## Merged Artifact Index

- Concursos publicos
- LGPD no recrutamento
- Recursos de prova em concursos
- Cotas de recrutamento
- Prazos de nomeacao e convocacao
- Proctoring Online em Concursos Publicos
- Assinatura Digital da Banca Examinadora — XAdES/PAdES
- Frontend i18n posture roadmap
- RH Workflows

## Regulatory References Cross-Reference

This table maps people and recruitment references to current implementation or
retained decision evidence.

| Reference                                  | Obligation cluster                                  | Implementation / evidence path:line                               | Current posture                                                 |
| ------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `docs/refs/legal/concursos-publicos.md`    | Concurso, temporary hiring, nomination, possession  | database/sql/10-11-recrutamento-ddl.sql:1                         | Implemented recruitment schema and portal/admin surfaces.       |
| `docs/refs/legal/licencas-estatutarias.md` | Statutory leaves and service-time workflows         | backend/src/rh/workflows/leaves/leaves.service.ts:1               | Implemented leave surface with policy breadth tracked.          |
| `docs/refs/legal/lei-14133-licitacoes.md`  | Procurement reference for outsourced HR contracting | docs/gov/evidence/deferred-decision-ledger.md:1                   | Reference-only for v0.0.1; procurement runtime is out of scope. |
| `docs/refs/lgpd/lei-13709.md`              | Candidate and employee personal-data handling       | backend/src/recrutamento/inscricao/inscricao.service.ts:1         | Implemented explicit consent in public recruitment flow.        |
| `docs/refs/lgpd/pii-categorias-cpf-bio.md` | Sensitive candidate biometrics                      | backend/src/recrutamento/biometria/biometric-capture.service.ts:1 | Implemented local biometric capture and consent controls.       |

## Concursos publicos

## Concursos publicos

### Escopo

O modulo `recrutamento/concurso` administra a abertura de concursos publicos do SGP v0.0.1. Ele cobre cadastro do certame, vagas por cargo, reservas legais, versionamento de edital, publicacao do edital no Portal Transparencia, inscricao publica de candidatos, etapa de avaliacao, classificacao final, nomeacao e convocacao. Posse e exercicio ficam em REC-06.

### Modelo operacional

Cada concurso nasce em `DRAFT` com codigo publico, nome, validade e criador. As vagas sao registradas por cargo (`hr.job_position`) e podem referenciar a definicao de organico vigente (`hr.organic_definition`) para travar a lotacao/cargo autorizados e o quadro de vagas consumido pelo certame. Cada vaga guarda total de vagas, reserva PCD, reserva racial, reserva indigena/quilombola quando aplicavel, requisitos em JSON e salario-base em `numeric(14,2)`.

O edital e versionado em `recrutamento.edital`. Cada versao guarda referencia documental, ato administrativo, data do ato e prazo para recursos de prova quando houver etapa avaliativa. A publicacao exige uma versao existente do edital, ato administrativo, data do ato e URL publica. Ao publicar, o edital recebe `published_at`, `public_url` e o concurso passa para `PUBLISHED`; concursos publicados ficam disponiveis sem autenticacao em `/api/v1/publico/concursos/:slug`.

### Inscricao publica

O endpoint `POST /api/v1/publico/concursos/:slug/inscricoes` recebe inscricoes sem JWT, identificando o candidato por CPF e exigindo consentimento LGPD explicito com versao do termo. O fluxo grava `recrutamento.candidato`, `recrutamento.inscricao` e, quando nao ha isencao, `recrutamento.payment_charge` com gateway abstrato plugavel. O retorno inclui token de acompanhamento; `GET /api/v1/publico/inscricoes/:id?token=...` consulta somente a inscricao correspondente ao token.

A validacao do cargo usa o `requirement` JSON da vaga para idade minima, escolaridade e registro profissional. Autodeclaracoes de cota sao aceitas apenas de forma explicita para PCD, racial ou indigena. As regras federais de isencao cobrem CadUnico pelo Decreto 6.593/2008 e doadores de medula pela Lei 13.656/2018; inscricoes isentas ficam `EXEMPT` e nao geram cobranca.

### Provas, gabaritos e notas

As provas ficam em `recrutamento.prova` e podem ser objetivas, discursivas, praticas ou de titulos. Questoes ficam numeradas em `recrutamento.questao`; respostas dos candidatos ficam em `recrutamento.resposta_candidato`. O gabarito e versionado em `recrutamento.gabarito` como preliminar, final ou superseded. Um gabarito `FINAL` nao pode ser alterado in-place: correcao posterior cria nova versao e supersede a versao anterior.

A funcao `recrutamento.recompute_notas(prova_id, gabarito_version)` reaplica o gabarito vigente, recalcula `recrutamento.nota` e gera auditoria por candidato cuja nota mudou. A consulta publica `/api/v1/publico/inscricoes/:id/notas?token=...` mostra nota e espelho apenas para o token da inscricao.

### Classificacao final

A classificacao REC-04 consolida as notas em `recrutamento.classificacao_snapshot` e `recrutamento.classificacao_item`. A geracao administrativa chama `recrutamento.gerar_classificacao(concurso_id)` por `POST /api/v1/admin/concursos/:id/classificacao`; a publicacao usa `POST /api/v1/admin/concursos/:id/classificacao/publicacao` e torna a versao visivel em `/api/v1/publico/concursos/:slug/classificacao`. Snapshots publicados sao imutaveis: uma nova publicacao deve superseder a versao anterior em vez de alterar a lista publicada.

O ranking por vaga ordena por nota total ponderada decrescente, aplica prioridade do idoso em empates conforme Lei 10.741/2003 art. 27 paragrafo unico, depois maior idade e, por fim, identificador da inscricao para estabilidade reprodutivel. Provas podem marcar `required_for_classification`, `minimum_raw_score` e `minimum_weighted_score`; ausente em prova obrigatoria ou nota inferior ao minimo gera `eliminated_reason` e remove o candidato da lista geral aprovada.

### Nomeacao e convocacao

A nomeacao REC-05 consome a classificacao publicada sem recalcular ranking. A funcao `recrutamento.proxima_chamada(concurso_id, vaga_id)` retorna a proxima inscricao elegivel pela ordem de chamada ja publicada, respeitando a alternancia de cotas registrada em `allocation_bucket` e ignorando candidatos ja nomeados. Quando a vaga possui `organic_definition_id`, o retorno administrativo de nomeacao inclui essa referencia para que posse/exercicio e controle de lotacao sigam a mesma definicao de organico usada na abertura do concurso. A API administrativa `POST /api/v1/admin/nomeacoes` cria `recrutamento.nomeacao` com ato administrativo, data de publicacao e prazo de comparecimento de 30 dias corridos; o backend rejeita nomeacao apos `recrutamento.concurso.valid_until`.

Convocacoes ficam em `recrutamento.convocacao` por canal `PUBLICACAO_OFICIAL`, `EMAIL` ou `POSTAL`. A publicacao oficial e o postal exigem referencia manual de evidencia. O canal `EMAIL` registra `evidence_ref` contendo `messageId` do provedor; em ambiente local o provedor deterministico usa prefixo `email:messageId=local-...`. Desistencia manual muda a nomeacao para `DESISTENTE`. A expiracao de prazo muda `NOMEADO` ou `CONVOCADO` vencido para `EXONERADO_POR_NAO_POSSE`; a operacao e idempotente para permitir reexecucao segura pelo worker.

REC-06 acrescenta `recrutamento.posse` para agendar a posse, controlar o prazo de exercício de 15 dias úteis, registrar a lotação inicial em `hr.work_location` e efetivar o candidato como servidor somente no estado `EXERCICIO`. A função `recrutamento.efetivar_posse(posse_id)` cria `hr.employee`, `hr.employment_link`, `hr.employment_contract` e histórico funcional ativo em uma transação, grava auditoria e atualiza a nomeação para `EXERCICIO`. Depois da transação, o backend publica `recrutamento.posse.exercicio` e chama o fluxo ES-02 para enfileirar exatamente um evento S-2200 para o servidor. Cancelamento depois da criação do servidor fica bloqueado e deve seguir o desligamento/rescisão do CALC-12.

### Recursos de prova

Recursos ficam em `recrutamento.recurso` e so podem ser abertos enquanto `recrutamento.edital.resource_deadline_at` estiver vigente. A banca registra parecer e decisao administrativa, observando a publicidade e a impessoalidade do art. 37 da Constituicao Federal. A revisao judicial do gabarito segue a tese do STF no RE 632.853: nao ha substituicao ordinaria da banca pelo Judiciario, ressalvadas ilegalidades e erro grosseiro.

### Reservas legais

A validacao de backend bloqueia vagas com reserva superior ao total. Para cargos com cinco ou mais vagas, a reserva PCD minima e 5%, em alinhamento com CF art. 37 VIII, LBI 13.146/2015 e Decreto 9.508/2018. Para cargos com tres ou mais vagas, a reserva racial minima e 20%, conforme Lei 12.990/2014. A classificacao intercala a reserva racial nas posicoes 3, 8, 13 e subsequentes da chamada quando houver candidatos autodeclarados habilitados; candidatos negros aprovados pela ampla concorrencia nao consomem vaga reservada. Cotas locais para indigenas e quilombolas sao registradas em campo proprio e devem observar a norma municipal aplicavel.

### Seguranca e auditoria

As tabelas `recrutamento.concurso`, `recrutamento.edital`, `recrutamento.vaga`, `recrutamento.candidato`, `recrutamento.inscricao`, `recrutamento.payment_charge`, `recrutamento.prova`, `recrutamento.questao`, `recrutamento.gabarito`, `recrutamento.resposta_candidato`, `recrutamento.recurso`, `recrutamento.nota`, `recrutamento.classificacao_snapshot`, `recrutamento.classificacao_item`, `recrutamento.nomeacao`, `recrutamento.convocacao` e `recrutamento.posse` sao tenant-scoped e usam RLS com `sgp_tenant_matches(tenant_id)`. Toda mutacao dispara trigger com `sgp_append_audit_event(...)`. A API administrativa exige `@RequirePermission`; a leitura publica usa funcao `SECURITY DEFINER` limitada a concursos `PUBLISHED` ou `OPEN` com edital publicado, e o acompanhamento de inscricao publica e protegido por token de consulta.

## LGPD no recrutamento

## LGPD no recrutamento

### Escopo

Este documento define o tratamento de dados pessoais do portal publico de inscricao em concursos do SGP v0.0.1. A inscricao coleta CPF, nome, nascimento, contato, endereco, evidencias de requisito do cargo, autodeclaracao de cota e evidencias de isencao quando solicitadas.

### Base legal e consentimento

O fluxo exige consentimento explicito antes da inscricao, persistindo `lgpd_consent_at` e `lgpd_consent_version` em `recrutamento.candidato`. A base operacional combina consentimento do titular, execucao de politica publica de concurso e cumprimento de obrigacao legal, conforme Lei 13.709/2018 art. 7. A ausencia de consentimento bloqueia a inscricao com resposta 422.

### Finalidade

Os dados sao usados exclusivamente para identificar o candidato, validar requisitos objetivos da vaga, registrar autodeclaracoes de cota, avaliar isencoes previstas no Decreto 6.593/2008 e na Lei 13.656/2018, gerar cobranca via gateway abstrato e permitir acompanhamento da inscricao por token.

### Retencao e direitos do titular

Os dados de inscricao ficam vinculados ao concurso e ao tenant responsavel. A retencao deve seguir o edital, normas arquivisticas e prazos de controle externo. O titular pode solicitar confirmacao de tratamento, acesso, correcao e informacoes sobre compartilhamento pelos canais definidos pelo controlador municipal. Exclusao ou anonimizacao so ocorre quando compativel com as obrigacoes legais do concurso e com a preservacao de auditoria.

### Seguranca

As tabelas de candidato, inscricao e cobranca sao tenant-scoped, protegidas por RLS e auditadas por `sgp_append_audit_event(...)`. A rota publica de consulta nao expõe busca livre por CPF; exige identificador da inscricao e token gerado na criacao. Gateways de pagamento concretos devem manter o mesmo contrato sem armazenar segredos no repositorio.

## Banco de Talentos

Banco de Talentos is SGP-owned for v0.0.1. The accepted defaults are:

- intake requires LGPD consent version and timestamp before persistence;
- authenticated portal/admin intake stores the candidate in
  `recrutamento.candidato`;
- storage of curriculum files remains at the Stynx storage boundary through
  object references, never scanner/quarantine logic;
- ranking is deterministic: profile completeness, skills count, profile
  summary depth, curriculum evidence, and stable tie-breakers decide ordering;
- opt-out archives the profile through `pool_status = ARCHIVED` and preserves
  audit/retention evidence rather than hard deleting candidate history.

The backend response exposes `profileCompletenessScore` and `rankingScore` for
operator triage. The values are advisory defaults; a later hiring policy may
override weighting only through an explicit `docs/eng` change and matching
tests.

## Recursos de prova em concursos

## Recursos de prova em concursos

### Escopo

Este documento define o fluxo REC-03 para provas, gabaritos, recursos e notas. A classificacao final e criterios de desempate pertencem ao REC-04.

### Fluxo operacional

1. A banca cria `recrutamento.prova` para o concurso e cadastra suas questoes em `recrutamento.questao`.
2. As respostas dos candidatos confirmados sao lancadas em `recrutamento.resposta_candidato`.
3. O gabarito preliminar e publicado em `recrutamento.gabarito` com `status = PRELIMINARY`.
4. Candidatos podem abrir `recrutamento.recurso` ate `recrutamento.edital.resource_deadline_at`.
5. A banca decide cada recurso com parecer, marcando `UPHELD` ou `REJECTED`.
6. Quando o gabarito final e republicado, uma nova versao e criada; versoes finais nao podem ser alteradas in-place.
7. `recrutamento.recompute_notas(prova_id, gabarito_version)` reaplica o gabarito, atualiza `recrutamento.nota` e registra auditoria por candidato cuja nota mudou.

### Regras juridicas

O fluxo preserva publicidade, impessoalidade e motivacao administrativa, em alinhamento com CF art. 37 II. A decisao do recurso deve registrar parecer objetivo e rastreavel. Conforme a tese do STF no RE 632.853, revisao judicial ordinaria nao substitui a banca examinadora, ressalvadas ilegalidades, erro grosseiro ou violacao do edital.

### Seguranca e auditoria

As tabelas de avaliacao sao tenant-scoped e protegidas por RLS com `sgp_tenant_matches(tenant_id)` e permissoes `recrutamento.avaliacao.read` / `recrutamento.avaliacao.write`, alem das permissoes amplas `recrutamento.read` / `recrutamento.write`. Toda mutacao dispara `sgp_append_audit_event(...)`. A consulta publica de notas exige id da inscricao e token; nao ha busca publica livre por CPF, prova ou concurso.

## Cotas de recrutamento

## Cotas de recrutamento

### Escopo

Este documento define a alocacao de cotas em concursos publicos no REC-04. A heteroidentificacao racial, pericia biopsicossocial PCD e bancas especificas ficam para fase posterior; o REC-04 usa somente autodeclaracoes explicitas ja registradas na inscricao.

### Regras gerais

Cada vaga de concurso registra total de vagas e reservas PCD, racial e indigena/quilombola. A reserva total nao pode exceder o total de vagas. Para concursos com tres ou mais vagas, a reserva racial minima e de 20% conforme Lei 12.990/2014. Para cargos com cinco ou mais vagas, a reserva PCD minima e de 5%, em alinhamento com CF art. 37 VIII, LBI 13.146/2015 e Decreto 9.508/2018.

O candidato sempre participa da lista geral. Quando uma pessoa autodeclarada cotista alcanca vaga pela lista geral, ela permanece na ampla concorrencia e nao consome a reserva. As listas de cota sao derivadas da mesma classificacao, preservando nota total, prioridade do idoso em empate, maior idade e chave estavel de inscricao.

### Ordem de chamada

A chamada racial segue a Lei 12.990/2014 art. 3o: quando houver reserva racial e candidatos habilitados, as vagas reservadas sao intercaladas nas posicoes 3, 8, 13 e assim sucessivamente. Se nao houver candidato racial habilitado disponivel para a posicao reservada, a posicao e preenchida pela proxima pessoa da lista geral.

A chamada PCD usa a reserva configurada da vaga e seleciona a proxima pessoa PCD habilitada quando a posicao reservada estiver disponivel. O snapshot registra `allocation_bucket` e `call_order` para deixar auditavel se uma chamada veio da ampla concorrencia ou de lista reservada.

### Reprodutibilidade

`recrutamento.classificacao_snapshot` congela a versao gerada com `tiebreak_rules`. Publicar um snapshot torna seus itens imutaveis. Nova revisao administrativa deve gerar outro snapshot, publicar a nova versao e marcar a anterior como `SUPERSEDED`; nao ha edicao in-place de resultado publicado.

### Exemplo

Em uma vaga com 10 chamadas e duas reservas raciais, a lista publica usa as posicoes 3 e 8 para a lista racial, caso existam candidatos habilitados ainda nao chamados pela ampla concorrencia. As demais posicoes seguem a lista geral, exceto reservas PCD configuradas.

## Prazos de nomeacao e convocacao

## Prazos de nomeacao e convocacao

### Escopo

Este documento define a politica REC-05 para nomeacao, convocacao e controle do prazo de comparecimento em concursos publicos. A posse e o exercicio funcional permanecem em REC-06; REC-05 nao cria servidor ativo nem vinculo em `hr.employee`.

### Validade do concurso

O campo `recrutamento.concurso.valid_until` e a data-limite administrativa do certame. A API de nomeacao rejeita qualquer ato cuja publicacao ocorra depois dessa data, retornando 422. A prorrogacao da validade nao e automatica: exige ato administrativo previo e atualizacao manual de `valid_until`, respeitando a Constituicao Federal art. 37 III e IV.

### Prazo de comparecimento

Cada registro em `recrutamento.nomeacao` guarda `published_at` e `comparecimento_until`. O prazo padrao e de 30 dias corridos a partir da publicacao do ato, alinhado a Lei 8.112/1990 art. 13 para posse. Enquanto o prazo nao vence, a nomeacao pode estar `NOMEADO` ou `CONVOCADO`; a convocacao por publicacao oficial, email ou postal fica evidenciada em `recrutamento.convocacao`.

### Expiracao e reexecucao

O worker de integracoes executa a rotina de expiracao antes de processar filas documentais. A funcao `recrutamento.expirar_prazo_nomeacao(nomeacao_id)` altera somente nomeacoes vencidas em `NOMEADO` ou `CONVOCADO` para `EXONERADO_POR_NAO_POSSE`; reexecutar a funcao para o mesmo registro nao gera nova mudanca de estado nem duplica evento operacional. A proxima chamada continua derivada da classificacao publicada por `recrutamento.proxima_chamada(concurso_id, vaga_id)`.

### Evidencias de convocacao

Convocacao por `PUBLICACAO_OFICIAL` registra a referencia do diario oficial ou URL institucional. Convocacao por `EMAIL` registra `evidence_ref` com `messageId` do provedor. Convocacao por `POSTAL` registra AR, protocolo ou outro comprovante manual. Todos os registros sao tenant-scoped, protegidos por RLS e auditados por `sgp_append_audit_event(...)`.

## Proctoring Online em Concursos Publicos

## Proctoring Online em Concursos Publicos

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** Recrutamento e Selecao / Portal Publico | **Depende de:** REC-03, REC-07, XCUT-04

---

### 1. Modelo de Sessao

A prova online usa uma sessao tenant-scoped em `recrutamento.online_exam_session`, vinculada a uma inscricao confirmada e a uma prova do mesmo concurso. A abertura exige consentimento especifico para gravacao de audio, video e tela, camera, microfone, compartilhamento de tela e verificacao biometrica positiva do candidato. Se qualquer constraint obrigatoria for negada, a sessao nao inicia e a tentativa rejeitada entra na trilha de auditoria.

### 2. Proctoring Hibrido

O portal publico mantem indicador permanente de gravacao, contador regressivo e captura periodica de snapshots. O backend recebe eventos e artefatos em `recrutamento.proctoring_event` e `recrutamento.proctoring_artifact`. A perda de screen-share e sempre severa. As heuristicas locais registram flags como `VOICE_MISMATCH`, `GAZE_OFF_SCREEN`, `PROHIBITED_APP` e `LIVENESS_FAIL` com score `numeric(18,6)`.

### 3. Revisao Humana

Flags de IA ficam inicialmente `PENDING`. A banca revisora pode aceitar os eventos ou anular a sessao. A anulacao e atomica: a sessao original passa para `VOIDED`, recebe motivo, os eventos pendentes passam para `REJECT` e uma nova sessao `SCHEDULED` e criada para re-agendamento.

### 4. Retencao e LGPD

Artefatos de snapshot, audio e frame de tela recebem `retention_until` igual ou posterior a data do edital mais cinco anos. Pedidos de exclusao antes do fim da retencao ficam `PENDING` com base legal de exercicio regular de direitos em processo administrativo de concurso publico. Depois do prazo recursal/legal, os artefatos podem ser apagados.

### 5. Autorizacao e Auditoria

As permissoes sao `recrutamento.exam.read`, `recrutamento.exam.write` e `recrutamento.exam.review`. Todas as tabelas REC-08 tem RLS forcado por `sgp_tenant_matches(tenant_id)` e permissao de prova online. Toda mutacao passa por `sgp_append_audit_event(...)`.

## Assinatura Digital da Banca Examinadora — XAdES/PAdES

## Assinatura Digital da Banca Examinadora — XAdES/PAdES

**Versão:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** `recrutamento/banca` | **Base:** Lei 14.063/2020, MP 2.200-2/2001, CF art. 37 II, Lei 8.112/1990 art. 5-15

**Truth banner:** The current runtime preserves sequential signature evidence
and public verification metadata. Real CMS/PKCS#7/PAdES signing, certificate
chain validation, and production Gov.br provider integration remain deferred in
`103-deferred-decision-ledger.md#deferred-decision-ledger`.

### Decisão

O SGP registra membros da banca examinadora por concurso e permite assinatura sequencial com evidência verificável para documentos formais: gabarito final, ata da banca, lista de aprovados e outros atos correlatos. Cada assinatura gera uma linha própria em `recrutamento.document_signature`, preserva a ordem de assinatura e atualiza o hash público do documento assinado. A validade legal de XAdES/PAdES real depende da decisão pendente de provedor/assinador.

### Fluxo

1. Usuário com `recrutamento.banca.write` cadastra membros ativos da banca com tipo de certificado `ICP_A1`, `ICP_A3`, `GOVBR_OURO` ou `GOVBR_PRATA`.
2. O documento oficial é criado em `recrutamento.signed_document` com token público de verificação e QR/link embutido antes da assinatura.
3. Cada membro assina uma vez. O backend bloqueia a linha do documento, valida o estado do certificado, anexa a assinatura seguinte e grava auditoria por `sgp_append_audit_event(...)`.
4. Após três assinaturas sequenciais, o documento passa para `SIGNED` e pode ser publicado.
5. A rota anônima `GET /api/v1/publico/banca/verify/:token` retorna somente metadados públicos: hash, tipo, formato, status, nomes/funções dos signatários, data de assinatura e validade da cadeia. CPF e material privado de certificado não são expostos.

### Segurança e Auditoria

As tabelas são tenant-scoped e usam RLS com `sgp_tenant_matches(tenant_id) AND sgp_has_any_permission(...)`. Leituras exigem `recrutamento.banca.read` ou `recrutamento.banca.write`; mutações exigem `recrutamento.banca.write`. Toda mutação é auditada por trigger SQL e pelos controllers decorados com `@AuditMutation`.

### Verificação Pública

A verificação pública recalcula a cadeia sequencial de assinaturas a partir do payload assinado. Qualquer alteração posterior no PDF/XML ou no envelope de assinatura torna o resultado `valid=false`, mantendo a publicidade do ato e a impugnabilidade do concurso sem revelar dados pessoais sensíveis dos membros da banca.

## Frontend i18n posture roadmap

The Round 4 i18n posture is measurement-first. `scripts/audit.mjs fe-i18n --round 4`
quantifies hard-coded user-facing string candidates across
`frontend/src/app/features`, emits `docs/gov/audit/diag/round-4/fe-i18n-coverage.md`,
and preserves the machine-readable inventory in
`docs/gov/audit/inv/round-4/fe-i18n-coverage.json`.

The roadmap sequence for en-US and es candidates is:

1. Keep the current pt-BR source locale and Angular extraction contract as the
   runtime baseline.
2. Use the Round 4 audit output to prioritize recruitment, public portal, and
   portal employee flows before administrative-only screens.
3. Convert static templates and UI metadata to Angular i18n markers in feature
   batches, preserving backend/business messages and dynamic domain text.
4. Regenerate translation catalogs only after each feature batch has a reviewed
   message-id namespace and accessibility attributes remain covered.

## RH Workflows

## RH Workflows

The modern RH slice implements the legacy SGP RH route family as PostgreSQL-backed NestJS APIs and a route-aware Angular workspace.

### Implemented Workflow Coverage

| Legacy route                           | Modern API resource                   | Status      | Notes                                                                                         |
| -------------------------------------- | ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `#!/funcionario/gestao`                | `/employees`                          | observed    | Employee registry list, create, update, and deactivate.                                       |
| `#!/dependente/gestao`                 | `/rh/dependents`                      | observed    | Employee dependents with CPF, birth date, relationship, and IR dependent flag.                |
| `#!/experienciaProfissional/gestao`    | `/api/v1/rh/professional-experiences` | implemented | Prior professional experience and period fields persisted in `hr.professional_experience`.    |
| `#!/frequencia/gestao`                 | `/rh/frequencies`                     | observed    | Frequency and absence days, with import request endpoint.                                     |
| `#!/diaUtil/gestao`                    | `/consultas/business-days`            | observed    | Tenant-scoped business-day calendar backed by `hr.business_day`, including holiday overrides. |
| `#!/historicoSituacaoFuncional/gestao` | `/rh/status-history`                  | observed    | Functional status history and afastamento reasons.                                            |
| `#!/nivelSalarialHistorico/gestao`     | `/rh/salary-history`                  | observed    | Salary level/reference history.                                                               |
| `#!/tempoServico/gestao`               | `/rh/service-time`                    | observed    | Service-time periods and day counts.                                                          |
| `#!/transferenciaFuncionario/gestao`   | `/rh/transfers`                       | observed    | Employee branch/work-location transfers.                                                      |
| `#!/dadoCadastralComplementar/gestao`  | `/rh/complement-data`                 | inferred    | Implemented because the legacy route was present but access was restricted during extraction. |
| `#!/definicaoOrganico/gestao`          | `/rh/organic-definitions`             | implemented | CRUD de `hr.organic_definition`, vinculando lotacao, cargo e vagas autorizadas por vigencia.  |
| `#!/feriasProgramacao/gestao`          | `/rh/vacations`                       | inferred    | Vacation scheduling workflow.                                                                 |
| `#!/licencaPremio/gestao`              | `/api/v1/licencas`                    | implemented | Licença-prêmio record management through general leave requests with reason `premio`.         |

### Backend Behavior

- RH workflow APIs are guarded by Cognito JWT and permission guards.
- Read operations require `rh.read`.
- Mutating operations require `rh.write`.
- Professional-experience record management is exposed through `GET /api/v1/rh/professional-experiences`, `POST /api/v1/rh/professional-experiences`, `PATCH /api/v1/rh/professional-experiences/:id`, and `DELETE /api/v1/rh/professional-experiences/:id`; it reuses the workflow service, `hr.professional_experience`, and RH mutation audit records.
- Training-certificate management is exposed through `GET /api/v1/rh/certificacoes`, `POST /api/v1/rh/certificacoes`, `PATCH /api/v1/rh/certificacoes/:id`, and `DELETE /api/v1/rh/certificacoes/:id`; reads require `rh.certification.read`, mutations require `rh.certification.write`, and mutations are audited against `hr.training_certificate`.
- Individual development plans are exposed through `GET /api/v1/rh/pdi`, `POST /api/v1/rh/pdi`, `GET /api/v1/rh/pdi/:id`, and `PATCH /api/v1/rh/pdi/:id`. Their goals are exposed through `GET /api/v1/rh/pdi/:id/metas`, `POST /api/v1/rh/pdi/:id/metas`, `PATCH /api/v1/rh/pdi/metas/:goalId`, and `DELETE /api/v1/rh/pdi/metas/:goalId`; reads require `rh.development_plan.read`, mutations require `rh.development_plan.write`, and mutations are audited against `hr.development_plan` and `hr.development_plan_goal`.
- Licença-prêmio uses the general leave surface `POST /api/v1/licencas` with reason `premio`, defaults to 90 paid days, and calls `hr.f_validate_leave_eligibility` before inserting `hr.leave_record`.
- Licença-prêmio balance is exposed through `GET /api/v1/funcionarios/:employeeId/licenca-premio/balance`; it uses `hr.service_time_record` and consumed `hr.leave_record` rows with reason `premio` to compute 5-year cycles, 90-day entitlements, consumed days, available days, and next-cycle remaining service days. Pecuniary conversion on termination/retirement remains payroll-impacting policy and is deferred in `docs/gov/evidence/deferred-decision-ledger.md`.
- Business-day queries are exposed as `GET /api/v1/consultas/business-days?startDate=yyyy-mm-dd&endDate=yyyy-mm-dd`; the service treats Monday-Friday as the default workweek and applies active `hr.business_day` rows as tenant-scoped overrides, so configured holidays can make weekdays non-working and configured compensations can make weekends working.
- Frequency creation defaults `worked_days` from the business-day calendar for the submitted year/month when the caller does not provide `workedDays`; explicit caller values still win.
- Vacation scheduling resolves omitted installment `days` through the same business-day calendar before persisting `hr.vacation_record`.
- Report request creation is exposed through `/rh/reports/:reportKey/requests`.
- Import/process request creation is exposed through `/rh/imports/:kind`.
- All persisted workflow data uses PostgreSQL tables via `DatabaseService`; there is no in-memory runtime persistence.
- Mutations append audit events when audit persistence is configured.
- Cadastro mutations that edit `hr.employee` or `hr.employment_link` use optimistic locking. Rows carry an integer `version` starting at `0`; database triggers increment it on each update. API reads expose the current version, single-resource cadastro reads emit `ETag: "<version>"`, and mutating cadastro requests must send `If-Match: "<version>"`. A stale version is rejected with HTTP 412 so parallel editors cannot silently overwrite each other.
- F-RH-003 definicao de organico is first-class in `hr.organic_definition`. Each row links one `hr.work_location` to one `hr.job_position`, stores total/provided/open vacancies with database consistency checks, and exposes `GET/POST /api/v1/rh/organic-definitions` plus `PATCH/DELETE /api/v1/rh/organic-definitions/:id` for RH operators. Concurso vagas may reference the organic definition so nomeacao and later posse keep the same authorized staffing slot.

### Frontend Behavior

- The RH Angular module maps each legacy child route to a workflow configuration.
- Explicit RH feature routes are protected by `permissionGuard` and reuse the existing v0.0.1 permission catalog (`rh.*`, `hr.*`, and `portal.profile.*` where applicable) so unauthorized users do not see guarded RH affordances before backend denial.
- `/rh/funcionario` uses `/employees`.
- Other `/rh/<legacy-child>` routes use `/rh/<workflow-key>`.
- Dynamic forms include required fields and fields inferred from the legacy extraction and database model.
- Inferred legacy routes are visibly marked as inferred in the RH header.

### Remaining Gaps

- The dynamic RH form currently accepts UUIDs for lookup relationships instead of searchable autocomplete pickers.
- Employee registry create/update only covers the basic registry fields currently exposed by `EmployeesService`.
- Legacy-only validations that were not observable in the AngularJS UI remain unverified.
