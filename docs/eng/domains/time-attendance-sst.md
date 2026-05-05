# Time, Attendance, And SST Domain Authority

Authored domain authority for Portaria 671 time capture, REP/AFD, banked hours, justifications, payroll integration, and SST.

## Merged Artifact Index

- Ponto biometrico: Portaria 671 e LGPD
- Ponto Mobile com Geofence — PONTO-09
- PONTO-01 — Base Portaria MTP 671/2021
- SST - ASO e exames ocupacionais
- PONTO-02 - Ingestao REP-P, REP-A e REP-C
- SST-02 — PCMSO e PGR: revisoes e ciclo de vida
- PONTO-03 - AFD Geracao e Importacao
- CAT e Prazos SST
- PONTO-04 — Escalas, Plantões e Turnos
- SST-05 — Riscos Ambientais, EPI e PPP
- PONTO-05 — Banco de horas
- PONTO-06 - Justificativa de ausencia e abono
- PONTO-07 - Integracao entre ponto e folha
- Politica de fuso horario para jornada

## Regulatory References Cross-Reference

This table maps time-attendance and SST references to current implementation or
retained decision evidence.

| Reference                                  | Obligation cluster                        | Implementation / evidence path:line              | Current posture                                               |
| ------------------------------------------ | ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `docs/refs/legal/portaria-671-ponto.md`    | Portaria 671 time capture, REP, AFD       | database/sql/10-08-ponto-ddl.sql:1               | Implemented ponto schema and frontend/admin surfaces.         |
| `docs/refs/lgpd/pii-categorias-cpf-bio.md` | Biometric and geolocation sensitive data  | backend/src/ponto/biometria/consent.service.ts:1 | Implemented biometric consent and encrypted template posture. |
| `docs/refs/lgpd/anpd-guidelines.md`        | ANPD guidance for sensitive data handling | backend/src/ponto/face/consent.service.ts:1      | Implemented face-recognition consent and local-only matching. |

## Ponto biometrico: Portaria 671 e LGPD

## Ponto biometrico: Portaria 671 e LGPD

PONTO-08 adiciona biometria digital e palmar ao modulo de ponto eletronico como identificador adicional do empregado no REP. A batida continua vinculada ao identificador primario do empregado, e a biometria apenas enriquece a auditoria com `ponto.biometric_match`, preservando o papel definido pela Portaria MTP 671/2021 art. 80, paragrafo 3.

Templates biometricos sao dado pessoal sensivel. O cadastro exige consentimento ativo em `ponto.biometric_consent`, grava o template somente cifrado em `ponto.employee_biometric_template.template_cipher`, registra o identificador da chave KMS e nunca retorna o conteudo do template para operador, portal ou auditoria. A qualidade minima padrao e `0.850000`, com notas persistidas como `numeric(18,6)`.

Durante a ingestao de REP, o payload biometrico opcional e comparado ao template ativo do empregado. Com consentimento e template ativo, cada batida gera um `time_record` e um `biometric_match` com `score`, `threshold`, `device_id` e decisao `matched`. Sem consentimento ativo, a batida primaria continua valida e nenhum `biometric_match` e criado.

O titular pode retirar consentimento pelo portal. A retirada marca o consentimento com `withdrawn_at`, revoga templates ativos, destrói logicamente a referencia KMS e limpa o envelope cifrado para impedir novo matching. Tentativas posteriores retornam `matched=false` e sao auditadas sem template em claro.

As tabelas sao tenant-scoped, usam RLS com `sgp_tenant_matches(tenant_id)` e permissoes `ponto.biometric.read` / `ponto.biometric.write`, e todas as mutacoes chamam `sgp_append_audit_event(...)`.

## Ponto Mobile com Geofence — PONTO-09

## Ponto Mobile com Geofence — PONTO-09

**Status:** Implementado no slice PONTO-09.
**Escopo:** batida de ponto por PWA para home-office e serviço externo.

### Decisão

A batida móvel usa `POST /api/v1/ponto/mobile/clock` com empregado, coordenada GPS, precisão, horário, identificador de dispositivo e sinalização de `mock_location`. O backend valida o dispositivo registrado, exige consentimento ativo para geolocalização, testa a coordenada contra `hr.work_location.geofence_polygon` via PostGIS `ST_Within` e aplica plausibilidade mínima de precisão e velocidade.

### Dados e auditoria

