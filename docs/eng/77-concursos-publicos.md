# Concursos publicos

## Escopo

O modulo `recrutamento/concurso` administra a abertura de concursos publicos do SGP v0.0.1. Ele cobre cadastro do certame, vagas por cargo, reservas legais, versionamento de edital, publicacao do edital no Portal Transparencia e inscricao publica de candidatos. Provas, classificacao, nomeacao, posse e exercicio ficam nos slices REC-03 a REC-06.

## Modelo operacional

Cada concurso nasce em `DRAFT` com codigo publico, nome, validade e criador. As vagas sao registradas por cargo (`hr.job_position`) com total de vagas, reserva PCD, reserva racial, reserva indigena/quilombola quando aplicavel, requisitos em JSON e salario-base em `numeric(14,2)`.

O edital e versionado em `recrutamento.edital`. Cada versao guarda referencia documental, ato administrativo e data do ato. A publicacao exige uma versao existente do edital, ato administrativo, data do ato e URL publica. Ao publicar, o edital recebe `published_at`, `public_url` e o concurso passa para `PUBLISHED`; concursos publicados ficam disponiveis sem autenticacao em `/api/v1/publico/concursos/:slug`.

## Inscricao publica

O endpoint `POST /api/v1/publico/concursos/:slug/inscricoes` recebe inscricoes sem JWT, identificando o candidato por CPF e exigindo consentimento LGPD explicito com versao do termo. O fluxo grava `recrutamento.candidato`, `recrutamento.inscricao` e, quando nao ha isencao, `recrutamento.payment_charge` com gateway abstrato plugavel. O retorno inclui token de acompanhamento; `GET /api/v1/publico/inscricoes/:id?token=...` consulta somente a inscricao correspondente ao token.

A validacao do cargo usa o `requirement` JSON da vaga para idade minima, escolaridade e registro profissional. Autodeclaracoes de cota sao aceitas apenas de forma explicita para PCD, racial ou indigena. As regras federais de isencao cobrem CadUnico pelo Decreto 6.593/2008 e doadores de medula pela Lei 13.656/2018; inscricoes isentas ficam `EXEMPT` e nao geram cobranca.

## Reservas legais

A validacao de backend bloqueia vagas com reserva superior ao total. Para cargos com cinco ou mais vagas, a reserva PCD minima e 5%, em alinhamento com CF art. 37 VIII, LBI 13.146/2015 e Decreto 9.508/2018. Para cargos com tres ou mais vagas, a reserva racial minima e 20%, conforme Lei 12.990/2014. Cotas locais para indigenas e quilombolas sao registradas em campo proprio e devem observar a norma municipal aplicavel.

## Seguranca e auditoria

As tabelas `recrutamento.concurso`, `recrutamento.edital`, `recrutamento.vaga`, `recrutamento.candidato`, `recrutamento.inscricao` e `recrutamento.payment_charge` sao tenant-scoped e usam RLS com `sgp_tenant_matches(tenant_id)`. Toda mutacao dispara trigger com `sgp_append_audit_event(...)`. A API administrativa exige `@RequirePermission`; a leitura publica usa funcao `SECURITY DEFINER` limitada a concursos `PUBLISHED` ou `OPEN` com edital publicado, e o acompanhamento de inscricao publica e protegido por token de consulta.
