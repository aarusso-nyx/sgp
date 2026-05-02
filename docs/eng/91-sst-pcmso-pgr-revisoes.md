# SST-02 — PCMSO e PGR: revisoes e ciclo de vida

## Escopo

O modulo `saude` mantem PCMSO e PGR por estabelecimento (`hr.work_location`). O PCMSO registra vigencia anual, medico responsavel e exames periodicos obrigatorios derivados do catalogo de SST-01. O PGR registra vigencia anual, responsavel tecnico e o snapshot de riscos ambientais vigente; o inventario detalhado de exposicoes e EPIs permanece no escopo de SST-05.

## Modelo

- `saude.health_program`: PCMSO por estabelecimento, com status `DRAFT`, `ACTIVE`, `SUPERSEDED` ou `ARCHIVED`.
- `saude.risk_management_program`: PGR por estabelecimento, com o mesmo ciclo de status.
- `saude.pcmso_required_exam`: exames obrigatorios do PCMSO, opcionalmente restritos a cargo e com periodicidade especifica.
- `saude.program_revision`: historico append-only de snapshots assinaveis para PCMSO e PGR.

Somente um PCMSO e um PGR podem ficar `ACTIVE` por estabelecimento e tenant. A ativacao de um rascunho supersede o programa ativo anterior e cria uma revisao imutavel. Revisoes anuais tambem criam novo registro em `program_revision`, com referencia ao snapshot anterior.

## Regras operacionais

Ao admitir um servidor em estabelecimento com PCMSO ativo, o backend cria a agenda de ASO periodico com os exames de `pcmso_required_exam`. A data prevista usa a periodicidade especifica do PCMSO quando existir, depois a periodicidade do exame, e por fim 12 meses como padrao conservador.

As tabelas sao tenant-scoped, com RLS por `sgp_tenant_matches(tenant_id)` e permissao `saude.program.read` ou `saude.program.write`. Mutacoes passam pelos triggers de auditoria via `sgp_append_audit_event`. `program_revision` bloqueia `UPDATE` e `DELETE` por trigger para manter snapshots append-only.
