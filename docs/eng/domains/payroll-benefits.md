# Payroll And Benefits Domain Authority

Authored domain authority for folia-first payroll, benefits, FGTS, CNAB, payslip, consignments, and payment policies.

## Merged Artifact Index

- Folia Payroll Engine Reconciliation
- Politica de FGTS para Vinculos CLT
- Aviso previo CLT
- Base anual PIS/PASEP
- Comprovante de Rendimentos Anual
- SIFGE FGTS — Deposito Caixa
- Validação de Dados Bancários
- GPS residual CLT
- CNAB 240 Remessa Bancaria
- Matriz de Ocorrencias CNAB 240
- Pensão Alimentícia
- Margem consignavel e averbacao de consignados
- Portabilidade de consignados
- ADR 92 — Contracheque oficial PDF/A-1b

## Regulatory References Cross-Reference

This table maps payroll and benefits obligation references to the current SGP
implementation or retained decision evidence. Cached references under
`docs/refs/**` are evidence anchors; behavior authority remains in this file and
the executable code/tests.

| Reference                                          | Obligation cluster                             | Implementation / evidence path:line                                               | Current posture                                                  |
| -------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `docs/refs/legal/clt-rescisao-aviso-fgts.md`       | CLT termination, proportional notice, and FGTS | backend/src/folha-pagamento/rescisao/rescisao.service.ts:1                        | Implemented termination, notice, and FGTS calculation surfaces.  |
| `docs/refs/legal/consignacoes-margem-lei-14509.md` | Consignment margin caps                        | backend/src/folha-pagamento/operations/consignment/margin-calculator.service.ts:1 | Implemented margin calculator golden coverage.                   |
| `docs/refs/legal/decimo-terceiro-ferias.md`        | 13th salary, vacation payroll, and allowances  | backend/src/folha-pagamento/payroll/decimo-terceiro.service.ts:1                  | Implemented payroll calculation and vacation golden surfaces.    |
| `docs/refs/legal/ec-103-previdencia.md`            | EC 103/2019 transition rules                   | backend/src/previdenciario/previdenciario.service.ts:1                            | Implemented pension and retirement-rule service surface.         |
| `docs/refs/legal/pensao-alimenticia.md`            | Alimony deductions                             | backend/src/folha-pagamento/operations/alimony/alimony.service.ts:1               | Implemented employee alimony management and payroll integration. |
| `docs/refs/legal/previdenciario-irrf.md`           | Previdenciario and IRRF calculation facts      | backend/src/previdenciario/declaracao/declaracao.service.ts:1                     | Implemented declaration/calculation surfaces.                    |
| `docs/refs/legal/rpps-vs-rgps.md`                  | RPPS/RGPS regime distinction                   | backend/src/previdenciario/regras/regras.service.ts:1                             | Implemented pension-rule service surface.                        |
| `docs/refs/legal/teto-acumulacao.md`               | Remuneration ceiling and lawful accumulation   | backend/src/rh/employees/accumulation.service.ts:1                                | Implemented CF art. 37 XVI compatibility matrix.                 |

## Folia Payroll Engine Reconciliation

## Folia Payroll Engine Reconciliation

**Status:** active implementation guideline for v0.0.1.

### Purpose

Define how folia payroll engine improvements are applied in SGP runtime implementation.

### Precedence

- Folia engine behavior is authoritative for payroll formula/engine internals.
- `docs/eng` remains authoritative for product scope and architecture boundaries.

### Engine capabilities to preserve from folia

- Formula compilation pipeline with input validation and token safety checks.
- Dependency extraction and circular dependency protection.
- Deterministic evaluation strategy with cache-aware execution.
- Runtime diagnostics suitable for audit and reconciliation.

### Reverse evidence folded in on 2026-04-26

The legacy formula artifacts under `docs/leg/rev-eng/modules/folha/calculo/` are evidence inputs for the SGP engine port. They do not override folia precedence, but they define the legacy behavior that the engine must reconcile during shadow mode:

- `formulas-lista-completa.csv`: raw legacy formula inventory by restored database.
- `formulas-dependencias.csv` and `formulas-grafo.csv`: dependency graph evidence used to validate extraction and cycle detection.
- `formulas-dependencias-analise.md`: semantic reading of relevant chains such as salary, base remuneration, INSS, transport allowance, and qualification additions.
- `formulas-ordem-calculo.md`: probable topological execution order; the SGP runtime must record the actual evaluated order per calculation.
- `verbas-formulas-atributos.md`: observed formula tokens, persisted attributes, aliquot usage, and differences between `rhlinkcon` and `rhlinkcon_motor`.

Any high-impact difference between the folia engine behavior and these legacy outputs must be handled through the conflict rule below.

### Port target inside SGP

- Runtime SQL implementation:
  - `database/sql/10-06-payroll_calc-ddl.sql`
  - `database/sql/10-07-payroll-ddl.sql`
  - `database/sql/40-payroll_calc-functions.sql`
  - `database/sql/70-payroll_calc-final.sql`
- Money/rounding boundary: `docs/eng/platform.md`

### Runtime Objects

- Schema: `payroll_calc`.
- Cache table: `payroll_calc.formula_cache`, storing
  `(tenant_id, earning_deduction_id, version, compiled_sql, compiled_at)`.
- Compile trigger: `trg_compile_formula_expression` on
  `payroll.payroll_earning_deduction`.
- Evaluator function:
  `payroll_calc.evaluate_earning_deduction(uuid, uuid, int, int)`.

`payroll.payroll_earning_deduction` carries the formula metadata fields:

- `formula_alias`
- `formula_function_name`
- `formula_expression`
- `formula_function_ddl`
- `formula_dependencies`
- `formula_version`
- `formula_ready`
- `formula_error`

Built-in SQL helper functions:

- `payroll_calc.base_salary(employee_id)`
- `payroll_calc.workload_hours(employee_id)`
- `payroll_calc.dependent_count(employee_id)`
- `payroll_calc.service_years(employee_id, competence_date)`
- `payroll_calc.days_in_month(year, month)`
- `payroll_calc.absence_days(employee_id, month, year)`
- `payroll_calc.worked_days(employee_id, month, year)`
- `payroll_calc.proportional_ratio(employee_id, month, year)`

