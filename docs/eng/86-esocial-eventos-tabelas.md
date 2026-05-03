# Eventos de Tabelas e Cadastro eSocial

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-01, ES-02, ES-03, ES-04, ES-05, ES-06, SST-03, SST-04 e SST-05, eventos S-1xxx iniciais, S-1200/S-1202/S-1207/S-1210, S-1298/S-1299, totalizadores S-5xxx, S-2200/S-2205/S-2206, S-2210, S-2220, S-2230, S-2240, S-2299, S-2400/S-2405/S-2410/S-2416/S-2418/S-2420 e S-3000

## Decisao

Os eventos S-1xxx iniciais sao gerados por builders dedicados em `backend/src/esocial-worker/builders/` e sempre enviados ao `ESocialEmitService.emit(...)`. Nenhum builder escreve diretamente na fila. O controle de delta fica em `esocial.s1xxx_dispatch_state`, por `tenant_id`, tipo de evento e entidade de origem, comparando o hash SHA-256 do XML nao assinado.

Os eventos de cadastro de trabalhador seguem o mesmo hub ES-07. O S-2200 usa `esocial.s2200_emission_state` para bloquear reemissao sem alteracao real por `payload_hash`. O S-2205 e disparado apenas por campos de whitelist materializada em `esocial.s2205_trigger_field`: `address.zip`, `address.street`, `contact.email`, `contact.phone`, `marital_status`, `education_level` e `dependent.*`. Alteracoes fora dessa lista nao entram na fila `esocial.s2205_pending_alteration`. O S-2206 usa `s2206.builder.ts` para montar `evtAltContratual` a partir do estado atual de `hr.employee`, `hr.employment_link`, `hr.employment_contract`, cargo e local de trabalho, cobrindo promocao, transferencia e alteracao de regime sem criar rota publica nova nesta etapa.

O ES-03 adiciona eventos de afastamento e desligamento ao mesmo hub. S-2230 e enfileirado em `esocial.s2230_pending` quando `hr.leave_record` fica `ACTIVE` ou quando `hr.vacation_record` passa para `aprovado`/`gozado`; ferias sempre saem com `codMotAfast=15` e periodo aquisitivo quando disponivel. S-2299 e enfileirado em `esocial.s2299_pending` apenas depois que o vinculo possui `termination_payroll_run_id` apontando para `payroll.payroll_run.status = GENERATED`, preservando a dependencia CALC-12 antes de montar verbas rescisorias.

O ES-04 cobre a folha periodica. S-1200 e gerado por trabalhador RGPS a partir de `payroll.payroll_run` somente quando `status = GENERATED`, agrupando rubricas da folha por trabalhador e registrando `public.esocial_event.payroll_run_id` para reconciliacao posterior com totalizadores. S-1202 cobre servidores RPPS com `hr.employment_link.contract_type` `statutory` ou `commissioned`, usa o XSD local S-1.3 `evtRmnRPPS.xsd`, categorias `301` e `302`, e grava estado proprio em `esocial.s1202_emission_state`. S-1207 usa o XSD local S-1.3 `evtBenPrRP.xsd` para beneficios previdenciarios RPPS; o builder agrupa rubricas de `payroll.employee_payroll_item` somente quando a linha pode ser reconciliada a um beneficio S-2410 ativo por `hr.retirement_grant` ou `hr.pension_grant`, reutilizando `sourceKind` e `nrBeneficio` deterministico. S-1210 usa `payroll.payment_remittance_file` e `payroll.payment_remittance_detail` de BANK-01 somente depois da confirmacao bancaria materializada como `status = PAID`; os `vrLiq` emitidos reconciliam com a soma confirmada dos detalhes aceitos da remessa. Os estados ficam em `esocial.s1200_emission_state`, `esocial.s1202_emission_state` e `esocial.s1210_emission_state`, com `payload_hash` por trabalhador para bloquear duplicidades sem mudanca real.

