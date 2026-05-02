# Eventos de Tabelas e Cadastro eSocial

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-01, ES-02, ES-03 e ES-06, eventos S-1xxx iniciais, S-2200/S-2205, S-2230, S-2299 e S-3000

## Decisao

Os eventos S-1xxx iniciais sao gerados por builders dedicados em `source/backend/src/esocial-worker/builders/` e sempre enviados ao `ESocialEmitService.emit(...)`. Nenhum builder escreve diretamente na fila. O controle de delta fica em `esocial.s1xxx_dispatch_state`, por `tenant_id`, tipo de evento e entidade de origem, comparando o hash SHA-256 do XML nao assinado.

Os eventos de cadastro de trabalhador seguem o mesmo hub ES-07. O S-2200 usa `esocial.s2200_emission_state` para bloquear reemissao sem alteracao real por `payload_hash`. O S-2205 e disparado apenas por campos de whitelist materializada em `esocial.s2205_trigger_field`: `address.zip`, `address.street`, `contact.email`, `contact.phone`, `marital_status`, `education_level` e `dependent.*`. Alteracoes fora dessa lista nao entram na fila `esocial.s2205_pending_alteration`.

O ES-03 adiciona eventos de afastamento e desligamento ao mesmo hub. S-2230 e enfileirado em `esocial.s2230_pending` quando `hr.leave_record` fica `ACTIVE` ou quando `hr.vacation_record` passa para `aprovado`/`gozado`; ferias sempre saem com `codMotAfast=15` e periodo aquisitivo quando disponivel. S-2299 e enfileirado em `esocial.s2299_pending` apenas depois que o vinculo possui `termination_payroll_run_id` apontando para `payroll.payroll_run.status = GENERATED`, preservando a dependencia CALC-12 antes de montar verbas rescisorias.

O ES-06 implementa exclusao de eventos por S-3000. O usuario com permissao `esocial.event.exclude` solicita a retratacao de um `public.esocial_event` aceito, informa justificativa minima de 30 caracteres e gera uma linha auditada em `esocial.s3000_request`. O builder `s3000.builder.ts` monta `evtExclusao` referenciando `nrRecEvt` do evento original e envia pelo hub ES-07. Ao receber aceite do S-3000, o worker marca a solicitacao como `ACCEPTED` e muda o evento original para `EXCLUIDO`.

## Mapa Entidade para Evento

| Evento | Entidade fonte                                                                | Builder            |
| ------ | ----------------------------------------------------------------------------- | ------------------ |
| S-1000 | `hr.company` ou tenant quando ainda nao ha empresa ativa                      | `s1000.builder.ts` |
| S-1005 | `hr.branch`                                                                   | `s1005.builder.ts` |
| S-1010 | `payroll.payroll_earning_deduction`                                           | `s1010.builder.ts` |
| S-1020 | `hr.work_location`                                                            | `s1020.builder.ts` |
| S-1050 | `hr.shift`                                                                    | `s1050.builder.ts` |
| S-1070 | `hr.administrative_process`                                                   | `s1070.builder.ts` |
| S-2200 | `hr.employee` + `hr.employment_contract` + dependentes                        | `s2200.builder.ts` |
| S-2205 | `esocial.s2205_pending_alteration` + cadastro atual                           | `s2205.builder.ts` |
| S-2230 | `esocial.s2230_pending` + `hr.leave_record`/`hr.vacation_record`              | `s2230.builder.ts` |
| S-2299 | `esocial.s2299_pending` + `hr.employment_link` + `payroll.payroll_run` gerado | `s2299.builder.ts` |
| S-3000 | `esocial.s3000_request` + `public.esocial_event` alvo                         | `s3000.builder.ts` |

## Operacao

O painel administrativo fica em `source/frontend/src/app/features/esocial/tabelas/` e permite consultar o ultimo hash emitido por evento e acionar a reemissao de delta. As rotas administrativas ficam em `/api/v1/esocial/tabelas-iniciais` e exigem `esocial.event.read` para consulta e `esocial.event.write` para emissao.

O painel de trabalhadores fica em `source/frontend/src/app/features/esocial/trabalhadores/` e lista matricula, servidor, recibo S-2200 e pendencias S-2205. As rotas `/api/v1/esocial/trabalhadores` usam `esocial.event.read`; as emissoes manuais de S-2200 e S-2205 usam `esocial.event.write`.

As filas de afastamentos e desligamentos ficam em `/api/v1/esocial/eventos-trabalhador` e aparecem nas abas "Afastamentos" e "Desligamentos" do mesmo painel administrativo. A emissao manual de S-2299 bloqueia explicitamente se a folha de rescisao CALC-12 ainda nao estiver `GENERATED`.

O painel de exclusao fica em `source/frontend/src/app/features/esocial/exclusao/`, lista eventos aceitos com recibo e acompanha `esocial.s3000_request`. A rota `POST /api/v1/esocial/events/:id/exclude` exige `esocial.event.exclude` e rejeita justificativas curtas. Eventos periodicos (`S-1200`, `S-1202`, `S-1207`, `S-1210`, `S-1280`, `S-1300`) sao bloqueados se existir `esocial.s1299_emission_state.status = ACCEPTED` para a mesma competencia; o bloqueio grava `block_reason = periodic_competence_closed_by_s1299` e nao chama o hub de emissao.

## Auditoria e RLS

`public.esocial_event`, `esocial.s1xxx_dispatch_state`, `esocial.s2200_emission_state`, `esocial.s2205_pending_alteration`, `esocial.s2230_pending`, `esocial.s2299_pending`, `esocial.s1299_emission_state` e `esocial.s3000_request` usam RLS forçado por tenant com `sgp_tenant_matches(tenant_id)`. Leitura usa `esocial.event.read`; emissoes usam `esocial.event.write`; retratacoes S-3000 usam `esocial.event.exclude`. A emissao grava `public.esocial_event` e `public.audit_event`; a atualizacao de estado tambem usa `sgp_append_audit_event(...)` por trigger ou servico, incluindo `requested_by_user_id` e `justification` da retratacao.
