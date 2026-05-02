# Eventos de Tabelas Iniciais eSocial

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-01, eventos S-1xxx iniciais

## Decisao

Os eventos S-1xxx iniciais sao gerados por builders dedicados em `source/backend/src/esocial-worker/builders/` e sempre enviados ao `ESocialEmitService.emit(...)`. Nenhum builder escreve diretamente na fila. O controle de delta fica em `esocial.s1xxx_dispatch_state`, por `tenant_id`, tipo de evento e entidade de origem, comparando o hash SHA-256 do XML nao assinado.

## Mapa Entidade para Evento

| Evento | Entidade fonte                                           | Builder            |
| ------ | -------------------------------------------------------- | ------------------ |
| S-1000 | `hr.company` ou tenant quando ainda nao ha empresa ativa | `s1000.builder.ts` |
| S-1005 | `hr.branch`                                              | `s1005.builder.ts` |
| S-1010 | `payroll.payroll_earning_deduction`                      | `s1010.builder.ts` |
| S-1020 | `hr.work_location`                                       | `s1020.builder.ts` |
| S-1050 | `hr.shift`                                               | `s1050.builder.ts` |
| S-1070 | `hr.administrative_process`                              | `s1070.builder.ts` |

## Operacao

O painel administrativo fica em `source/frontend/src/app/features/esocial/tabelas/` e permite consultar o ultimo hash emitido por evento e acionar a reemissao de delta. As rotas administrativas ficam em `/api/v1/esocial/tabelas-iniciais` e exigem `esocial.event.read` para consulta e `esocial.event.write` para emissao.

## Auditoria e RLS

`public.esocial_event` e `esocial.s1xxx_dispatch_state` usam RLS forçado por tenant com `sgp_tenant_matches(tenant_id)` e permissoes `esocial.event.read`/`esocial.event.write`. A emissao grava `public.esocial_event` e `public.audit_event`; a atualizacao de estado tambem usa `sgp_append_audit_event(...)` por trigger.
