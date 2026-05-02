# PONTO-06 - Justificativa de ausencia e abono

## Escopo

O fluxo PONTO-06 registra justificativas de ausencia em `ponto.absence_justification`, vincula marcacoes reais abonadas por `ponto.time_record_justification_link` e informa PONTO-05/PONTO-07 pelo tratamento de folha `PAID`, `UNPAID` ou `HOUR_BANK_NEUTRAL`.

## Tipos

Os tipos fisicos aceitos sao `MEDICAL`, `MARRIAGE`, `BEREAVEMENT`, `BLOOD_DONATION`, `MILITARY`, `VOTING`, `PATERNITY`, `MATERNITY`, `LEGAL_DUTY`, `UNION`, `TRAINING` e `OTHER`. Eles cobrem as hipoteses operacionais da CLT art. 473, Lei 8.112/90 art. 97, atestado medico e eventos correlatos de RH.

## Workflow

O empregado cria a solicitacao por `POST /v1/ponto/justifications` com periodo, tipo, justificativa textual e anexo opcional em `public.document_attachment`. A chefia decide por `POST /v1/ponto/justifications/:id/decide`. As transicoes permitidas sao `REQUESTED -> APPROVED`, `REQUESTED -> REJECTED` e `REQUESTED -> CANCELLED`; estados finais nao retornam para edicao.

Toda decisao valida que o aprovador esteja vinculado a um empregado do mesmo tenant e nao seja o proprio solicitante. A verificacao fica isolada no workflow para evoluir quando HR-06 expuser uma relacao formal de chefia imediata.

## Integracoes

Na aprovacao, marcacoes `ponto.time_record` do mesmo empregado dentro do intervalo sao vinculadas em `ponto.time_record_justification_link`, preservando a marcacao original e registrando o abono como camada de interpretacao. Atestado `MEDICAL` com mais de 15 dias cria handoff em `hr.leave_record`, herdando `attachment_id` como referencia documental para a continuidade HR-04. O detalhamento pericial permanece no fluxo de licenca saude.

PONTO-07 deve consumir `JustificationPayrollBridgeService`: `payroll_treatment=PAID` compoe minutos abonados sem desconto, `UNPAID` preserva desconto, e `HOUR_BANK_NEUTRAL` evita alimentar banco negativo em PONTO-05.

## Seguranca e auditoria

As tabelas sao tenant-scoped, com RLS por `sgp_tenant_matches(tenant_id)` e permissoes `ponto.justification.read`, `ponto.justification.write` e `ponto.justification.approve`. Triggers de mutacao chamam `sgp_append_audit_event(...)` para solicitacoes, decisoes e vinculos de marcacao.
