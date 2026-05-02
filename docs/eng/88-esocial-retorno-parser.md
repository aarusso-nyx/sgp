# Parser de Retorno eSocial

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-09, retorno de lote, status de evento, recibos e fila administrativa.

## Decisao

O parser de retorno usa `backend/src/esocial-worker/parsers/` para ler as mensagens oficiais `RetornoEnvioLoteEventos` e `RetornoProcessamentoLoteEventos`. A tabela canonical de eventos permanece `public.esocial_event`; nao ha schema de compatibilidade. Os campos de sincronizacao sao fisicamente em ingles: `receipt_number`, `protocol_number`, `response_code`, `response_description`, `response_errors` e `last_response_at`.

## Fluxo

`ProtocolParser` extrai `protocoloEnvio` do retorno de envio. `ProcessingParser` extrai o status do lote, `ideEmpregador`, `ideTransmissor`, cada evento retornado, recibo individual e ocorrencias. `StatusSyncService` resolve cada evento por `id` ou `reference`, consulta `esocial.response_classification` e atualiza `public.esocial_event.status`. Retornos aceitos viram `PROCESSADO_COM_SUCESSO`; retornos recuperaveis viram `ERRO_TECNICO_RETENTAVEL`; retornos definitivos viram `ERRO_DEFINITIVO`.

## Retry

`esocial.event_retry_schedule` guarda `tenant_id`, `event_id`, `attempt`, `next_at` e `last_error`. O backoff e exponencial, limitado a uma hora, com jitter. O scheduler do worker consome linhas com `next_at <= now()`, recoloca os eventos em `PENDENTE` e remove a linha de retry para permitir nova submissao.

## UI Administrativa

`frontend/src/app/features/esocial/retornos/` mostra a fila de retornos definitivos e recuperaveis a partir de `esocial.v_event_failures`. Erros definitivos exibem `cdResposta` traduzido e o botao "Tratado" para uso apos a correcao do dado de origem. Erros recuperaveis mostram a proxima tentativa e permitem retry imediato. Nao ha pagina portal neste fluxo.

## Seguranca

`esocial.event_retry_schedule` e tenant-scoped, forca RLS e usa `sgp_tenant_matches(tenant_id)` com `sgp_has_any_permission(...)`. Leituras exigem `esocial.event.read` ou `esocial.event.retry`; mutacoes exigem `esocial.event.retry`. Mutacoes da agenda appendam auditoria via `sgp_append_audit_event(...)`.