## Repasse Fundo RH

Repasse Fundo RH is an SGP-owned report surface. The accepted default basis is
an approved, paid, or closed payroll run. Eligible rubricas are those whose
`payroll.payroll_earning_deduction.incidences` include `fund_rh` or
`repasse_fundo_rh`, plus the explicit `FUNDO_RH` code. `fund_source` defaults
to `TESOURO` and `fund_rh_rate` defaults to `1` when omitted.

The report generator emits deterministic PDF, CSV, and JSON artifacts with
rubrica, source, employee count, basis total, transfer total, and reconciliation
metadata. It must not create accounting postings by itself; posting or SIAFIC
submission remains a separate accepted integration flow.

### FOL-01 contract with CALC-01

FOL-01 is the official administrative interface for rubricas consumed by CALC-01. The contract is:

- Rubricas live in `payroll.payroll_earning_deduction`, scoped by `tenant_id`, with unique `(tenant_id, code)`, type in `PayrollEntryKind`, incidence flags in `incidences jsonb`, validity dates, eSocial/offical rubric codes, and the `formula_*` compilation columns.
- Formula attributes live in `payroll.formula_attribute` and are linked to one rubrica through `earning_deduction_id`; supported value types are `decimal`, `int`, `bool`, `date`, and `text`.
- Cargo-based eligibility lives in `payroll.job_position_earning`, with validity dates and `application_condition`; CALC-01 can use this bridge to select rubricas for the servidor's current cargo without inventing a parallel mapping.
- Formula validation uses `payroll_calc.compile_formula(...)`; persisted formula changes still recompile through the `trg_compile_formula_expression` trigger and expose readiness through `formula_ready` / `formula_error`.
- Preview and later calculation paths call `payroll_calc.evaluate_earning_deduction(...)`. The admin preview removes transient cache rows after the call, while full calculation may keep `payroll_calc.formula_cache` as the engine cache.

### Money boundary

Folia-first formula evaluation must preserve decimal precision through intermediate calculation and apply the SGP money policy only at the rubrica boundary. SQL `payroll_calc.evaluate_earning_deduction(...)` and TypeScript payroll paths must reconcile to `numeric(14,2)` / `Decimal(14,2)` using half-away-from-zero rounding.

### Conflict handling

- If folia and specs disagree on payroll engine internals, folia behavior is default.
- If the conflict changes external business outcomes or compliance-sensitive outputs, escalate to owner decision before merge.

### Non-goals

- No compatibility shim layer for legacy naming.
- No runtime `sgp_legacy` compatibility schema.

## Politica de FGTS para Vinculos CLT

## Politica de FGTS para Vinculos CLT

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** implemented
**Escopo:** Folha de Pagamento / CLT-01 | **Depende de:** CALC-11, CALC-12, XCUT-08

### Fundamento

O SGP calcula FGTS somente para vinculos celetistas (`contract_type` CLT/celetista). A base operacional segue a Lei 8.036/1990: recolhimento mensal de 8% sobre remuneracao e multa rescisoria de 40% sobre o saldo de depositos quando a dispensa ocorre sem justa causa. A multa adicional de 10% da LC 110/2001 nao e calculada, pois foi extinta para fatos geradores a partir de 2020 pela Lei 13.932/2019.

### Regras Implementadas

- A conta de FGTS fica em `payment.fgts_account`, vinculada a tenant, servidor e vinculo funcional.
- Cada competencia gera movimentos em `payment.fgts_movement` com valores `numeric(14,2)` e aliquotas `numeric(18,6)`.
- O fechamento da folha mensal (CALC-11) chama `payment.compute_fgts_monthly(payroll_run_id)` antes de fechar a competencia e grava `DEPOSIT_8` idempotente por folha.
- A rescisao (CALC-12) chama `payment.compute_fgts_termination_fine(payroll_run_id, employment_link_id, cause)` para CLT sem justa causa e grava `RESCISION_FINE_40`.
- O aviso previo indenizado (CLT-02) fica em `payment.prior_notice`; quando `kind = INDEMNIFIED`, a rubrica `RESC_AVISO_PREVIO` expoe a base e os dias proporcionais para compor a base de FGTS conforme Sumula 305/TST.
- O saldo usado para multa vem de `payment.v_fgts_balance`, somando depositos da conta, e nao de uma estimativa por salario.
- Pedido de demissao, dispensa com justa causa e vinculo estatutario nao geram multa de 40%.

### Integracao

Os movimentos alimentam bases para S-1200/S-2299/S-5013 e para relatorios operacionais. A geracao dos instrumentos de recolhimento fica em `folha-pagamento/operations/sifge`: a GRF mensal consolida movimentos `DEPOSIT_8`/`DEPOSIT_AVISO` da competencia, a GRRF rescisoria consome o movimento `RESCISION_FINE_40` ja apurado por CLT-01/CALC-12, e o adapter Caixa produz a estrutura SIFGE 4.0 com DAE e assinatura quando exigida pelo layout.

### Controles

As tabelas sao tenant-scoped, com RLS forçada por `sgp_tenant_matches(tenant_id)` e permissoes `payroll.fgts.read` / `payroll.fgts.write`. Toda mutacao passa por trigger de auditoria que chama `public.sgp_append_audit_event(...)`. Calculos monetarios ficam no banco, usando `round(..., 2)` em `numeric` e sem `Math.round` em codigo TypeScript.

## Aviso previo CLT

## Aviso previo CLT

### Escopo

O aviso previo para vinculos CLT fica registrado em `payment.prior_notice` e pode ser `WORKED`, `INDEMNIFIED` ou `NONE`. A tabela e tenant-scoped, protegida por RLS com `sgp_tenant_matches(tenant_id)` e permissoes `payroll.run.read` / `payroll.run.write`, e toda mutacao dispara auditoria por `public.sgp_append_audit_event(...)`.

### Proporcionalidade

`payment.compute_prior_notice_days(employment_link_id, termination_date)` aplica a Lei 12.506/2011: 30 dias base, mais 3 dias por ano completo de servico, limitado a 90 dias. Vinculos estatutarios ou nao CLT nao geram registro de aviso previo.

### Reflexos