O ES-05 implementa o fechamento S-1299 da competencia e a reabertura S-1298. O builder S-1299 consulta `esocial.v_competence_periodics_pending` antes de montar o XML e bloqueia a emissao se houver trabalhador com S-1200, S-1202 ou S-1210 sem recibo. O builder S-1298 exige fechamento S-1299 aceito com recibo para a competencia antes de emitir `evtReabreEvPer`; apos a emissao, o estado local volta para `PENDING` e limpa `recibo`, `emitted_at` e `accepted_at`. O estado fica em `esocial.s1299_emission_state`, por tenant e competencia mensal, com `recibo`, `emitted_at`, `accepted_at` e status `PENDING`, `EMITTED`, `ACCEPTED` ou `REJECTED`. Os totalizadores S-5001, S-5002, S-5003, S-5011, S-5012 e S-5013 sao apenas consumidos do retorno gov.br; o parser identifica o tipo pelo evento XML, extrai a competencia e o recibo de origem, persiste o payload bruto em `esocial.esocial_totalizer` e estrutura S-5001/S-5002 para reconciliacao de bases RPPS, contribuicao segurado e IRRF.

O ES-06 implementa exclusao de eventos por S-3000. O usuario com permissao `esocial.event.exclude` solicita a retratacao de um `public.esocial_event` aceito, informa justificativa minima de 30 caracteres e gera uma linha auditada em `esocial.s3000_request`. O builder `s3000.builder.ts` monta `evtExclusao` referenciando `nrRecEvt` do evento original e envia pelo hub ES-07. Ao receber aceite do S-3000, o worker marca a solicitacao como `ACCEPTED` e muda o evento original para `EXCLUIDO`.

O bloco RPPS inicia com S-2400. Quando `POST /v1/previdenciario/aposentadorias` concede uma aposentadoria em `hr.retirement_grant`, o `s2400.builder.ts` monta `evtCdBenefIn` a partir do cadastro atual de `hr.employee`, dependentes de `hr.employee_dependent`, endereco cadastral e CNPJ ativo do tenant em `hr.company`; a emissao passa pelo mesmo `ESocialEmitService.emit(...)`, valida contra `evtCdBenefIn.xsd` do bundle S-1.3 local e grava `public.esocial_event` com `source_entity_kind = 'hr.retirement_grant'`.

O S-2405 cobre alteracao cadastral posterior do beneficiario RPPS. Quando `POST /v1/previdenciario/recadastramentos/atos` registra um ato de recadastramento para beneficiario `RETIREE` com aposentadoria concedida, o `s2405.builder.ts` monta `evtCdBenefAlt` com CPF do beneficiario, data da alteracao posterior ao S-2400, nome, sexo, raca/cor, estado civil, incapacidade fisica/mental e endereco cadastral corrente. A emissao usa o hub `ESocialEmitService.emit(...)`, valida contra `evtCdBenefAlt.xsd` do bundle S-1.3 local e grava `public.esocial_event` com `source_entity_kind = 'hr.recertification_record'`.

O S-2410 cobre o cadastro de beneficio previdenciario concedido pelo ente publico. O `s2410.builder.ts` usa o XSD local S-1.3 `evtCdBenIn.xsd` e emite `evtCdBenIn` depois da concessao de aposentadoria em `hr.retirement_grant` ou da criacao de pensao em `hr.pension_grant`. A aposentadoria reutiliza CPF e matricula do servidor beneficiario; a pensao usa CPF do beneficiario, matricula do instituidor quando existente, tipo de beneficio e dados de pensao por morte. Ambos geram `nrBeneficio` deterministico a partir do ID da concessao para servir como chave reutilizavel por S-2416, S-2418, S-2420 e S-1207.

O S-2416 usa o XSD local S-1.3 `evtCdBenAlt.xsd`, identificado no bundle como "Cadastro de Beneficio - Entes Publicos - Alteracao". Na criacao de pensao por `POST /v1/previdenciario/pensoes`, o `s2416.builder.ts` reutiliza o `nrBeneficio` deterministico de S-2410, CPF do beneficiario, `tpBeneficio`, `tpPlanRP`, data de concessao e dados de pensao por morte para registrar o tipo de dependente do instituidor. O XSD local nao possui campo para CPF ou data de obito do instituidor nesse evento; esses valores ficam preservados no payload e no S-2410 quando disponiveis.

O S-2418 cobre a reativacao de beneficio previdenciario RPPS pelo XSD local S-1.3 `evtReativBen.xsd`. O `s2418.builder.ts` usa o mesmo `nrBeneficio` deterministico estabelecido no S-2410 para aposentadoria (`RET...`) e pensao (`PEN...`), monta `evtReativBen` com CPF do beneficiario, data efetiva de reativacao e data de inicio dos efeitos financeiros, e emite pelo hub `ESocialEmitService.emit(...)`. Para pensao, a emissao exige `hr.pension_grant.ceased_on` e valida que as datas de reativacao sejam posteriores a cessacao registrada; para aposentadoria, a emissao exige que `hr.retirement_grant.status` indique beneficio suspenso ou cessado porque o modelo atual ainda nao possui data propria de cessacao da aposentadoria.

