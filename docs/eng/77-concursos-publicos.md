# Concursos publicos

## Escopo

O modulo `recrutamento/concurso` administra a abertura de concursos publicos do SGP v0.0.1. Ele cobre cadastro do certame, vagas por cargo, reservas legais, versionamento de edital, publicacao do edital no Portal Transparencia, inscricao publica de candidatos, etapa de avaliacao e classificacao final. Nomeacao, posse e exercicio ficam nos slices REC-05 e REC-06.

## Modelo operacional

Cada concurso nasce em `DRAFT` com codigo publico, nome, validade e criador. As vagas sao registradas por cargo (`hr.job_position`) com total de vagas, reserva PCD, reserva racial, reserva indigena/quilombola quando aplicavel, requisitos em JSON e salario-base em `numeric(14,2)`.

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

## Recursos de prova

Recursos ficam em `recrutamento.recurso` e so podem ser abertos enquanto `recrutamento.edital.resource_deadline_at` estiver vigente. A banca registra parecer e decisao administrativa, observando a publicidade e a impessoalidade do art. 37 da Constituicao Federal. A revisao judicial do gabarito segue a tese do STF no RE 632.853: nao ha substituicao ordinaria da banca pelo Judiciario, ressalvadas ilegalidades e erro grosseiro.

## Reservas legais

A validacao de backend bloqueia vagas com reserva superior ao total. Para cargos com cinco ou mais vagas, a reserva PCD minima e 5%, em alinhamento com CF art. 37 VIII, LBI 13.146/2015 e Decreto 9.508/2018. Para cargos com tres ou mais vagas, a reserva racial minima e 20%, conforme Lei 12.990/2014. A classificacao intercala a reserva racial nas posicoes 3, 8, 13 e subsequentes da chamada quando houver candidatos autodeclarados habilitados; candidatos negros aprovados pela ampla concorrencia nao consomem vaga reservada. Cotas locais para indigenas e quilombolas sao registradas em campo proprio e devem observar a norma municipal aplicavel.

## Seguranca e auditoria

As tabelas `recrutamento.concurso`, `recrutamento.edital`, `recrutamento.vaga`, `recrutamento.candidato`, `recrutamento.inscricao`, `recrutamento.payment_charge`, `recrutamento.prova`, `recrutamento.questao`, `recrutamento.gabarito`, `recrutamento.resposta_candidato`, `recrutamento.recurso`, `recrutamento.nota`, `recrutamento.classificacao_snapshot` e `recrutamento.classificacao_item` sao tenant-scoped e usam RLS com `sgp_tenant_matches(tenant_id)`. Toda mutacao dispara trigger com `sgp_append_audit_event(...)`. A API administrativa exige `@RequirePermission`; a leitura publica usa funcao `SECURITY DEFINER` limitada a concursos `PUBLISHED` ou `OPEN` com edital publicado, e o acompanhamento de inscricao publica e protegido por token de consulta.