- `hr.work_location.geofence_polygon` armazena o polígono oficial da lotação em SRID 4326.
- `ponto.mobile_device_registration` mantém o handshake do PWA por empregado e dispositivo.
- `ponto.mobile_geolocation_consent` registra base legal e consentimento operacional de geolocalização.
- `ponto.mobile_clock_in_attempt` registra todas as tentativas, aceitas e rejeitadas.
- Toda mutação possui trigger para `public.sgp_append_audit_event(...)`; o metadado de auditoria não carrega coordenadas GPS em claro.

### Resultados

Tentativas aceitas criam `ponto.time_record` com fonte `MOBILE` e payload de evidência. Tentativas rejeitadas não criam marcação e usam os motivos `OUT_OF_FENCE`, `MOCK_DETECTED`, `IMPOSSIBLE_VELOCITY`, `LOW_PRECISION` ou `NO_GEOLOCATION_CONSENT`.

### LGPD

Geolocalização é dado pessoal. A base operacional do MVP é execução do contrato de trabalho, com consentimento destacado no portal para transparência e prova de ciência. Sem consentimento ativo, a batida é rejeitada de forma explícita e auditada.

## PONTO-01 — Base Portaria MTP 671/2021

## PONTO-01 — Base Portaria MTP 671/2021

Este documento registra a fundação do módulo `ponto` para controle de jornada conforme a Portaria MTP 671/2021, capítulo VIII, mantendo o desenho físico em inglês e o comportamento de mutação auditável usado pelo restante do SGP v0.0.1.

### Modelo de Dados

O schema `ponto` contém seis tabelas tenant-scoped:

- `work_schedule`: jornada contratada, código, nome, horas semanais, tolerância e vigência.
- `work_shift`: turnos vinculados à jornada, classificados como `FIXED`, `FLEXIBLE`, `SHIFT_12X36`, `SHIFT_6X1` ou `OTHER`.
- `day_schedule`: horários por dia da semana, incluindo entrada, saída para almoço, retorno, saída e total de minutos.
- `employee_schedule_assignment`: vigência da atribuição servidor x jornada.
- `time_record`: marcações reais com `recorded_at`, origem `REP_P`, `REP_A`, `REP_C` ou `MANUAL_ADJUSTMENT`, NSR, `prev_hash`, `record_hash` e `raw_payload`.
- `timesheet_period`: período mensal de apuração com status `OPEN`, `CLOSED` ou `LOCKED` e acumuladores de minutos.

`public.tenant` passa a expor `tenant_timezone text NOT NULL DEFAULT 'America/Sao_Paulo'`, preparando PONTO-07 para cálculo de virada de dia, adicional noturno e fechamento por fuso do tenant.

### Encadeamento de Hash

`time_record` é append-only. O backend calcula o hash em `TimeRecordHashService` usando representação JSON canônica com chaves ordenadas e SHA-256 sobre `prev_hash || canonical(record)`. A criação manual rejeita `prev_hash` divergente do último registro do servidor e exige NSR crescente. O banco bloqueia `UPDATE` e `DELETE` por trigger para preservar a cadeia.

### Segurança, RLS e Auditoria