Para aviso `INDEMNIFIED` em desligamento CLT sem justa causa, `payment.compute_prior_notice(...)` grava a data projetada e a base salarial do aviso. `payroll_calc.compute_rescisao(...)` usa essa data projetada para os avos de 13o proporcional e ferias proporcionais, e emite a rubrica `RESC_AVISO_PREVIO` com quantidade igual aos dias proporcionais.

Em pedido de demissao sem cumprimento, o aviso indenizado e emitido como desconto em `RESC_AVISO_PREVIO_DESCONTO`, sem projetar avos. Aviso `WORKED` registra a modalidade e modo de reducao (`TWO_HOURS_DAY`, `SEVEN_FINAL_DAYS` ou `NONE`), mas nao cria verba indenizada.

### Integracoes

CALC-12 le o aviso persistido antes de compor a rescisao. A base do aviso indenizado integra a composicao rescisoria e fica disponivel para CLT-01/FGTS e para totalizadores eSocial S-1200/S-2299 por meio das rubricas calculadas e da view `payroll.v_termination_with_notice`.

## Base anual PIS/PASEP

## Base anual PIS/PASEP

### Escopo

CLT-03 materializa a base anual cumulativa de PIS/PASEP por tenant, empregado e ano-base em `payment.pis_pasep_base_year`. A base serve para conferencia fiscal, verificacao de abono salarial e integracao operacional com eSocial S-1010/S-1200. O pagamento do abono e a geracao RAIS transicional permanecem fora do produto.

### Programa

O programa e derivado do regime juridico atual do vinculo em `hr.employment_link.contract_type`:

| Regime                                                              | Programa |
| ------------------------------------------------------------------- | -------- |
| `celetista` ou `clt`                                                | `PIS`    |
| demais regimes, incluindo `statutory`, `commissioned` e `temporary` | `PASEP`  |

### Recomposicao

`payment.recompute_pis_pasep_base(tenant_id, employee_id, year_base)` recompõe o ano inteiro a partir dos S-1200 publicados. A funcao soma, por competencia, os itens de folha do empregado cujo `payroll_run` possui `public.esocial_events` e evento `public.esocial_events` S-1200 nao excluido.

Rubricas com `incidences.codIncPisPasep` ou equivalentes `pisPasep`/`pis_pasep` controlam a inclusao. Valores `00`, `0`, `false`, `none` e `nao_base` excluem a rubrica; valores `11`, `12`, `base`, `monthly` e `mensal` incluem. Na ausencia de classificacao explicita, rubricas `EARNING` e `BASE` entram na base para manter a folha publicada conferivel ate a classificacao refinada no S-1010.

O resultado persistido contem `monthly_base` como mapa de meses `01` a `12`, `total_base numeric(14,2)` e `updated_at`. A soma dos meses deve ser sempre igual a `total_base`.

### Integracao eSocial

S-1010 passa a expor `codIncPisPasep` conforme a classificacao da rubrica, mantendo `00` para rubricas excluidas da base. A publicacao de S-1200 chama a recomposicao anual apos gravar `public.esocial_events`.

A aceitacao de S-3000 marca o evento alvo como `EXCLUIDO` e aciona recomposicao para o empregado/ano do S-1200 excluido. Como a funcao recompõe o ano completo, retroativos, reemissoes e reclassificacoes de rubrica ficam idempotentes: a linha anual e atualizada em vez de acumulada incrementalmente.

### Seguranca e auditoria

`payment.pis_pasep_base_year` tem RLS forçado com `sgp_tenant_matches(tenant_id)` e permissoes `payroll.payroll.read` / `payroll.payroll.write`. Toda mutacao dispara `public.sgp_append_audit_event(...)`; a view `payment.v_pis_pasep_year` usa `security_invoker` e preserva o mesmo predicado de tenant/permissao.

## Comprovante de Rendimentos Anual

## Comprovante de Rendimentos Anual

**Escopo:** FISC-03 — comprovante anual de rendimentos pagos e de Imposto sobre a Renda Retido na Fonte para servidores, com geração em lote no admin e download pelo Portal do Servidor.

**Truth banner:** The PDF/A runtime uses internal hash and
`%%SGP-PADES-SIGNATURE` evidence through `PadesAdapter`. This is not real
CMS/PKCS#7/PAdES signing; legal PAdES remains deferred in
`103-deferred-decision-ledger.md#deferred-decision-ledger`.

### Fundamento e Cobertura

O comprovante segue a IN RFB n.º 2.060/2021, art. 16 e Anexo I, para ano-calendário fechado. A fonte de dados é a folha do SGP já calculada: folha mensal completa, 13.º salário, férias pagas no ano e rescisão quando houver desligamento. Pagamentos a terceiros, PJ/autônomos e beneficiários no exterior continuam cobertos pela DIRF transicional de FISC-02.

### Totalizadores

`fiscal.recompute_yearly_income(tenant_id, employee_id, year_base)` consolida os itens ativos de `payroll.v_payroll_run_line_active` vinculados a `payroll.payroll_run` em status final (`GENERATED`, `APPROVED`, `PAID` ou `CLOSED`) e grava `fiscal.yearly_income_aggregate`.

| Campo               | Regra                                              |
| ------------------- | -------------------------------------------------- |
| `taxable_total`     | Soma de proventos tributáveis do ano-base.         |
| `thirteenth_salary` | Parcela tributável identificada como 13.º salário. |
| `vacation_total`    | Parcela tributável identificada como férias.       |
| `severance_total`   | Parcela tributável identificada como rescisão.     |
| `exempt_total`      | Proventos não tributáveis do ano-base.             |
| `inss_rpps_total`   | Descontos previdenciários oficiais/RPPS.           |
| `irrf_total`        | Descontos de IRRF.                                 |
| `dependents_count`  | Dependentes marcados para imposto de renda.        |

A geração do PDF valida que `taxable_total + exempt_total` coincide com o total anual S-1210 do mesmo CPF exposto pela view fiscal para o comprovante.

### Segurança

`fiscal.yearly_income_aggregate` é tenant-scoped, com RLS por `sgp_tenant_matches(tenant_id)`. Administração exige `fiscal.yearly_income.read` ou `fiscal.yearly_income.write`; o portal exige `portal.yearly_income.read` e `employee_id = sgp_current_employee_id()`. O arquivo persistido em `public.generated_report_file` usa `report_kind = YEARLY_INCOME_REPORT` e políticas específicas para impedir download cruzado entre empregados.

