# Concursos publicos

## Escopo

O modulo `recrutamento/concurso` administra a abertura de concursos publicos do SGP v0.0.1. Ele cobre cadastro do certame, vagas por cargo, reservas legais, versionamento de edital, publicacao do edital no Portal Transparencia, inscricao publica de candidatos, etapa de avaliacao, classificacao final, nomeacao e convocacao. Posse e exercicio ficam em REC-06.

## Modelo operacional

Cada concurso nasce em `DRAFT` com codigo publico, nome, validade e criador. As vagas sao registradas por cargo (`hr.job_position`) e podem referenciar a definicao de organico vigente (`hr.organic_definition`) para travar a lotacao/cargo autorizados e o quadro de vagas consumido pelo certame. Cada vaga guarda total de vagas, reserva PCD, reserva racial, reserva indigena/quilombola quando aplicavel, requisitos em JSON e salario-base em `numeric(14,2)`.

O edital e versionado em `recrutamento.edital`. Cada versao guarda referencia documental, ato administrativo, data do ato e prazo para recursos de prova quando houver etapa avaliativa. A publicacao exige uma versao existente do edital, ato administrativo, data do ato e URL publica. Ao publicar, o edital recebe `published_at`, `public_url` e o concurso passa para `PUBLISHED`; concursos publicados ficam disponiveis sem autenticacao em `/api/v1/publico/concursos/:slug`.

## Inscricao publica

O endpoint `POST /api/v1/publico/concursos/:slug/inscricoes` recebe inscricoes sem JWT, identificando o candidato por CPF e exigindo consentimento LGPD explicito com versao do termo. O fluxo grava `recrutamento.candidato`, `recrutamento.inscricao` e, quando nao ha isencao, `recrutamento.payment_charge` com gateway abstrato plugavel. O retorno inclui token de acompanhamento; `GET /api/v1/publico/inscricoes/:id?token=...` consulta somente a inscricao correspondente ao token.

A validacao do cargo usa o `requirement` JSON da vaga para idade minima, escolaridade e registro profissional. Autodeclaracoes de cota sao aceitas apenas de forma explicita para PCD, racial ou indigena. As regras federais de isencao cobrem CadUnico pelo Decreto 6.593/2008 e doadores de medula pela Lei 13.656/2018; inscricoes isentas ficam `EXEMPT` e nao geram cobranca.

## Provas, gabaritos e notas

As provas ficam em `recrutamento.prova` e podem ser objetivas, discursivas, praticas ou de titulos. Questoes ficam numeradas em `recrutamento.questao`; respostas dos candidatos ficam em `recrutamento.resposta_candidato`. O gabarito e versionado em `recrutamento.gabarito` como preliminar, final ou superseded. Um gabarito `FINAL` nao pode ser alterado in-place: correcao posterior cria nova versao e supersede a versao anterior.

A funcao `recrutamento.recompute_notas(prova_id, gabarito_version)` reaplica o gabarito vigente, recalcula `recrutamento.nota` e gera auditoria por candidato cuja nota mudou. A consulta publica `/api/v1/publico/inscricoes/:id/notas?token=...` mostra nota e espelho apenas para o token da inscricao.

## Classificacao final

A classificacao REC-04 consolida as notas em `recrutamento.classificacao_snapshot` e `recrutamento.classificacao_item`. A geracao administrativa chama `recrutamento.gerar_classificacao(concurso_id)` por `POST /api/v1/admin/concursos/:id/classificacao`; a publicacao usa `POST /api/v1/admin/concursos/:id/classificacao/publicacao` e torna a versao visivel em `/api/v1/publico/concursos/:slug/classificacao`. Snapshots publicados sao imutaveis: uma nova publicacao deve superseder a versao anterior em vez de alterar a lista publicada.

O ranking por vaga ordena por nota total ponderada decrescente, aplica prioridade do idoso em empates conforme Lei 10.741/2003 art. 27 paragrafo unico, depois maior idade e, por fim, identificador da inscricao para estabilidade reprodutivel. Provas podem marcar `required_for_classification`, `minimum_raw_score` e `minimum_weighted_score`; ausente em prova obrigatoria ou nota inferior ao minimo gera `eliminated_reason` e remove o candidato da lista geral aprovada.

## Nomeacao e convocacao

