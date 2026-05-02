# Eventos de Tabelas e Cadastro eSocial

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-01 e ES-02, eventos S-1xxx iniciais e S-2200/S-2205 de trabalhadores

## Decisao

Os eventos S-1xxx iniciais sao gerados por builders dedicados em `source/backend/src/esocial-worker/builders/` e sempre enviados ao `ESocialEmitService.emit(...)`. Nenhum builder escreve diretamente na fila. O controle de delta fica em `esocial.s1xxx_dispatch_state`, por `tenant_id`, tipo de evento e entidade de origem, comparando o hash SHA-256 do XML nao assinado.

Os eventos de cadastro de trabalhador seguem o mesmo hub ES-07. O S-2200 usa `esocial.s2200_emission_state` para bloquear reemissao sem alteracao real por `payload_hash`. O S-2205 e disparado apenas por campos de whitelist materializada em `esocial.s2205_trigger_field`: `address.zip`, `address.street`, `contact.email`, `contact.phone`, `marital_status`, `education_level` e `dependent.*`. Alteracoes fora dessa lista nao entram na fila `esocial.s2205_pending_alteration`.

## Mapa Entidade para Evento

| Evento | Entidade fonte                                           | Builder            |
| ------ | -------------------------------------------------------- | ------------------ |
| S-1000 | `hr.company` ou tenant quando ainda nao ha empresa ativa | `s1000.builder.ts` |
| S-1005 | `hr.branch`                                              | `s1005.builder.ts` |
| S-1010 | `payroll.payroll_earning_deduction`                      | `s1010.builder.ts` |
| S-1020 | `hr.work_location`                                       | `s1020.builder.ts` |
| S-1050 | `hr.shift`                                               | `s1050.builder.ts` |
| S-1070 | `hr.administrative_process`                              | `s1070.builder.ts` |
| S-2200 | `hr.employee` + `hr.employment_contract` + dependentes   | `s2200.builder.ts` |
| S-2205 | `esocial.s2205_pending_alteration` + cadastro atual      | `s2205.builder.ts` |

## Operacao

O painel administrativo fica em `source/frontend/src/app/features/esocial/tabelas/` e permite consultar o ultimo hash emitido por evento e acionar a reemissao de delta. As rotas administrativas ficam em `/api/v1/esocial/tabelas-iniciais` e exigem `esocial.event.read` para consulta e `esocial.event.write` para emissao.

O painel de trabalhadores fica em `source/frontend/src/app/features/esocial/trabalhadores/` e lista matricula, servidor, recibo S-2200 e pendencias S-2205. As rotas `/api/v1/esocial/trabalhadores` usam `esocial.event.read`; as emissoes manuais de S-2200 e S-2205 usam `esocial.event.write`.

## Auditoria e RLS

`public.esocial_event`, `esocial.s1xxx_dispatch_state`, `esocial.s2200_emission_state` e `esocial.s2205_pending_alteration` usam RLS forçado por tenant com `sgp_tenant_matches(tenant_id)` e permissoes `esocial.event.read`/`esocial.event.write`. A emissao grava `public.esocial_event` e `public.audit_event`; a atualizacao de estado tambem usa `sgp_append_audit_event(...)` por trigger ou servico.