O S-2420 cobre a cessacao de beneficio previdenciario RPPS com o XSD local S-1.3 `evtCdBenTerm.xsd`. No modelo atual, a emissao automatica fica limitada a `hr.pension_grant` quando a concessao ja possui `ceased_on`, reutilizando o mesmo `nrBeneficio` deterministico `PEN` gerado pelo S-2410, com competencia pela data de cessacao. Como o cadastro atual ainda nao possui campo especifico para o motivo eSocial da Tabela 26, a cessacao originada de `dataCessacao` usa `mtvTermino=05` (termino do prazo do beneficio) ate a modelagem explicita dos demais motivos regulatorios.

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
| S-1030 | `hr.job_position` + vinculo CBO em `hr.job_structure_reference_link`          | `s1030.builder.ts` |
| S-1040 | `hr.job_function`                                                             | `s1040.builder.ts` |
| S-1050 | `hr.shift`                                                                    | `s1050.builder.ts` |
| S-1070 | `hr.administrative_process`                                                   | `s1070.builder.ts` |
| S-1200 | `payroll.payroll_run` gerado + itens da folha                                 | `s1200.builder.ts` |
| S-1202 | `payroll.payroll_run` gerado + itens de servidores RPPS                       | `s1202.builder.ts` |
| S-1207 | `payroll.payroll_run` gerado + beneficio RPPS ativo de S-2410                 | `s1207.builder.ts` |
| S-1210 | `payroll.payment_remittance_file` pago + detalhes confirmados                 | `s1210.builder.ts` |
| S-1298 | `esocial.s1299_emission_state` aceito para reabertura da competencia          | `s1298.builder.ts` |
| S-1299 | `esocial.s1299_emission_state` + guarda de periodicos da competencia          | `s1299.builder.ts` |
| S-2200 | `hr.employee` + `hr.employment_contract` + dependentes                        | `s2200.builder.ts` |
| S-2205 | `esocial.s2205_pending_alteration` + cadastro atual                           | `s2205.builder.ts` |
| S-2206 | `hr.employee` + `hr.employment_link` + contrato/cargo/local atuais            | `s2206.builder.ts` |
| S-2210 | `esocial.s2210_pending` + `saude.cat_emission`/`saude.work_accident`          | `s2210.builder.ts` |
| S-2220 | `esocial.s2220_pending` + `saude.aso_record`/`saude.aso_exam_item`            | `s2220.builder.ts` |
| S-2230 | `esocial.s2230_pending` + `hr.leave_record`/`hr.vacation_record`              | `s2230.builder.ts` |
| S-2240 | `esocial.s2240_pending` + `saude.environmental_exposure`                      | `s2240.builder.ts` |
| S-2299 | `esocial.s2299_pending` + `hr.employment_link` + `payroll.payroll_run` gerado | `s2299.builder.ts` |
| S-2400 | `hr.retirement_grant` + cadastro/dependentes do beneficiario RPPS             | `s2400.builder.ts` |
| S-2405 | `hr.recertification_record` + cadastro atual do beneficiario RPPS             | `s2405.builder.ts` |
| S-2410 | `hr.retirement_grant` ou `hr.pension_grant` + beneficio previdenciario RPPS   | `s2410.builder.ts` |
| S-2416 | `hr.pension_grant` + dados de pensao por morte e instituidor                  | `s2416.builder.ts` |
| S-2418 | `hr.retirement_grant` ou `hr.pension_grant` + reativacao de beneficio RPPS    | `s2418.builder.ts` |
| S-2420 | `hr.pension_grant.ceased_on` + beneficio previdenciario RPPS cessado          | `s2420.builder.ts` |
| S-3000 | `esocial.s3000_request` + `public.esocial_event` alvo                         | `s3000.builder.ts` |

## Operacao

O painel administrativo fica em `frontend/src/app/features/esocial/tabelas/` e permite consultar o ultimo hash emitido por evento e acionar a reemissao de delta. As rotas administrativas ficam em `/api/v1/esocial/tabelas-iniciais` e exigem `esocial.event.read` para consulta e `esocial.event.write` para emissao.

