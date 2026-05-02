# Eventos de Tabelas e Cadastro eSocial

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-01, ES-02, ES-03, ES-04, ES-05, ES-06, SST-03, SST-04 e SST-05, eventos S-1xxx iniciais, S-1200/S-1210, S-1299, totalizadores S-5xxx, S-2200/S-2205, S-2210, S-2220, S-2230, S-2240, S-2299 e S-3000

## Decisao

Os eventos S-1xxx iniciais sao gerados por builders dedicados em `backend/src/esocial-worker/builders/` e sempre enviados ao `ESocialEmitService.emit(...)`. Nenhum builder escreve diretamente na fila. O controle de delta fica em `esocial.s1xxx_dispatch_state`, por `tenant_id`, tipo de evento e entidade de origem, comparando o hash SHA-256 do XML nao assinado.

Os eventos de cadastro de trabalhador seguem o mesmo hub ES-07. O S-2200 usa `esocial.s2200_emission_state` para bloquear reemissao sem alteracao real por `payload_hash`. O S-2205 e disparado apenas por campos de whitelist materializada em `esocial.s2205_trigger_field`: `address.zip`, `address.street`, `contact.email`, `contact.phone`, `marital_status`, `education_level` e `dependent.*`. Alteracoes fora dessa lista nao entram na fila `esocial.s2205_pending_alteration`.

O ES-03 adiciona eventos de afastamento e desligamento ao mesmo hub. S-2230 e enfileirado em `esocial.s2230_pending` quando `hr.leave_record` fica `ACTIVE` ou quando `hr.vacation_record` passa para `aprovado`/`gozado`; ferias sempre saem com `codMotAfast=15` e periodo aquisitivo quando disponivel. S-2299 e enfileirado em `esocial.s2299_pending` apenas depois que o vinculo possui `termination_payroll_run_id` apontando para `payroll.payroll_run.status = GENERATED`, preservando a dependencia CALC-12 antes de montar verbas rescisorias.

O ES-04 cobre a folha periodica. S-1200 e gerado por trabalhador a partir de `payroll.payroll_run` somente quando `status = GENERATED`, agrupando rubricas da folha por trabalhador e registrando `public.esocial_event.payroll_run_id` para reconciliacao posterior com totalizadores. S-1210 usa `payroll.payment_remittance_file` e `payroll.payment_remittance_detail` de BANK-01 somente depois da confirmacao bancaria materializada como `status = PAID`; os `vrLiq` emitidos reconciliam com a soma confirmada dos detalhes aceitos da remessa. Os estados ficam em `esocial.s1200_emission_state` e `esocial.s1210_emission_state`, com `payload_hash` por trabalhador para bloquear duplicidades sem mudanca real.

O ES-05 implementa o fechamento S-1299 da competencia. O builder consulta `esocial.v_competence_periodics_pending` antes de montar o XML e bloqueia a emissao se houver trabalhador com S-1200 ou S-1210 sem recibo. O estado fica em `esocial.s1299_emission_state`, por tenant e competencia mensal, com `recibo`, `emitted_at`, `accepted_at` e status `PENDING`, `EMITTED`, `ACCEPTED` ou `REJECTED`. Os totalizadores S-5001, S-5002, S-5003, S-5011, S-5012 e S-5013 sao apenas consumidos do retorno gov.br; o parser identifica o tipo pelo evento XML, extrai a competencia e o recibo de origem, e persiste o payload bruto em `esocial.esocial_totalizer`.

O ES-06 implementa exclusao de eventos por S-3000. O usuario com permissao `esocial.event.exclude` solicita a retratacao de um `public.esocial_event` aceito, informa justificativa minima de 30 caracteres e gera uma linha auditada em `esocial.s3000_request`. O builder `s3000.builder.ts` monta `evtExclusao` referenciando `nrRecEvt` do evento original e envia pelo hub ES-07. Ao receber aceite do S-3000, o worker marca a solicitacao como `ACCEPTED` e muda o evento original para `EXCLUIDO`.