Todas as tabelas do schema `ponto` usam RLS forçada com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`. Leituras aceitam as permissões `ponto.schedule.read`, `ponto.schedule.write`, `ponto.timerecord.read` ou `ponto.timerecord.write`; escritas exigem a permissão de escrita da superfície correspondente. Todas as mutações chamam `sgp_append_audit_event(...)` por trigger de banco e os controllers mutáveis usam `@AuditMutation`.

### Papéis REP

Este corte cria apenas a base. `REP_P`, `REP_A` e `REP_C` já existem como valores físicos de origem em `ponto.time_record`, mas ingestão REP, AFD/AFDT, validação de equipamento e importação de arquivos ficam para PONTO-02 e PONTO-03.

## SST - ASO e exames ocupacionais

## SST - ASO e exames ocupacionais

**Status:** implemented
**Slice:** SST-01 ASO e Exames Ocupacionais

### Escopo

O modulo `saude` passa a manter o catalogo de exames ocupacionais e o ciclo de vida do ASO: agendamento, realizacao, conclusao medica, anexacao do PDF restrito e arquivamento. O fluxo cobre ASO admissional, periodico, retorno ao trabalho, mudanca de funcao e demissional. A emissao do evento eSocial S-2220 permanece fora do escopo deste slice, mas `saude.aso_record` e a fonte estruturada para SST-04.

### Modelo de dados

- `saude.medical_exam`: catalogo tenant-scoped de exames clinicos, laboratoriais, complementares e de imagem, com marcadores de obrigatoriedade admissional/periodica e periodicidade em meses.
- `saude.aso_record`: registro principal do ASO por servidor, tipo, datas, medico responsavel, conclusao, restricoes resumidas, proximo vencimento e status.
- `saude.aso_exam_item`: resultados resumidos por exame vinculado ao ASO. Laudos brutos nao sao armazenados neste campo.
- `saude.aso_attachment`: metadados do PDF de laudo/exames, com `sha256`, MIME `application/pdf` e `encrypted_at_rest=true`.

Novos servidores admitidos pelo fluxo `POST /api/v1/funcionarios` recebem automaticamente um ASO admissional pendente (`SCHEDULED`) na mesma transacao de admissao.

### Acesso e LGPD

Dados de ASO sao dados pessoais sensiveis de saude. Todas as tabelas sao tenant-scoped, com RLS forçada baseada em `sgp_tenant_matches(tenant_id)` e permissoes:

- `saude.aso.read`: leitura administrativa/RH com conteudo clinico resumido.
- `saude.aso.write`: criacao, realizacao, anexacao e arquivamento.
- `saude.aso.self_read`: portal do servidor, limitado por `employee_id = sgp_current_employee_id()`.

O portal expõe somente tipo, datas, conclusao, vencimento e status. Conteudo clinico detalhado, texto de restricao e dados de anexo permanecem restritos a perfis com permissao administrativa dedicada.

### Retencao

Metadados e trilha de auditoria de ASO seguem a politica geral de retencao de prontuario funcional enquanto houver relacao juridica ativa e pelo prazo legal aplicavel apos desligamento. PDFs devem ser armazenados apenas em repositorio criptografado, com controle de acesso por tenant e auditoria de download; a tabela registra somente URI, hash e flag de criptografia, nao o binario do laudo.

## PONTO-02 - Ingestao REP-P, REP-A e REP-C

## PONTO-02 - Ingestao REP-P, REP-A e REP-C

Este corte implementa a entrada operacional de marcacoes dos registradores previstos na Portaria MTP 671/2021. O desenho fisico permanece em ingles no schema `ponto`, enquanto os fluxos de produto preservam os termos REP-P, REP-A, REP-C, AFDT e NSR.

### Equipamentos

Cada equipamento fica em `ponto.rep_device` com `tenant_id`, tipo (`REP_P`, `REP_A`, `REP_C`), identificacao fiscal do empregador, fabricante/modelo, status e dados especificos. `REP_C` exige `serial_number` unico por tenant. `REP_P` exige `program_hash`, usado tambem como segredo de validacao HMAC do stream JSON do programa de tratamento.

### Lotes

Cada recepcao cria um registro em `ponto.rep_ingestion_batch` com hash SHA-256 do conteudo original, nome do arquivo, status e resumo de erros. O conteudo original e preservado em `raw_file` para download administrativo. As linhas aceitas entram em `ponto.rep_ingestion_line` com `batch_id`, `rep_device_id`, `line_no`, `nsr`, `raw_line`, `parsed`, `dedup_key` e o `time_record_id` gerado.

### AFDT e REP-P

Para REP-A e REP-C, o backend aceita AFDT textual em linhas delimitadas por `;` ou `|` com `NSR;identificador_servidor;data;hora;evento`. O identificador pode ser UUID do servidor, CPF ou matricula. Para REP-P, o endpoint aceita `records[]` em JSON com NSR, servidor e data/hora; a assinatura HMAC-SHA256 sobre o JSON canonico precisa bater com o `program_hash` cadastrado.

### NSR, deduplicacao e cadeia de hash

A deduplicacao e feita por `(tenant_id, rep_device_id, nsr)`. Um reenvio integral de arquivo ja processado termina como `PROCESSED` com `duplicate=true` e sem novas marcacoes. Um lote com NSR retrocedendo dentro do proprio arquivo ou tentando inserir NSR novo menor que o historico do equipamento e rejeitado inteiro, com `error_summary` preenchido. Linhas aceitas sao convertidas para `ponto.time_record` com origem `REP_P`, `REP_A` ou `REP_C`, reutilizando `TimeRecordHashService` para manter a cadeia `prev_hash`/`record_hash`.

### Seguranca e auditoria

As tabelas novas forcam RLS com `sgp_tenant_matches(tenant_id)` e as permissoes `ponto.rep.read`, `ponto.rep.write` e `ponto.timerecord.write`. Mutacoes de equipamento, lote e linha chamam `sgp_append_audit_event(...)` por trigger de banco, e os controllers mutaveis exigem `@RequirePermission('ponto.rep.write')`.

## SST-02 — PCMSO e PGR: revisoes e ciclo de vida

## SST-02 — PCMSO e PGR: revisoes e ciclo de vida

### Escopo

O modulo `saude` mantem PCMSO e PGR por estabelecimento (`hr.work_location`). O PCMSO registra vigencia anual, medico responsavel e exames periodicos obrigatorios derivados do catalogo de SST-01. O PGR registra vigencia anual, responsavel tecnico e o snapshot de riscos ambientais vigente; o inventario detalhado de exposicoes e EPIs permanece no escopo de SST-05.

### Modelo

- `saude.health_program`: PCMSO por estabelecimento, com status `DRAFT`, `ACTIVE`, `SUPERSEDED` ou `ARCHIVED`.
- `saude.risk_management_program`: PGR por estabelecimento, com o mesmo ciclo de status.
- `saude.pcmso_required_exam`: exames obrigatorios do PCMSO, opcionalmente restritos a cargo e com periodicidade especifica.
- `saude.program_revision`: historico append-only de snapshots assinaveis para PCMSO e PGR.

Somente um PCMSO e um PGR podem ficar `ACTIVE` por estabelecimento e tenant. A ativacao de um rascunho supersede o programa ativo anterior e cria uma revisao imutavel. Revisoes anuais tambem criam novo registro em `program_revision`, com referencia ao snapshot anterior.

### Regras operacionais

Ao admitir um servidor em estabelecimento com PCMSO ativo, o backend cria a agenda de ASO periodico com os exames de `pcmso_required_exam`. A data prevista usa a periodicidade especifica do PCMSO quando existir, depois a periodicidade do exame, e por fim 12 meses como padrao conservador.

As tabelas sao tenant-scoped, com RLS por `sgp_tenant_matches(tenant_id)` e permissao `saude.program.read` ou `saude.program.write`. Mutacoes passam pelos triggers de auditoria via `sgp_append_audit_event`. `program_revision` bloqueia `UPDATE` e `DELETE` por trigger para manter snapshots append-only.

## PONTO-03 - AFD Geracao e Importacao

## PONTO-03 - AFD Geracao e Importacao

Este corte implementa o Arquivo Fonte de Dados (AFD) como artefato fiscal do modulo `ponto`, com desenho fisico em ingles e operacao alinhada a Portaria MTP 671/2021 para cabecalho, registros de detalhe, marcacoes e trailer com selo SHA-256.

### Modelo de Dados

`ponto.afd_export` registra solicitacoes de geracao por equipamento REP e periodo, com `object_store_key`, hash SHA-256, quantidade de linhas, usuario solicitante e status `GENERATING`, `READY` ou `FAILED`. `ponto.afd_import` registra arquivos recebidos de sistemas externos com `object_store_key`, hash, quantidade de linhas, status `PENDING`, `PROCESSED` ou `REJECTED` e resumo estruturado de erros. `ponto.afd_import_line` preserva as linhas parseadas, NSR, tipo de registro, payload e vinculo com `ponto.time_record` quando a linha e uma marcacao tipo 4.

Os metadados nao armazenam o AFD como blob inline. A chave `object_store_key` e o identificador estavel para armazenamento externo ou reconstituicao controlada. As linhas importadas sao mantidas como evidencia parseada para viabilizar auditoria e round-trip byte-identico.

### Layout e Selo

O backend define registros fixos de 256 caracteres para os tipos 1 a 9 em `afd-layout.ts`. O tipo 1 identifica empregador, periodo e versao do layout; o tipo 4 representa marcacao de ponto com NSR, servidor, data/hora, origem REP e hash da marcacao; o tipo 9 fecha o arquivo com periodo, contagem de linhas e SHA-256 calculado sobre as linhas anteriores.

Na importacao, o parser valida largura fixa, NSR, tipo de registro, contagem do trailer e selo SHA-256 do registro tipo 9. Selo invalido nao cria marcacoes e finaliza `ponto.afd_import` como `REJECTED` com `error_summary`.

### Geracao e Round-Trip

A geracao recebe `rep_device_id`, `period_start` e `period_end`, emite stream de linhas e ordena marcacoes por NSR. Quando o periodo corresponde a um AFD importado e processado, a geracao usa as linhas preservadas em `ponto.afd_import_line`, mantendo round-trip byte-identico. Quando nao ha importacao previa, o arquivo e montado a partir de `ponto.time_record`; periodos sem marcacoes geram AFD valido com apenas tipo 1 e tipo 9.

Linhas tipo 4 importadas sao convertidas para `ponto.time_record` usando a cadeia `TimeRecordHashService`, preservando `prev_hash` e `record_hash` do modelo PONTO-01.

### AFDT e ACJEF

R2-82 adiciona extratos fiscais AFDT e ACJEF gerados pelo backend a partir do mesmo corte de `rep_device_id`, `period_start` e `period_end` usado no AFD. A Portaria MTP 671/2021 usa o AEJ como arquivo vigente de jornada; por isso este corte nao redefine versao regulatoria externa nem substitui o AFD/AEJ. Os arquivos AFDT/ACJEF do SGP sao saídas deterministicas de fiscalizacao/historico para fechar o residual de aderencia apontado no round-1.

`POST /api/v1/ponto/afd/afdt` retorna um flat-file UTF-8 com cabecalho `AFDT`, linhas `AFDT-DETAIL` ordenadas por NSR a partir de `ponto.time_record`, e trailer com SHA-256 das linhas anteriores. Cada detalhe preserva NSR, instante, origem REP, equipamento, servidor, matricula, CPF, nome e hash da marcacao.

`POST /api/v1/ponto/afd/acjef` retorna um flat-file UTF-8 com cabecalho `ACJEF`, linhas `ACJEF-SUMMARY` por servidor e trailer com SHA-256. Cada resumo usa `ponto.fn_aggregate_timesheet(...)` para consolidar minutos trabalhados, esperados, extras, noturnos, atrasos, ausencias abonadas/nao abonadas e acertos de banco de horas do periodo.

### Seguranca e Auditoria

As tabelas `ponto.afd_export`, `ponto.afd_import` e `ponto.afd_import_line` forcam RLS com `sgp_tenant_matches(tenant_id)` e permissoes `ponto.afd.read` / `ponto.afd.write`. Todas as mutacoes disparam `sgp_append_audit_event(...)` por trigger de banco, e os endpoints mutaveis exigem `@RequirePermission('ponto.afd.write')`. As rotas AFDT/ACJEF nao persistem artefato nem alteram estado; elas reutilizam `ponto.afd.read`.

## CAT e Prazos SST

## CAT e Prazos SST

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** SST-03, acidente de trabalho, CAT e eSocial S-2210.

### Decisao

O SGP registra acidentes de trabalho em `saude.work_accident` e emite CATs em
`saude.cat_emission`. Cada emissão gera automaticamente uma mensagem S-2210 em
`public.esocial_events`, enviada ao gateway stynx-esocial para validação,
assinatura e transmissão.

### Prazos

CAT inicial e de reabertura usam `deadline_at` no proximo dia util apos `accident_at`. CAT de obito usa prazo imediato: `deadline_at = emitted_at`. O painel `/api/v1/saude/acidentes/prazos` lista CATs sem `esocial_events_message_id` com vencimento em ate 4 horas, permitindo alerta operacional antes da multa prevista na Lei 8.213/1991 art. 22.

### Maquina de Estados

`saude.work_accident.status` segue a sequencia validada por trigger:

| De                  | Para                                         |
| ------------------- | -------------------------------------------- |
| `REGISTRADO`        | `COMUNICADO`                                 |
| `COMUNICADO`        | `REABERTO`, `COMUNICACAO_OBITO`, `ENCERRADO` |
| `REABERTO`          | `COMUNICACAO_OBITO`, `ENCERRADO`             |
| `COMUNICACAO_OBITO` | `ENCERRADO`                                  |

Tentativas de pular `REGISTRADO -> COMUNICACAO_OBITO` sao rejeitadas. Acidente fatal exige `death_at`; fechamento de acidente fatal exige CAT `OBITO` previamente emitida.

### Permissoes e RLS

As tabelas `saude.work_accident`, `saude.cat_emission` e
`public.esocial_events` usam RLS forçado por tenant com
`sgp_tenant_matches(tenant_id)`. Leitura aceita `saude.cat.read`,
`saude.cat.write`, `esocial.event.read` ou `esocial.event.write`; mutacao exige
`saude.cat.write` ou `esocial.event.write`. Todas as mutacoes passam por
`sgp_append_audit_event(...)`.

## PONTO-04 — Escalas, Plantões e Turnos

## PONTO-04 — Escalas, Plantões e Turnos

### Escopo

Este documento define a semântica de escalas cíclicas do módulo de ponto eletrônico. A jornada fixa de PONTO-01 continua representada por `work_schedule`, `work_shift`, `day_schedule` e `employee_schedule_assignment`. PONTO-04 adiciona ciclos independentes do dia da semana para 12x36, 6x1, 5x2, 24x72 e escalas customizadas.

### Modelo de ciclo

`ponto.shift_pattern` identifica o padrão e declara `cycle_days`. Cada linha de `ponto.shift_pattern_day` representa uma posição do ciclo, com `day_index` iniciado em zero. Dias trabalhados exigem `entry_time` e `exit_time`; dias de folga permanecem sem horários e geram zero minuto esperado. Quando `exit_time` é menor ou igual a `entry_time`, a saída é projetada para o dia civil seguinte, cobrindo plantões noturnos.

### Ancoragem

`ponto.shift_assignment` aplica um padrão a um empregado com `anchor_date`, `valid_from` e `valid_to`. A data projetada usa:

```text
day_index = (work_date - anchor_date) modulo cycle_days
```

Assim, uma escala 12x36 ancorada em 2026-05-01 trabalha em 2026-05-01, folga em 2026-05-02 e repete o ciclo até o fim da vigência.

### Interação com jornadas fixas

O projetor de roster sempre prioriza `shift_assignment` ativo no período. Quando há escala cíclica ativa, `employee_schedule_assignment` e `day_schedule` não alimentam a jornada esperada desse empregado para as datas cobertas. Sem escala cíclica ativa, o projetor usa a jornada fixa de PONTO-01 pelo dia da semana.

### Roster mestre

`ponto.duty_roster` guarda a escala mestra de um período. `DRAFT` permite geração e revisão, `PUBLISHED` registra a versão publicada, e `LOCKED` congela o período para fechamento. `ponto.duty_roster_entry` materializa por empregado e data: entrada esperada, saída esperada, minutos esperados e flags de adicional.

Mudanças retroativas em `shift_assignment` cobertas por roster `LOCKED` são rejeitadas para preservar o fechamento de ponto e a rastreabilidade de folha.

### Flags

`night_shift_flag` marca turnos com adicional noturno potencial, inclusive plantões que cruzam meia-noite. `hazard_flag` marca exposição insalubre no turno. As flags não calculam rubricas neste slice; elas são insumo explícito para PONTO-07 e CALC-07.

### Segurança e auditoria

Todas as tabelas são tenant-scoped, forçam RLS e usam `sgp_tenant_matches(tenant_id)` com `ponto.roster.read` ou `ponto.roster.write` para leitura. Mutação exige `ponto.roster.write`. Toda mutação chama `sgp_append_audit_event(...)` por gatilho no banco.

## SST-05 — Riscos Ambientais, EPI e PPP

## SST-05 — Riscos Ambientais, EPI e PPP

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** inventario de exposicao ambiental, S-2240, entrega de EPI e PPP precursor.

### Decisao

O SGP v0.0.1 registra exposicoes ambientais em `saude.environmental_exposure`, sempre vinculadas a um PGR `ACTIVE` de `saude.risk_management_program` que cubra a data inicial da exposicao. A tabela e tenant-scoped, auditada por `sgp_append_audit_event(...)` e protegida por RLS com `saude.exposure.read`, `saude.exposure.write`, `saude.epi.read`, `saude.epi.write`, `esocial.event.read` e `esocial.event.write`.

### S-2240

Cada insercao de exposicao cria mensagem `START` em `public.esocial_events`.
Alteracoes de agente, intensidade, periodo ou mitigacoes criam `CHANGE`;
preenchimento de `exposure_end` cria `END`. Stynx-esocial gera o `evtExpRisco`
S-1.3 e executa validação/transmissão fora do SGP.

### S-1060

`hr.work_location` e a fonte canonica dos codigos de ambiente de trabalho para o
cluster SST. O SGP envia esses códigos nos payloads S-2210, S-2220 e S-2240 por
`public.esocial_events`; stynx-esocial decide a emissão S-1060 e a validação XSD.

### EPI

O inventario de EPI fica em `saude.epi_inventory`, por CA, nome, descricao e validade em meses. Entregas ficam em `saude.epi_delivery` e exigem `signature_method` `FISICA`, `DIGITAL` ou `GOVBR`; entregas digitais e GovBR exigem `signature_evidence_uri`. O campo `training_done_at` registra treinamento NR-6 quando aplicavel.

### PPP

`saude.ppp_record` e append-only. A geracao agrega exposicoes ambientais e entregas de EPI no periodo informado em `snapshot_json`, com `generated_at`, e bloqueia `UPDATE` e `DELETE` por trigger. O PPP eletronico do INSS permanece fora do escopo; este registro e o precursor local e auditavel.

### Contrato com CALC-07

A funcao `saude.exposure_read_for_payroll(employee_id, ref_date)` expõe a folha as exposicoes vigentes na data de referencia, incluindo `insalubrity_due` e `danger_pay_due`. A rubrica `SST_INSALUBRIDADE` usa `payroll_calc.evaluate_earning_deduction(...)` por meio de `payroll_calc.f_sst_insalubridade`, calculando 20% do salario base quando houver ruido acima de 85 dB(A) sem mitigacao por EPI.

## PONTO-05 — Banco de horas

## PONTO-05 — Banco de horas

### Escopo

O banco de horas registra o delta diário entre jornada trabalhada e jornada esperada em `ponto.hour_bank_movement`, mantendo o saldo agregado em `ponto.hour_bank.balance_minutes`. O saldo é sempre derivado por trigger a partir dos movimentos e não deve ser ajustado diretamente pela aplicação.

### Regimes e prazos

- `CLT_INDIVIDUAL`: banco aberto por acordo individual com prazo máximo operacional de 6 meses.
- `CLT_COLETIVO`: banco aberto por acordo ou convenção coletiva com prazo máximo operacional de 1 ano.
- `ESTATUTARIO`: banco aberto por regra local de compensação de horário, com prazo definido pelo estatuto ou ato normativo do ente.

O cadastro do banco armazena `opened_at` e `expires_at`. A aplicação valida o regime no contrato de API e a regra local define a data de vencimento antes da abertura do banco. Bancos vencidos ou encerrados não aceitam novos movimentos `ACCRUAL_*`; a tentativa é bloqueada por trigger e registrada em auditoria com motivo `HOUR_BANK_EXPIRED`.

### Movimentos

Movimentos positivos usam `ACCRUAL_POSITIVE`. Deltas negativos usam `ACCRUAL_NEGATIVE`. Compensações de saída antecipada ou entrada postergada usam `COMPENSATION` e consomem saldo positivo. Ajustes administrativos usam `MANUAL_ADJUSTMENT` e passam pelo endpoint auditado.

Na zeragem por prazo, saldo positivo gera `SETTLEMENT_OVERTIME` para conversão em hora extra 50%. Saldo negativo gera `SETTLEMENT_DEDUCTION` para desconto em folha. A execução recebe `payroll_run_id` e é idempotente por `(hour_bank_id, payroll_run_id, kind)`, impedindo duplicidade ao reprocessar a mesma folha.

### Integração com folha

O settlement chama `payroll_calc.evaluate_earning_deduction(...)` quando uma rubrica de HE 50% é informada, preservando a política folia-first e a política de decimal monetário. O slice não cria a rubrica mensal final nem substitui PONTO-07; ele registra o movimento de zeragem e disponibiliza o vínculo com `payroll_run_id`.

### Segurança

`ponto.hour_bank` e `ponto.hour_bank_movement` são tenant-scoped, têm RLS forçado e usam `sgp_tenant_matches(tenant_id) AND sgp_has_any_permission(...)`. Leitura exige `ponto.hourbank.read` ou `ponto.hourbank.write`; mutação exige `ponto.hourbank.write`. Todas as mutações disparam `sgp_append_audit_event(...)`.

## PONTO-06 - Justificativa de ausencia e abono

## PONTO-06 - Justificativa de ausencia e abono

### Escopo

O fluxo PONTO-06 registra justificativas de ausencia em `ponto.absence_justification`, vincula marcacoes reais abonadas por `ponto.time_record_justification_link` e informa PONTO-05/PONTO-07 pelo tratamento de folha `PAID`, `UNPAID` ou `HOUR_BANK_NEUTRAL`.

### Tipos

Os tipos fisicos aceitos sao `MEDICAL`, `MARRIAGE`, `BEREAVEMENT`, `BLOOD_DONATION`, `MILITARY`, `VOTING`, `PATERNITY`, `MATERNITY`, `LEGAL_DUTY`, `UNION`, `TRAINING` e `OTHER`. Eles cobrem as hipoteses operacionais da CLT art. 473, Lei 8.112/90 art. 97, atestado medico e eventos correlatos de RH.

### Workflow

O empregado cria a solicitacao por `POST /v1/ponto/justifications` com periodo, tipo, justificativa textual e anexo opcional em `public.document_attachment`. A chefia decide por `POST /v1/ponto/justifications/:id/decide`. As transicoes permitidas sao `REQUESTED -> APPROVED`, `REQUESTED -> REJECTED` e `REQUESTED -> CANCELLED`; estados finais nao retornam para edicao.

Toda decisao valida que o aprovador esteja vinculado a um empregado do mesmo tenant e nao seja o proprio solicitante. A verificacao fica isolada no workflow para evoluir quando HR-06 expuser uma relacao formal de chefia imediata.

### Integracoes

Na aprovacao, marcacoes `ponto.time_record` do mesmo empregado dentro do intervalo sao vinculadas em `ponto.time_record_justification_link`, preservando a marcacao original e registrando o abono como camada de interpretacao. Atestado `MEDICAL` com mais de 15 dias cria handoff em `hr.leave_record`, herdando `attachment_id` como referencia documental para a continuidade HR-04. O detalhamento pericial permanece no fluxo de licenca saude.

PONTO-07 deve consumir `JustificationPayrollBridgeService`: `payroll_treatment=PAID` compoe minutos abonados sem desconto, `UNPAID` preserva desconto, e `HOUR_BANK_NEUTRAL` evita alimentar banco negativo em PONTO-05.

### Seguranca e auditoria

As tabelas sao tenant-scoped, com RLS por `sgp_tenant_matches(tenant_id)` e permissoes `ponto.justification.read`, `ponto.justification.write` e `ponto.justification.approve`. Triggers de mutacao chamam `sgp_append_audit_event(...)` para solicitacoes, decisoes e vinculos de marcacao.

## PONTO-07 - Integracao entre ponto e folha

## PONTO-07 - Integracao entre ponto e folha

### Escopo

Este documento define a ponte entre o fechamento de ponto e a folha mensal. A fonte operacional e `ponto.timesheet_period` fechado, combinado com marcacoes, escalas publicadas/travadas, banco de horas e justificativas aprovadas. Periodos `OPEN` nao podem gerar linhas para folha.

### Mapa rubrica x agregado

| Rubrica dinamica  | Agregado                       | Tipo     | Regra                                                        |
| ----------------- | ------------------------------ | -------- | ------------------------------------------------------------ |
| `PONTO_HE50`      | `overtime_50_minutes`          | Provento | Hora extra em dia util com minimo legal de 50%.              |
| `PONTO_HE100`     | `overtime_100_minutes`         | Provento | Hora extra em DSR/domingo ou feriado operacional.            |
| `PONTO_NIGHT`     | `night_minutes`                | Provento | Adicional noturno de 20%, com hora reduzida CLT de 52min30s. |
| `PONTO_LATE`      | `late_minutes`                 | Desconto | Atrasos nao abonados.                                        |
| `PONTO_ABSENCE`   | `absence_unpaid_minutes`       | Desconto | Faltas/ausencias com tratamento `UNPAID`.                    |
| `PONTO_HOUR_BANK` | `hour_bank_settlement_minutes` | Provento | Zeragem positiva de banco de horas para folha.               |

### Contrato tecnico

`ponto.fn_aggregate_timesheet(tenant_id, employee_id, period_start, period_end)` consolida os minutos e a view `ponto.v_timesheet_payroll_input` expõe o mesmo contrato para periodos existentes. O backend usa `PayrollBridgeService` para pre-visualizar e aplicar as linhas; cada rubrica chama `payroll_calc.evaluate_earning_deduction(...)` e depois aplica quantidade/multiplicador com `Decimal`.

### Idempotencia

`ponto.payroll_bridge_event` registra `(payroll_run_id, employee_id, timesheet_period_id)` com `applied_lines`. Reaplicar a mesma combinacao retorna o evento existente e nao duplica itens em `payroll.employee_payroll_item`.

### Auditoria e seguranca

A tabela do bridge e tenant-scoped, força RLS por `sgp_tenant_matches(tenant_id)` e exige `ponto.payroll.read` ou `ponto.payroll.write`. Mutacoes disparam `sgp_append_audit_event(...)`.

## Politica de fuso horario para jornada

## Politica de fuso horario para jornada

### Fonte da verdade

`public.tenant.tenant_timezone` e a unica fonte de verdade para calculo de jornada. O valor deve ser um identificador IANA, como `America/Rio_Branco`, `America/Sao_Paulo` ou `America/Noronha`.

### Regra de agregacao

Marcacoes sao persistidas como `timestamptz`, mas dias de trabalho, virada de plantao, janela noturna e limites de periodo sempre sao calculados com `recorded_at AT TIME ZONE tenant_timezone`. O backend nao deve usar `Date.toISOString()` para decidir fronteiras de jornada; a conversao fica isolada em `tenant-timezone.util.ts`.

### Adicional noturno

A janela noturna CLT e 22:00-05:00 no fuso local do tenant. Os minutos da janela sao convertidos pela hora reduzida de 52min30s, usando fator `60 / 52.5`, antes de alimentar a rubrica `PONTO_NIGHT`.

### Interfaces

A tela administrativa de PONTO-07 e o portal do empregado mostram os agregados ja calculados no fuso do tenant. Datas exibidas sao derivadas do contrato do backend, nao recalculadas no navegador.