O painel de trabalhadores fica em `frontend/src/app/features/esocial/trabalhadores/` e lista matricula, servidor, recibo S-2200 e pendencias S-2205. As rotas `/api/v1/esocial/trabalhadores` usam `esocial.event.read`; as emissoes manuais de S-2200 e S-2205 usam `esocial.event.write`.

As filas de CAT, monitoramento de saude, agentes nocivos, afastamentos e desligamentos ficam em `/api/v1/esocial/eventos-trabalhador` e aparecem nas abas "CAT (S-2210)", "Monitoramento Saúde (S-2220)", "Agentes Nocivos (S-2240)", "Afastamentos" e "Desligamentos" do mesmo painel administrativo. A emissao manual de S-2210 usa `POST /api/v1/esocial/eventos-trabalhador/s2210/:catEmissionId/emitir`. A retentativa manual de S-2220 usa `POST /api/v1/esocial/eventos-trabalhador/s2220/:asoRecordId/retry` e mantem `last_error` quando a validacao XSD rejeita o XML. A emissao manual de S-2240 usa `POST /api/v1/esocial/eventos-trabalhador/s2240/:environmentalExposureId/emitir` com `triggerEvent` `START`, `END` ou `CHANGE`. A emissao manual de S-2299 bloqueia explicitamente se a folha de rescisao CALC-12 ainda nao estiver `GENERATED`.

O painel de folha periodica fica em `frontend/src/app/features/esocial/folha-periodica/` e consulta `/api/v1/esocial/folha-periodica?year=AAAA&month=MM`. Ele exibe trabalhadores do run, status S-1200, status S-1210, recibos e a acao "Reemitir trabalhador". A emissao manual de S-1200 usa `POST /api/v1/esocial/folha-periodica/runs/:payrollRunId/s1200/emitir`; S-1202 usa `POST /api/v1/esocial/folha-periodica/runs/:payrollRunId/s1202/emitir`; S-1210 usa `POST /api/v1/esocial/folha-periodica/payments/:paymentBatchId/s1210/emitir`. Consultas exigem `esocial.event.read`; emissoes exigem `esocial.event.write`.

O painel de fechamento fica em `frontend/src/app/features/esocial/fechamento/` e consulta `/api/v1/esocial/fechamento?year=AAAA&month=MM`. Ele mostra pendencias de S-1200/S-1202/S-1210, habilita "Fechar competencia" somente quando a guarda esta limpa, e lista totalizadores S-5xxx recebidos. A emissao usa `POST /api/v1/esocial/fechamento/fechar`; a ingestao tecnica de retorno usa `POST /api/v1/esocial/fechamento/totalizadores`. A reabertura S-1298 usa `POST /api/v1/esocial/fechamento/reabrir` com ano e mes da competencia ja aceita por S-1299.

O painel de exclusao fica em `frontend/src/app/features/esocial/exclusao/`, lista eventos aceitos com recibo e acompanha `esocial.s3000_request`. A rota `POST /api/v1/esocial/events/:id/exclude` exige `esocial.event.exclude` e rejeita justificativas curtas. Eventos periodicos (`S-1200`, `S-1202`, `S-1207`, `S-1210`, `S-1280`, `S-1300`) sao bloqueados se existir `esocial.s1299_emission_state.status = ACCEPTED` para a mesma competencia; o bloqueio grava `block_reason = periodic_competence_closed_by_s1299` e nao chama o hub de emissao.

## Auditoria e RLS

`public.esocial_event`, `esocial.s1xxx_dispatch_state`, `esocial.s1200_emission_state`, `esocial.s1202_emission_state`, `esocial.s1210_emission_state`, `esocial.s2200_emission_state`, `esocial.s2205_pending_alteration`, `esocial.s2210_pending`, `esocial.s2220_pending`, `esocial.s2230_pending`, `esocial.s2240_pending`, `esocial.s2299_pending`, `esocial.s1299_emission_state`, `esocial.esocial_totalizer` e `esocial.s3000_request` usam RLS forçado por tenant com `sgp_tenant_matches(tenant_id)`. Leitura usa `esocial.event.read`; emissoes usam `esocial.event.write`; retratacoes S-3000 usam `esocial.event.exclude`. A emissao grava `public.esocial_event` e `public.audit_event`; a atualizacao de estado tambem usa `sgp_append_audit_event(...)` por trigger ou servico, incluindo `requested_by_user_id` e `justification` da retratacao.
