# CAT e Prazos SST

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** SST-03, acidente de trabalho, CAT e eSocial S-2210.

## Decisao

O SGP registra acidentes de trabalho em `saude.work_accident` e emite CATs em `saude.cat_emission`. Cada emissao gera automaticamente uma pendencia `esocial.s2210_pending`, consumida pelo builder `backend/src/esocial-worker/builders/s2210.builder.ts` e enviada ao hub ES-07 por `ESocialEmitService.emit(...)`.

## Prazos

CAT inicial e de reabertura usam `deadline_at` no proximo dia util apos `accident_at`. CAT de obito usa prazo imediato: `deadline_at = emitted_at`. O painel `/api/v1/saude/acidentes/prazos` lista CATs sem `esocial_event_id` com vencimento em ate 4 horas, permitindo alerta operacional antes da multa prevista na Lei 8.213/1991 art. 22.

## Maquina de Estados

`saude.work_accident.status` segue a sequencia validada por trigger:

| De                  | Para                                         |
| ------------------- | -------------------------------------------- |
| `REGISTRADO`        | `COMUNICADO`                                 |
| `COMUNICADO`        | `REABERTO`, `COMUNICACAO_OBITO`, `ENCERRADO` |
| `REABERTO`          | `COMUNICACAO_OBITO`, `ENCERRADO`             |
| `COMUNICACAO_OBITO` | `ENCERRADO`                                  |

Tentativas de pular `REGISTRADO -> COMUNICACAO_OBITO` sao rejeitadas. Acidente fatal exige `death_at`; fechamento de acidente fatal exige CAT `OBITO` previamente emitida.

## Permissoes e RLS

As tabelas `saude.work_accident`, `saude.cat_emission` e `esocial.s2210_pending` usam RLS forçado por tenant com `sgp_tenant_matches(tenant_id)`. Leitura aceita `saude.cat.read`, `saude.cat.write`, `esocial.event.read` ou `esocial.event.write`; mutacao exige `saude.cat.write` ou `esocial.event.write`. Todas as mutacoes passam por `sgp_append_audit_event(...)`.