A nomeacao REC-05 consome a classificacao publicada sem recalcular ranking. A funcao `recrutamento.proxima_chamada(concurso_id, vaga_id)` retorna a proxima inscricao elegivel pela ordem de chamada ja publicada, respeitando a alternancia de cotas registrada em `allocation_bucket` e ignorando candidatos ja nomeados. Quando a vaga possui `organic_definition_id`, o retorno administrativo de nomeacao inclui essa referencia para que posse/exercicio e controle de lotacao sigam a mesma definicao de organico usada na abertura do concurso. A API administrativa `POST /api/v1/admin/nomeacoes` cria `recrutamento.nomeacao` com ato administrativo, data de publicacao e prazo de comparecimento de 30 dias corridos; o backend rejeita nomeacao apos `recrutamento.concurso.valid_until`.

Convocacoes ficam em `recrutamento.convocacao` por canal `PUBLICACAO_OFICIAL`, `EMAIL` ou `POSTAL`. A publicacao oficial e o postal exigem referencia manual de evidencia. O canal `EMAIL` registra `evidence_ref` contendo `messageId` do provedor; em ambiente local o provedor deterministico usa prefixo `email:messageId=local-...`. Desistencia manual muda a nomeacao para `DESISTENTE`. A expiracao de prazo muda `NOMEADO` ou `CONVOCADO` vencido para `EXONERADO_POR_NAO_POSSE`; a operacao e idempotente para permitir reexecucao segura pelo worker.

REC-06 acrescenta `recrutamento.posse` para agendar a posse, controlar o prazo de exercício de 15 dias úteis, registrar a lotação inicial em `hr.work_location` e efetivar o candidato como servidor somente no estado `EXERCICIO`. A função `recrutamento.efetivar_posse(posse_id)` cria `hr.employee`, `hr.employment_link`, `hr.employment_contract` e histórico funcional ativo em uma transação, grava auditoria e atualiza a nomeação para `EXERCICIO`. Depois da transação, o backend publica `recrutamento.posse.exercicio` e chama o fluxo ES-02 para enfileirar exatamente um evento S-2200 para o servidor. Cancelamento depois da criação do servidor fica bloqueado e deve seguir o desligamento/rescisão do CALC-12.

## Recursos de prova

Recursos ficam em `recrutamento.recurso` e so podem ser abertos enquanto `recrutamento.edital.resource_deadline_at` estiver vigente. A banca registra parecer e decisao administrativa, observando a publicidade e a impessoalidade do art. 37 da Constituicao Federal. A revisao judicial do gabarito segue a tese do STF no RE 632.853: nao ha substituicao ordinaria da banca pelo Judiciario, ressalvadas ilegalidades e erro grosseiro.

## Reservas legais

A validacao de backend bloqueia vagas com reserva superior ao total. Para cargos com cinco ou mais vagas, a reserva PCD minima e 5%, em alinhamento com CF art. 37 VIII, LBI 13.146/2015 e Decreto 9.508/2018. Para cargos com tres ou mais vagas, a reserva racial minima e 20%, conforme Lei 12.990/2014. A classificacao intercala a reserva racial nas posicoes 3, 8, 13 e subsequentes da chamada quando houver candidatos autodeclarados habilitados; candidatos negros aprovados pela ampla concorrencia nao consomem vaga reservada. Cotas locais para indigenas e quilombolas sao registradas em campo proprio e devem observar a norma municipal aplicavel.

## Seguranca e auditoria

As tabelas `recrutamento.concurso`, `recrutamento.edital`, `recrutamento.vaga`, `recrutamento.candidato`, `recrutamento.inscricao`, `recrutamento.payment_charge`, `recrutamento.prova`, `recrutamento.questao`, `recrutamento.gabarito`, `recrutamento.resposta_candidato`, `recrutamento.recurso`, `recrutamento.nota`, `recrutamento.classificacao_snapshot`, `recrutamento.classificacao_item`, `recrutamento.nomeacao`, `recrutamento.convocacao` e `recrutamento.posse` sao tenant-scoped e usam RLS com `sgp_tenant_matches(tenant_id)`. Toda mutacao dispara trigger com `sgp_append_audit_event(...)`. A API administrativa exige `@RequirePermission`; a leitura publica usa funcao `SECURITY DEFINER` limitada a concursos `PUBLISHED` ou `OPEN` com edital publicado, e o acompanhamento de inscricao publica e protegido por token de consulta.