O SST-04 implementa o monitoramento da saude S-2220 a partir de `saude.aso_record`. Quando um ASO muda para `ARCHIVED`, o trigger `esocial.sgp_enqueue_s2220_from_aso()` insere `esocial.s2220_pending`. O builder `s2220.builder.ts` monta `evtMonit` com tipo do ASO, data, conclusao, exames complementares em ordem e medico emitente, valida pelo XSD S-1.3 via ES-07 e grava `saude.aso_record.s2220_event_id` em caso de sucesso. Falha XSD incrementa `attempts`, persiste `last_error` e mantem a entrada para retentativa manual.

O SST-03 implementa a CAT S-2210 a partir de `saude.work_accident` e `saude.cat_emission`. Cada CAT inicial, reabertura ou comunicacao de obito gera uma entrada em `esocial.s2210_pending`; o builder `s2210.builder.ts` monta `evtCAT` com `tpCat` 1, 2 ou 3, valida no XSD S-1.3 pelo hub ES-07 e grava `saude.cat_emission.esocial_event_id` quando a emissao e aceita pelo hub. Reabertura e obito referenciam a CAT anterior pelo recibo quando disponivel; falhas de validacao mantem a pendencia com `attempts` e `last_error`.

O SST-05 implementa as condicoes ambientais do trabalho S-2240 a partir de `saude.environmental_exposure`, vinculada a PGR ativo de SST-02. Insercoes geram pendencia `START`; alteracoes materiais geram `CHANGE`; encerramento por `exposure_end` gera `END`. O builder `s2240.builder.ts` monta `evtExpRisco` por exposicao, inclui EPI/EPC quando aplicavel, valida no XSD S-1.3 pelo hub ES-07 e remove a linha de `esocial.s2240_pending` quando a emissao e aceita. Falhas mantem a pendencia com `attempts` e `last_error`.

## Mapa Entidade para Evento

| Evento | Entidade fonte                                                                | Builder            |
| ------ | ----------------------------------------------------------------------------- | ------------------ |
| S-1000 | `hr.company` ou tenant quando ainda nao ha empresa ativa                      | `s1000.builder.ts` |
| S-1005 | `hr.branch`                                                                   | `s1005.builder.ts` |
| S-1010 | `payroll.payroll_earning_deduction`                                           | `s1010.builder.ts` |
| S-1020 | `hr.work_location`                                                            | `s1020.builder.ts` |
| S-1050 | `hr.shift`                                                                    | `s1050.builder.ts` |
| S-1070 | `hr.administrative_process`                                                   | `s1070.builder.ts` |
| S-1200 | `payroll.payroll_run` gerado + itens da folha                                 | `s1200.builder.ts` |
| S-1210 | `payroll.payment_remittance_file` pago + detalhes confirmados                 | `s1210.builder.ts` |
| S-1299 | `esocial.s1299_emission_state` + guarda de periodicos da competencia          | `s1299.builder.ts` |
| S-2200 | `hr.employee` + `hr.employment_contract` + dependentes                        | `s2200.builder.ts` |
| S-2205 | `esocial.s2205_pending_alteration` + cadastro atual                           | `s2205.builder.ts` |
| S-2210 | `esocial.s2210_pending` + `saude.cat_emission`/`saude.work_accident`          | `s2210.builder.ts` |
| S-2220 | `esocial.s2220_pending` + `saude.aso_record`/`saude.aso_exam_item`            | `s2220.builder.ts` |
| S-2230 | `esocial.s2230_pending` + `hr.leave_record`/`hr.vacation_record`              | `s2230.builder.ts` |
| S-2240 | `esocial.s2240_pending` + `saude.environmental_exposure`                      | `s2240.builder.ts` |
| S-2299 | `esocial.s2299_pending` + `hr.employment_link` + `payroll.payroll_run` gerado | `s2299.builder.ts` |
| S-3000 | `esocial.s3000_request` + `public.esocial_event` alvo                         | `s3000.builder.ts` |

## Operacao

O painel administrativo fica em `frontend/src/app/features/esocial/tabelas/` e permite consultar o ultimo hash emitido por evento e acionar a reemissao de delta. As rotas administrativas ficam em `/api/v1/esocial/tabelas-iniciais` e exigem `esocial.event.read` para consulta e `esocial.event.write` para emissao.