### Saída Oficial

O PDF é produzido por `backend/src/report-service/yearly-income/` com a mesma biblioteca real de XCUT-01 (`pdf-lib` via `PdfABuilderService`), metadados PDF/A-1b, armazenamento S3-compatible e hash SHA-256 em `public.generated_report_file.file_hash`. A chave lógica é `{tenant}/outputs/yearly-income/{ano_base}/{employee_id}.pdf`, com retenção de 10 anos.

## SIFGE FGTS — Deposito Caixa

## SIFGE FGTS — Deposito Caixa

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** implemented
**Escopo:** Folha de Pagamento / BANK-05 | **Depende de:** CLT-01, BANK-01, ES-04, ES-05, ES-07

### Fundamento

A Caixa Economica Federal e o banco operador do FGTS conforme Lei 8.036/1990, art. 7. A obrigacao mensal usa a aliquota de 8% do art. 15 para vinculos celetistas, enquanto a rescisao sem justa causa usa a multa ja apurada por CLT-01/CALC-12 sobre o saldo da conta vinculada. A trilha eSocial S-1200/S-5013 atende a obrigacao acessoria; este modulo gera o instrumento financeiro de recolhimento.

### Modelo Operacional

- `payment.fgts_remittance` registra cada remessa GRF mensal ou GRRF rescisoria, com status, competencia, totais, DAE, layout, adapter e hash do arquivo.
- `payment.fgts_grf` detalha a GRF por folha mensal, preservando quantidade de empregados, base, aliquota e valor por `payroll_run_id`.
- `payment.fgts_grrf` detalha a GRRF por vinculo rescindido, com data de desligamento, saldo-base, aliquota de multa, multa e valor de aviso previo indenizado quando houver.
- `payment.fgts_caixa_adapter` seleciona o adapter ativo por tenant. O padrao e `caixa-sifge-v4`; a troca para `caixa-sifge-mock` ocorre por configuracao de banco, sem alterar o orquestrador.

### Fluxo Mensal

`generateMonthlyGRF(tenantId, competence)` consolida somente movimentos `payment.fgts_movement` da competencia, com `kind IN ('DEPOSIT_8', 'DEPOSIT_AVISO')`, `source_event = 'MONTHLY'` e folha associada. Os totais da GRF batem com o totalizador da propria `payment.fgts_movement`; o modulo nao recalcula bases nem aliquotas em TypeScript.

### Fluxo Rescisorio

`generateTerminationGRRF(employmentLinkId, terminationId)` localiza o movimento `RESCISION_FINE_40` produzido pela rescisao, usa o valor de base e multa ja persistidos, acrescenta o aviso previo indenizado de `payment.prior_notice` quando aplicavel, e emite uma remessa `GRRF_TERMINATION` para a conta vinculada do trabalhador.

### Adapter Caixa

O contrato `CaixaSifgeAdapter` expoe `assemble(payload)`, `parse(buffer)`, `signIfRequired(buffer)`, `adapterKey`, `layoutVersion` e `requiresSignature`. O adapter `caixa-sifge-v4` serializa um envelope deterministico SIFGE 4.0, valida round-trip e aplica assinatura logica ICP-Brasil/ES-07 por digest SHA-256 quando o layout exige. O arquivo persistido referencia `sifge://fgts-remittances/<id>.sifge`, com SHA-256 gravado em `payment.fgts_remittance.file_hash`.

### Controles

As novas tabelas sao tenant-scoped e tem RLS forcada por `sgp_tenant_matches(tenant_id)` combinada com `sgp_has_any_permission('payroll.fgts.read','payroll.fgts.write','payment.remittance.write')`. Toda mutacao dispara trigger de auditoria com `public.sgp_append_audit_event(...)`. Colunas monetarias usam `numeric(14,2)`, aliquotas usam `numeric(18,6)`, e o codigo TypeScript do modulo nao usa `Math.round`.

## Validação de Dados Bancários

## Validação de Dados Bancários

BANK-03 define que contas para crédito de folha só ficam elegíveis quando a validação determinística retorna `VALID`. O cadastro usa o catálogo FEBRABAN em `hr.bank`, valida agência, conta e CPF do titular, e registra a mutação em `public.audit_event` e em `hr.employee_bank_account_history`.

### Bancos suportados

As regras iniciais cobrem BB `001`, Santander `033`, Banrisul `041`, Caixa `104`, Bradesco `237`, Itaú `341`, Sicredi `748` e Sicoob `756`. Cada regra declara comprimento de agência, comprimento de conta, necessidade de DV de agência e pesos de DV de conta. A implementação vive em `backend/src/folha-pagamento/operations/bank-account/`.

### Códigos de erro

- `BANK_NOT_SUPPORTED`: banco sem regra ativa no validador.
- `AGENCY_LENGTH_INVALID`: agência fora do tamanho esperado.
- `AGENCY_DIGIT_INVALID`: dígito verificador de agência inválido.
- `ACCOUNT_LENGTH_INVALID`: conta fora do tamanho esperado.
- `ACCOUNT_DIGIT_INVALID`: dígito verificador da conta inválido.
- `CPF_INVALID`: CPF do titular inválido.
- `HOLDER_CPF_NOT_EMPLOYEE`: titular próprio não confere com o CPF do servidor.
- `DEPENDENT_NOT_AUTHORIZED`: dependente não existe para o servidor ou não possui autorização documental para crédito.

### Elegibilidade CNAB

BANK-01 deve consumir somente contas em `hr.employee_bank_account` com `validation_status = 'VALID'`. Contas `PENDING` ou `REJECTED` não podem ser listadas como destino de remessa.

## GPS residual CLT

## GPS residual CLT

FISC-04 implementa a GPS residual como safety-net para recolhimentos ao RGPS que não estejam cobertos pelo fluxo regular DCTFWeb. A base normativa é a Lei 8.212/1991, a IN RFB 2.110/2022 e, para o TXT de transição, a IN RFB 925/2009. O caminho padrão de débitos previdenciários continua sendo FISC-01/DCTFWeb; GPS só pode ser invocada de forma explícita.

### Escopo restrito

