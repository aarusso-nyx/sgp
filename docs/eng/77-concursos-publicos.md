# Concursos publicos

## Escopo

O modulo `recrutamento/concurso` administra a abertura de concursos publicos do SGP v0.0.1. Ele cobre cadastro do certame, vagas por cargo, reservas legais, versionamento de edital e publicacao do edital no Portal Transparencia. Inscricoes, provas, classificacao, nomeacao, posse e exercicio ficam nos slices REC-02 a REC-06.

## Modelo operacional

Cada concurso nasce em `DRAFT` com codigo publico, nome, validade e criador. As vagas sao registradas por cargo (`hr.job_position`) com total de vagas, reserva PCD, reserva racial, reserva indigena/quilombola quando aplicavel, requisitos em JSON e salario-base em `numeric(14,2)`.

O edital e versionado em `recrutamento.edital`. Cada versao guarda referencia documental, ato administrativo e data do ato. A publicacao exige uma versao existente do edital, ato administrativo, data do ato e URL publica. Ao publicar, o edital recebe `published_at`, `public_url` e o concurso passa para `PUBLISHED`; concursos publicados ficam disponiveis sem autenticacao em `/api/v1/publico/concursos/:slug`.

## Reservas legais

A validacao de backend bloqueia vagas com reserva superior ao total. Para cargos com cinco ou mais vagas, a reserva PCD minima e 5%, em alinhamento com CF art. 37 VIII, LBI 13.146/2015 e Decreto 9.508/2018. Para cargos com tres ou mais vagas, a reserva racial minima e 20%, conforme Lei 12.990/2014. Cotas locais para indigenas e quilombolas sao registradas em campo proprio e devem observar a norma municipal aplicavel.

## Seguranca e auditoria

As tabelas `recrutamento.concurso`, `recrutamento.edital` e `recrutamento.vaga` sao tenant-scoped e usam RLS com `sgp_tenant_matches(tenant_id)` e permissoes `recrutamento.concurso.read`/`recrutamento.concurso.write`. Toda mutacao dispara trigger com `sgp_append_audit_event(...)`. A API administrativa exige `@RequirePermission`; a leitura publica usa funcao `SECURITY DEFINER` limitada a concursos `PUBLISHED` ou `OPEN` com edital publicado.