O painel de trabalhadores fica em `frontend/src/app/features/esocial/trabalhadores/` e lista matricula, servidor, recibo S-2200 e pendencias S-2205. As rotas `/api/v1/esocial/trabalhadores` usam `esocial.event.read`; as emissoes manuais de S-2200 e S-2205 usam `esocial.event.write`.

As filas de CAT, monitoramento de saude, agentes nocivos, afastamentos e desligamentos ficam em `/api/v1/esocial/eventos-trabalhador` e aparecem nas abas "CAT (S-2210)", "Monitoramento Saúde (S-2220)", "Agentes Nocivos (S-2240)", "Afastamentos" e "Desligamentos" do mesmo painel administrativo. A emissao manual de S-2210 usa `POST /api/v1/esocial/eventos-trabalhador/s2210/:catEmissionId/emitir`. A retentativa manual de S-2220 usa `POST /api/v1/esocial/eventos-trabalhador/s2220/:asoRecordId/retry` e mantem `last_error` quando a validacao XSD rejeita o XML. A emissao manual de S-2240 usa `POST /api/v1/esocial/eventos-trabalhador/s2240/:environmentalExposureId/emitir` com `triggerEvent` `START`, `END` ou `CHANGE`. A emissao manual de S-2299 bloqueia explicitamente se a folha de rescisao CALC-12 ainda nao estiver `GENERATED`.

O painel de folha periodica fica em `frontend/src/app/features/esocial/folha-periodica/` e consulta `/api/v1/esocial/folha-periodica?year=AAAA&month=MM`. Ele exibe trabalhadores do run, status S-1200, status S-1210, recibos e a acao "Reemitir trabalhador". A emissao manual de S-1200 usa `/runs/:payrollRunId/s1200/emitir`; S-1210 usa `/payments/:paymentBatchId/s1210/emitir`. Consultas exigem `esocial.event.read`; emissoes exigem `esocial.event.write`.

O painel de fechamento fica em `frontend/src/app/features/esocial/fechamento/` e consulta `/api/v1/esocial/fechamento?year=AAAA&month=MM`. Ele mostra pendencias de S-1200/S-1210, habilita "Fechar competencia" somente quando a guarda esta limpa, e lista totalizadores S-5xxx recebidos. A emissao usa `POST /api/v1/esocial/fechamento/fechar`; a ingestao tecnica de retorno usa `POST /api/v1/esocial/fechamento/totalizadores`. Reabertura S-1298 fica fora do escopo e a rota `POST /api/v1/esocial/fechamento/reabrir` rejeita explicitamente com "Out of scope".

O painel de exclusao fica em `frontend/src/app/features/esocial/exclusao/`, lista eventos aceitos com recibo e acompanha `esocial.s3000_request`. A rota `POST /api/v1/esocial/events/:id/exclude` exige `esocial.event.exclude` e rejeita justificativas curtas. Eventos periodicos (`S-1200`, `S-1202`, `S-1207`, `S-1210`, `S-1280`, `S-1300`) sao bloqueados se existir `esocial.s1299_emission_state.status = ACCEPTED` para a mesma competencia; o bloqueio grava `block_reason = periodic_competence_closed_by_s1299` e nao chama o hub de emissao.

## Auditoria e RLS

`public.esocial_event`, `esocial.s1xxx_dispatch_state`, `esocial.s1200_emission_state`, `esocial.s1210_emission_state`, `esocial.s2200_emission_state`, `esocial.s2205_pending_alteration`, `esocial.s2210_pending`, `esocial.s2220_pending`, `esocial.s2230_pending`, `esocial.s2240_pending`, `esocial.s2299_pending`, `esocial.s1299_emission_state`, `esocial.esocial_totalizer` e `esocial.s3000_request` usam RLS forçado por tenant com `sgp_tenant_matches(tenant_id)`. Leitura usa `esocial.event.read`; emissoes usam `esocial.event.write`; retratacoes S-3000 usam `esocial.event.exclude`. A emissao grava `public.esocial_event` e `public.audit_event`; a atualizacao de estado tambem usa `sgp_append_audit_event(...)` por trigger ou servico, incluindo `requested_by_user_id` e `justification` da retratacao.