A geração é permitida para competências retroativas anteriores à adesão eSocial, janelas transitórias de entes ainda em fase escalonada ou competências em malha fina que precisam de recolhimento isolado. Antes de gravar a remessa, `fiscal.assert_no_dctfweb_for_competence(tenant_id, competence)` bloqueia qualquer competência que já possua DCTFWeb `TRANSMITTED` ou `ACCEPTED`.

### Persistência e governança

O catálogo RFB fica em `fiscal.gps_payment_code` com códigos vigentes como `2100`, `2402`, `2003` e `2909`. As remessas ficam em `fiscal.gps_remittance`, protegidas por RLS com `sgp_tenant_matches(tenant_id)` e permissões `fiscal.gps.read` / `fiscal.gps.write`. Toda mutação de remessa dispara auditoria via `public.sgp_append_audit_event(...)`.

### Cálculo e arquivo

O backend `integrations-worker/gps` usa `pg.Pool` por meio de `DatabaseService`, lê totalizadores RGPS de folha, calcula juros e multa com `decimal.js` sem `Math.round`, e mantém um ponto de integração com `payroll_calc.evaluate_earning_deduction(...)` quando houver rubrica preparada para encargos de GPS. O TXT gerado usa registros de transição `GPS-IN925-2009`, com round-trip validado pelo serializer.

### Diferença para DCTFWeb

DCTFWeb consolida totalizadores eSocial aceitos e é o fluxo regular. GPS residual não transmite declaração, não substitui FISC-01 e não pode coexistir com DCTFWeb transmitida/aceita para a mesma competência. A tela administrativa exibe aviso operacional para verificação prévia contra recolhimento DCTFWeb.

## CNAB 240 Remessa Bancaria

## CNAB 240 Remessa Bancaria

### Escopo

O SGP gera remessa CNAB 240 para credito em conta de folha aprovada. A saida e um arquivo binario ASCII composto por registros fixos de 240 bytes, sem CRLF, com header de arquivo, header de lote, segmentos A/B por servidor, trailer de lote e trailer de arquivo.

### Bancos suportados

| Banco           | Codigo | Estrategia              |
| --------------- | -----: | ----------------------- |
| Banco do Brasil |    001 | `bb.strategy.ts`        |
| Caixa           |    104 | `caixa.strategy.ts`     |
| Itau            |    341 | `itau.strategy.ts`      |
| Bradesco        |    237 | `bradesco.strategy.ts`  |
| Santander       |    033 | `santander.strategy.ts` |

As estrategias isolam convenio, agencia cedente e modalidade. Campos contratuais reais de cada ente devem ser parametrizados antes da homologacao bancaria.

### Regras de emissao

- A folha (`payroll.payroll_run`) deve estar `APPROVED`.
- Somente contas `hr.employee_bank_account.validation_status = 'VALID'` entram na remessa.
- Valores sao calculados em decimal monetario e gravados como centavos nos campos numericos do CNAB.
- `payroll.payment_remittance_file` guarda banco, versao de layout, contagem, total, hash SHA-256 e data de geracao.
- `payroll.payment_remittance_detail` guarda a sequencia do segmento A por servidor para rastreio e retorno futuro.

### Mock Relay

`backend/src/integrations-worker/cnab240/adapters/queue-adapter.ts` envia a remessa CNAB 240 pelo contrato R4-95 `sgp.adapter.banking.request` e aguarda `sgp.adapter.banking.response`. O mock local `backend/src/external/mocks/banking-relay/` cobre BB, Caixa, Itau, Bradesco e Santander, reutiliza os fixtures de retorno existentes como templates determinísticos e devolve um retorno CNAB 240 sem acessar canais bancarios reais.

O adapter valida hash, banco, correlacao e retorno byte-stable antes de materializar o estado conceitual do lote de pagamento. Implementacoes com banco persistem esse estado em `payroll.payment_remittance_file` e, quando todas as linhas retornam aceitas, promovem a folha relacionada para `PAID`.

O `sgp-integrations-worker` usa esse adapter no job `FOLHA_CNAB_REMESSA`: depois de gerar e armazenar a remessa, publica o payload no mock relay bancario, processa o retorno CNAB 240 devolvido pela fila e deixa `payroll.payment_remittance_file.status` refletir o resultado conciliado. O job historico `FOLHA_CNAB_RETORNO` nao promove folha para `PAID` por relatorio sintetico; mutacao de estado de pagamento fica no processor de retorno CNAB 240.

### Campos posicionais principais

| Registro        | Posicoes | Conteudo                             |
| --------------- | -------- | ------------------------------------ |
| Header arquivo  | 001-003  | Codigo do banco                      |
| Header arquivo  | 004-007  | Lote `0000`                          |
| Header arquivo  | 008-008  | Tipo de registro `0`                 |
| Header lote     | 009-013  | Operacao/servico/forma de lancamento |
| Segmento A      | 009-013  | Sequencial no lote                   |
| Segmento A      | 014-014  | Segmento `A`                         |
| Segmento A      | 018-043  | Banco, agencia e conta favorecida    |
| Segmento A      | 044-073  | Nome do favorecido                   |
| Segmento A      | 094-101  | Data de pagamento                    |
| Segmento A      | 120-134  | Valor em centavos                    |
| Segmento B      | 014-014  | Segmento `B`                         |
| Segmento B      | 019-032  | CPF do favorecido                    |
| Trailer lote    | 018-023  | Quantidade de registros no lote      |
| Trailer lote    | 024-041  | Soma dos valores em centavos         |
| Trailer arquivo | 018-023  | Quantidade de lotes                  |
| Trailer arquivo | 024-029  | Quantidade total de registros        |

### Referencias

- FEBRABAN, Layout Padrao CNAB 240 posicoes V10.11.
- Caixa, Manual Operacional Pagamento de Salarios, Pagamento/Credito a Fornecedor e Autopagamento CNAB240.
- Santander, Pagamento a Fornecedores Layout CNAB 240.

## Matriz de Ocorrencias CNAB 240

## Matriz de Ocorrencias CNAB 240

Este documento registra a matriz operacional do BANK-02 para retorno CNAB 240. O parser le registros de 240 posicoes, considera segmentos A como linhas conciliaveis e usa `occurrence_code` para converter o retorno bancario em status interno canonico.

