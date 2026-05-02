# Eventos de Tabelas e Cadastro eSocial

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-01, ES-02 e ES-03, eventos S-1xxx iniciais, S-2200/S-2205, S-2230 e S-2299

## Decisao

Os eventos S-1xxx iniciais sao gerados por builders dedicados em `source/backend/src/esocial-worker/builders/` e sempre enviados ao `ESocialEmitService.emit(...)`. Nenhum builder escreve diretamente na fila. O controle de delta fica em `esocial.s1xxx_dispatch_state`, por `tenant_id`, tipo de evento e entidade de origem, comparando o hash SHA-256 do XML nao assinado.

Os eventos de cadastro de trabalhador seguem o mesmo hub ES-07. O S-2200 usa `esocial.s2200_emission_state` para bloquear reemissao sem alteracao real por `payload_hash`. O S-2205 e disparado apenas por campos de whitelist materializada em `esocial.s2205_trigger_field`: `address.zip`, `address.street`, `contact.email`, `contact.phone`, `marital_status`, `education_level` e `dependent.*`. Alteracoes fora dessa lista nao entram na fila `esocial.s2205_pending_alteration`.

O ES-03 adiciona eventos de afastamento e desligamento ao mesmo hub. S-2230 e enfileirado em `esocial.s2230_pending` quando `hr.leave_record` fica `ACTIVE` ou quando `hr.vacation_record` passa para `aprovado`/`gozado`; ferias sempre saem com `codMotAfast=15` e periodo aquisitivo quando disponivel. S-2299 e enfileirado em `esocial.s2299_pending` apenas depois que o vinculo possui `termination_payroll_run_id` apontando para `payroll.payroll_run.status = GENERATED`, preservando a dependencia CALC-12 antes de montar verbas rescisorias.

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
| S-2230 | `esocial.s2230_pending` + `hr.leave_record`/`hr.vacation_record` | `s2230.builder.ts` |
| S-2299 | `esocial.s2299_pending` + `hr.employment_link` + `payroll.payroll_run` gerado | `s2299.builder.ts` |

## Operacao

O painel administrativo fica em `source/frontend/src/app/features/esocial/tabelas/` e permite consultar o ultimo hash emitido por evento e acionar a reemissao de delta. As rotas administrativas ficam em `/api/v1/esocial/tabelas-iniciais` e exigem `esocial.event.read` para consulta e `esocial.event.write` para emissao.

O painel de trabalhadores fica em `source/frontend/src/app/features/esocial/trabalhadores/` e lista matricula, servidor, recibo S-2200 e pendencias S-2205. As rotas `/api/v1/esocial/trabalhadores` usam `esocial.event.read`; as emissoes manuais de S-2200 e S-2205 usam `esocial.event.write`.

As filas de afastamentos e desligamentos ficam em `/api/v1/esocial/eventos-trabalhador` e aparecem nas abas "Afastamentos" e "Desligamentos" do mesmo painel administrativo. A emissao manual de S-2299 bloqueia explicitamente se a folha de rescisao CALC-12 ainda nao estiver `GENERATED`.

## Auditoria e RLS

`public.esocial_event`, `esocial.s1xxx_dispatch_state`, `esocial.s2200_emission_state`, `esocial.s2205_pending_alteration`, `esocial.s2230_pending` e `esocial.s2299_pending` usam RLS forçado por tenant com `sgp_tenant_matches(tenant_id)` e permissoes `esocial.event.read`/`esocial.event.write`. A emissao grava `public.esocial_event` e `public.audit_event`; a atualizacao de estado tambem usa `sgp_append_audit_event(...)` por trigger ou servico.
