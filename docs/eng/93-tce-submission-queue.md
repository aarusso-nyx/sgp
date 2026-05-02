# TCE-04 Fila de Submissao

## Escopo

O submodulo `source/backend/src/tce/queue/` instala a infraestrutura operacional das submissoes TCE. Ele usa fila Postgres em `tce.submission_queue`, historico em `tce.submission_attempt` e circuit breaker global em `tce.adapter_circuit_state`. O envio real a governo continua fora do v0.0.1: em CI e desenvolvimento o adapter AUDESP/SP opera somente contra o stub local.

## Modelo operacional

O worker reclama jobs com `FOR UPDATE SKIP LOCKED`, muda o status para `LOCKED` e executa o adapter correspondente. Falhas transitorias retornam para `RETRY` com backoff exponencial e jitter; falhas definitivas ficam em `FAILED`; excesso de `max_attempts` vai para `DEAD_LETTER`. Jobs ja bloqueados por outro no nao sao reclamados pela mesma varredura.

O circuit breaker usa a chave `adapter_id + endpoint_url`. Tres falhas transitorias consecutivas abrem o circuito por padrao. Durante `OPEN`, novas execucoes registram tentativa `CIRCUIT_OPEN` e voltam para `RETRY`; apos o cooldown, o worker passa para `HALF_OPEN` e permite uma sonda. Sucesso fecha o circuito e zera a contagem. Operadores com `tce.submission.manage` podem resetar manualmente o circuito.

## API administrativa

- `GET /api/v1/tce/queue`: lista jobs com filtros `adapter`, `state_code`, `status` e `competence`.
- `GET /api/v1/tce/queue/:id`: retorna drilldown do job com historico de tentativas.
- `POST /api/v1/tce/queue/:id/replay`: reabre jobs `FAILED`, `RETRY` ou `DEAD_LETTER` para nova tentativa.
- `GET /api/v1/tce/circuits`: lista circuitos por adapter e endpoint.
- `POST /api/v1/tce/circuits/:adapter_id/:endpoint/reset`: fecha manualmente o circuito.

Leitura exige `tce.submission.read`; mutacao exige `tce.submission.manage`.

## RLS e auditoria

`tce.submission_queue` e `tce.submission_attempt` sao tenant-scoped e usam `sgp_tenant_matches(tenant_id) AND sgp_has_any_permission(...)`. `tce.adapter_circuit_state` e global: leitura e liberada para operadores de submissao, e escrita normal e restrita ao caminho de worker com `app.bypass_rls=true`. Mutacoes de fila e tentativas disparam `sgp_append_audit_event(...)`; endpoints administrativos tambem registram auditoria de API.

## UI

A tela `source/frontend/src/app/features/tce/queue/` fica em `#!/tce/queue`. Ela mostra filtros por UF/adapter/status/competencia, lista jobs com tentativas, proximo retry e ultimo erro, abre drilldown com historico e payload, e exibe circuitos com acao de reset.