### Status Internos

| Status interno                | Uso                                                                      |
| ----------------------------- | ------------------------------------------------------------------------ |
| `ACCEPTED`                    | Credito aceito ou confirmado pelo banco.                                 |
| `REJECTED_INVALID_ACCOUNT`    | Conta, agencia, digito ou favorecido invalido.                           |
| `REJECTED_INSUFFICIENT_FUNDS` | Pagamento rejeitado por insuficiencia de saldo/limite operacional.       |
| `RETURNED_OTHER`              | Devolucao ou rejeicao sem causa deterministica tratavel automaticamente. |

### Codigos Por Banco

| Banco               | Codigo                       | Status interno                | Mensagem operacional                                      |
| ------------------- | ---------------------------- | ----------------------------- | --------------------------------------------------------- |
| 001 Banco do Brasil | `00`                         | `ACCEPTED`                    | Credito confirmado pelo banco.                            |
| 001 Banco do Brasil | `AA`                         | `ACCEPTED`                    | Arquivo aceito pelo Banco do Brasil.                      |
| 001 Banco do Brasil | `BD`                         | `REJECTED_INVALID_ACCOUNT`    | Conta do favorecido invalida.                             |
| 001 Banco do Brasil | `BE`                         | `REJECTED_INVALID_ACCOUNT`    | Agencia ou conta inexistente.                             |
| 001 Banco do Brasil | `BI`                         | `REJECTED_INSUFFICIENT_FUNDS` | Saldo insuficiente para efetivar o pagamento.             |
| 001 Banco do Brasil | `RJ`                         | `RETURNED_OTHER`              | Pagamento devolvido ou rejeitado por ocorrencia bancaria. |
| 033 Santander       | `00`, `BD`, `BE`, `BI`, `RJ` | Conforme matriz comum         | Matriz comum FEBRABAN usada ate homologacao por carteira. |
| 104 Caixa           | `01`                         | `ACCEPTED`                    | Credito confirmado pela Caixa.                            |
| 104 Caixa           | `03`                         | `REJECTED_INVALID_ACCOUNT`    | Conta invalida na Caixa.                                  |
| 104 Caixa           | `BD`, `BE`, `BI`, `RJ`       | Conforme matriz comum         | Complemento comum para retornos padronizados.             |
| 237 Bradesco        | `00`, `BD`, `BE`, `BI`, `RJ` | Conforme matriz comum         | Matriz comum FEBRABAN usada ate homologacao por carteira. |
| 341 Itau            | `00`, `BD`, `BE`, `BI`, `RJ` | Conforme matriz comum         | Matriz comum FEBRABAN usada ate homologacao por carteira. |

### Regras De Conciliacao

- O retorno deve declarar o hash da remessa original; divergencia bloqueia o processamento antes de atualizar itens de folha.
- Cada linha deve casar `sequence`, `employee_id` e `amount` com `payroll.payment_remittance_detail`.
- Linhas aceitas gravam `employee_payroll_item.payment_status = 'PROCESSED'`; rejeicoes cadastrais ou financeiras gravam `REJECTED`; devolucoes gerais gravam `RETURNED`.
- Cada linha processada gera detalhe em `payroll.payment_return_detail` e auditoria via `public.sgp_append_audit_event(...)`.

## Pensão Alimentícia

## Pensão Alimentícia

Este módulo registra ordens judiciais de pensão alimentícia em `hr.employee_alimony`, com múltiplos beneficiários por servidor, dados do juízo, beneficiário, conta judicial, base de cálculo, vigência, prioridade e status. A ordem vigente pode reter percentual sobre base bruta, líquida ou base específica definida na sentença, ou valor fixo mensal.

### Base Legal

- Lei 5.478/1968: disciplina a ação de alimentos e a retenção em folha quando determinada judicialmente.
- Código Civil, arts. 1.694 a 1.710: define obrigação alimentar, proporcionalidade e revisão.
- Lei 8.213/1991, art. 115: admite desconto em benefício/folha quando autorizado por lei ou decisão judicial.

### Fluxo Operacional

1. RH cadastra a ordem em `/api/v1/employees/:id/alimonies` com permissão `hr.alimony.write`.
2. A mutação grava auditoria por `sgp_append_audit_event(...)`; alterações e exclusões preservam a versão anterior em `hr.employee_alimony_history`.
3. A folha mensal executa `folha-pagamento/operations/alimony/AlimonyDeductionService` após os vencimentos base e antes dos consignados.
4. O desconto é emitido como rubrica `ALIMONY_DEDUCTION`, chamando `payroll_calc.evaluate_earning_deduction(...)` e usando `Decimal(14,2)` para valores e `Decimal(18,6)` para percentuais.
5. A remessa CNAB 240 acrescenta uma linha Segmento A por beneficiário ativo, com `purpose_code` de crédito alimentício e dados da conta judicial indicada na sentença.

### Regras de Desconto

- `ACTIVE`: entra na próxima folha se a competência estiver dentro de `valid_from` e `valid_to`.
- `SUSPENDED`: interrompe desconto e repasse a partir da próxima execução.
- `TERMINATED`: mantém histórico, mas não gera novas retenções.
- `GROSS`: calcula o percentual sobre vencimentos brutos.
- `NET`: calcula o percentual sobre o líquido parcial antes da própria pensão.
- `BASE_SPECIFIC`: calcula sobre rubricas explicitadas em `base_specific_codes`.
- Valor fixo e percentual são mutuamente exclusivos.

### Governança

`hr.employee_alimony` e `hr.employee_alimony_history` usam RLS por tenant com `sgp_tenant_matches(tenant_id)` e permissões `hr.alimony.read` / `hr.alimony.write`. Não há schema de compatibilidade para v0.0.1; o cadastro antigo foi estendido in-place como modelo canônico.

## Margem consignavel e averbacao de consignados

## Margem consignavel e averbacao de consignados

### Escopo

O modulo `folha-pagamento/operations/consignment` controla consignantes, averba contratos de emprestimo consignado por servidor e calcula a margem disponivel por competencia. A modelagem fisica de CONS-01 fica no schema `payment`, com `payment.consignment_entity` para bancos, cooperativas, sindicatos e associacoes conveniadas, e `payment.consignment_loan` para contratos averbados.

### Base legal

A regra padrao segue a Lei 14.509/2022: margem total de 45% sobre a base liquida, segregada em 35% para emprestimos consignados, 5% exclusivo para cartao de credito consignado/saque e 5% exclusivo para cartao consignado de beneficio/saque. O Decreto 8.690/2016, o Decreto 11.150/2022 e a Lei 8.112/1990 art. 45 orientam a ordem de descontos e o respeito ao minimo disponivel.

### Parametrizacao

Os percentuais sao configurados por tenant em `public.system_parameter`:

- `consignment.margin.general_pct`: percentual para consignados gerais, padrao `0.35`.
- `consignment.margin.credit_card_pct`: percentual exclusivo para cartao de credito consignado/saque, padrao `0.05`.
- `consignment.margin.benefit_card_pct`: percentual exclusivo para cartao consignado de beneficio/saque, padrao `0.05`.

Entes com norma local podem alterar os parametros sem mudanca de codigo. As colunas monetarias usam `numeric(14,2)` e taxas usam `numeric(18,6)`.

### Formula

Para cada servidor e competencia:

`net_base = liquido_after_pension - other_legal_deductions`

Na implementacao atual, `net_base` e lido do registro financeiro liquido da folha mensal depois dos descontos legais ja calculados. O calculador aplica:

- `available_general = max(round(net_base * general_pct, 2) - used_general, 0)`
- `available_credit_card = max(round(net_base * credit_card_pct, 2) - used_credit_card, 0)`
- `available_benefit_card = max(round(net_base * benefit_card_pct, 2) - used_benefit_card, 0)`

`used_general` soma contratos ativos `PAYROLL_LOAN`; `used_credit_card` soma contratos ativos `CARD`; `used_benefit_card` soma contratos ativos `OTHER`, que nesta versao representa o bucket de cartao consignado de beneficio sem introduzir novo enum fisico. A criacao de averbacao recusa valor de parcela maior que a margem disponivel do respectivo grupo com resposta HTTP 422.

### Folha mensal

Na cadeia CALC-11, consignados entram depois das bases e dos descontos legais/pensao. Cada contrato ativo gera uma rubrica de desconto `CONSIGNMENT_LOAN_DEDUCTION`, com chamada obrigatoria a `payroll_calc.evaluate_earning_deduction(...)` no contorno da rubrica e valor de parcela do contrato como referencia. Contratos suspensos, terminados, transferidos ou fora da vigencia nao entram na competencia.

### Seguranca e auditoria

`payment.consignment_entity` e `payment.consignment_loan` usam RLS forçado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e permissao `payment.consignment.read` ou `payment.consignment.write`. Mutacoes disparam `sgp_append_audit_event(...)` por trigger e as rotas mutantes tambem registram evento de aplicacao.

## Portabilidade de consignados

## Portabilidade de consignados

CONS-02 implementa a importacao de portabilidade de contratos consignados a partir de arquivos enviados pelo consignante de destino. O arquivo recebido cria um registro em `payment.consignment_portability_file` com hash SHA-256, consignante origem, consignante destino e status operacional. Cada linha validada fica em `payment.consignment_portability_detail`, preservando CPF, contrato antigo, contrato novo, saldo portado, nova parcela, nova taxa e total de parcelas.

### Layout canonico

O layout inicial e `CANONICAL_CSV`, em UTF-8, separado por ponto e virgula, com cabecalho obrigatorio:

```text
employee_cpf;source_contract_number;target_contract_number;transferred_balance;new_monthly_amount;new_rate;new_installments_total
12345678901;OLD-001;NEW-001;1500.00;120.10;1.450000;24
```

CPF e normalizado para onze digitos. Valores monetarios sao `numeric(14,2)` e taxas sao `numeric(18,6)`. O parser rejeita linhas com CPF invalido, contrato ausente, valores negativos ou quantidade de parcelas menor que um.

### Adapters

| Adapter         | Entrada                                                                                         | Uso                                             |
| --------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| `CANONICAL_CSV` | CSV interno separado por `;`                                                                    | Base contratual comum entre consignantes        |
| `BANK_X`        | Registro posicional com CPF, contrato origem, contrato destino, saldo, parcela, taxa e parcelas | Exemplo inicial de arquivo fixo por consignante |
| `BANK_Y`        | Arquivo delimitado por `                                                                        | ` com cabecalho equivalente ao canonico         | Exemplo inicial de arquivo delimitado por consignante |

Novos consignantes devem adicionar adapter isolado em `backend/src/integrations-worker/consignment-portability/adapters/`, mantendo a saida no contrato canonico.

### Processamento

`POST /api/v1/payment/consignment-portability` recebe o conteudo textual, layout e ids dos consignantes. `POST /api/v1/payment/consignment-portability/:id/process` processa ou reprocessa o arquivo. Para cada detalhe, o backend busca `payment.consignment_loan` ativo por tenant, CPF do servidor, numero do contrato antigo e consignante origem. Linha conciliada marca o contrato antigo como `TRANSFERRED`, grava `transferred_to_loan_id`, cria a nova averbação no consignante destino com `transferred_from_loan_id` e registra detalhe `MATCHED`. Linha sem contrato visivel fica `UNMATCHED`, sem alterar a averbação existente, e permanece disponivel para reprocesso apos correcao.

Todas as tabelas sao tenant-scoped com RLS forcado por `sgp_tenant_matches(tenant_id)` e permissao `payment.consignment.read` ou `payment.consignment.write`; mutacoes exigem `payment.consignment.write`. O processamento chama `public.sgp_append_audit_event(...)` por arquivo e por linha processada, preservando trilha imutavel file-by-file e line-by-line.

## CF art. 37 XVI accumulation matrix

R4-17 materializa a matriz operacional de acumulacao licita em
`database/seed/cf-37-xvi-compatibility.json` e no servico
`backend/src/rh/employees/accumulation.service.ts`. A decisao de v0.0.1 cobre
somente as hipoteses explicitamente usadas pelo prompt regulatorio: dois cargos
de professor, professor com cargo tecnico-cientifico e dois cargos privativos
de profissionais de saude. Todas exigem compatibilidade de horarios.

Comissionados e demais pares fora da matriz sao recusados com o erro de dominio
`CF37_XVI_ACCUMULATION_NOT_ALLOWED`. Casos de borda nao cobertos pelo extrato
regulatorio local devem ser registrados como decisao de dono antes de ampliar a
matriz.

## Folha idempotency adoption audit

R4-21 fecha a cobertura de idempotencia como gate auditavel em
`scripts/lib/audit/idempotency-coverage.mjs`. O script exige evidencia de
reprocessamento idempotente para folha mensal, 13 salario, ferias, rescisao,
importadores manual/servidor/pensionista, folha complementar e reintegracao
retroativa.

O resultado esperado para a rodada e 100% de cobertura e lista de excecoes
vazia. Novas superficies mutantes de folha devem adicionar chave deterministica,
`ON CONFLICT (idempotency_key)` ou uso do helper
`isActivePayrollItemIdempotencyConflict(...)`, alem de teste focado, antes de
serem aceitas.

## ADR 92 — Contracheque oficial PDF/A-1b

## ADR 92 — Contracheque oficial PDF/A-1b

**Status:** implemented
**Data:** 2026-05-02

**Truth banner:** The current `PadesAdapter` appends an internal
tamper-evidence block and records signature metadata. It is not a real
CMS/PKCS#7/PAdES signer and must not be claimed as legally valid ICP-Brasil
PAdES until `103-deferred-decision-ledger.md#deferred-decision-ledger` is closed
for `PADES_REAL_SIGNATURE`.

### Decisão

O contracheque oficial passa a ser gerado em `backend/src/report-service/payslip/` com `pdf-lib`. A biblioteca foi escolhida para este slice porque evita o footprint operacional de navegador headless, tem licença MIT, roda no runtime NestJS existente e produz um PDF binário real com metadados estáveis suficientes para a validação PDF/A-1b do pipeline interno.

### Consequências

- `puppeteer` permanece fora do runtime público deste slice.
- O hash SHA-256 do PDF é persistido em `public.generated_report_file.file_hash`.
- `public.generated_report_file` registra `report_kind = PAYSLIP`, `pdf_a_compliance = PDF_A_1B`, `signature_kind`, competência, servidor, folha e retenção.
- O PDF/A renderizado recebe o bloco interno de evidência do `PadesAdapter` antes do cálculo do hash e da persistência do arquivo gerado; o registro preserva `signature_kind` e `signed_at` para auditoria interna.
- A validação automatizada do slice verifica cabeçalho binário `%PDF-`, metadados, fontes, bloco `%%SGP-PADES-SIGNATURE`, golden PDF byte-estável e persistência do hash; validações externas veraPDF e PAdES real dependem dos gates de release quando disponíveis no ambiente.

## Convencoes de fixtures XLSX dos importadores de folha

**Status:** implemented
**Data:** 2026-05-04

F-FOL-007, F-FOL-008 e F-FOL-009 usam fixtures XLSX byte-estaveis em
`tests/backend/golden/*-import-v01/` para fixar o contrato estrutural dos
importadores de folha. Cada fixture representa uma planilha pequena, ficticia e
deterministica, sem dados de producao, com uma linha aceita e cabecalho
normalizado pelo parser atual de `backend/src/folha-pagamento/import/`.

### Naming e conteudo

| FR        | Importador            | Diretorio golden                                | Endpoint                                                   | Arquivo esperado |
| --------- | --------------------- | ----------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| F-FOL-007 | Lancamento manual     | `tests/backend/golden/manual-entry-import-v01/` | `POST /api/v1/folhas/:folha_id/importar/lancamento-manual` | `expected.xlsx`  |
| F-FOL-008 | Verbas de servidor    | `tests/backend/golden/servidor-import-v01/`     | `POST /api/v1/folhas/:folha_id/importar/servidor`          | `expected.xlsx`  |
| F-FOL-009 | Verbas de pensionista | `tests/backend/golden/pensionista-import-v01/`  | `POST /api/v1/folhas/:folha_id/importar/pensionista`       | `expected.xlsx`  |

Cada diretorio deve manter:

- `input.json`: descricao humana e machine-readable do FR, endpoint, cabecalho,
  linhas e observacoes de escopo.
- `expected.xlsx`: binario OOXML deterministico usado como golden.
- `expected.sha256`: hash SHA-256 do binario esperado, no formato
  `sha256  expected.xlsx`.
- `README.md`: resumo do contrato e instrucao de regeneracao.

### Shape contratual

Os fixtures preservam o formato aceito pelo parser atual: primeira worksheet,
primeira linha como cabecalho, strings inline, e nomes de colunas normalizados
sem acentos. Para F-FOL-007 e F-FOL-008, a linha minima aceita usa
`matricula`, `verba_codigo`, `valor`, `quantidade`, `referencia` e
`observacao`. Para F-FOL-009, a linha tambem exige `pensao_id` e identifica o
beneficiario por `matricula_pensionista`.

Valores monetarios devem ser serializados como texto decimal com ponto e duas
casas, e quantidades como texto decimal com quatro casas quando presentes. UUIDs
em fixtures devem ser sintaticos e ficticios. Matriculas, codigos de rubrica e
observacoes devem deixar claro que sao exemplos de golden, nao amostras reais.

### Estabilidade binaria

O XLSX golden deve ser produzido por serializacao deterministica: entradas ZIP em
ordem fixa, sem timestamp de arquivo, sem compressao variavel, XML UTF-8
estavel e strings inline. Regeneracoes devem alterar `expected.xlsx` e
`expected.sha256` juntas, com revisao explicita do diff binario/hash e do
`input.json`.

As fixtures de R4-16 sao goldens de paridade estrutural do SGP. Elas nao
declaram byte-parity com o template legado porque nenhum artefato legado XLSX
esta armazenado no repositorio. Se um owner fornecer o template legado de
`/api/importadorVerbasFuncionario/template`, a comparacao byte-a-byte deve ser
registrada como novo evento de governanca antes de qualquer afirmacao de
compatibilidade de template legado.

Owner decision R5-16b (2026-05-04) waives legacy XLSX byte-parity for v0.0.1.
F-FOL-007, F-FOL-008 and F-FOL-009 therefore remain capped at maturity 3 by
design: the structural goldens are the accepted SGP regression contract, and the
legacy template presentation layout is not a compatibility target.
