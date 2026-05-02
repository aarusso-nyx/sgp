# Politica de FGTS para Vinculos CLT

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** implemented
**Escopo:** Folha de Pagamento / CLT-01 | **Depende de:** CALC-11, CALC-12, XCUT-08

## Fundamento

O SGP calcula FGTS somente para vinculos celetistas (`contract_type` CLT/celetista). A base operacional segue a Lei 8.036/1990: recolhimento mensal de 8% sobre remuneracao e multa rescisoria de 40% sobre o saldo de depositos quando a dispensa ocorre sem justa causa. A multa adicional de 10% da LC 110/2001 nao e calculada, pois foi extinta para fatos geradores a partir de 2020 pela Lei 13.932/2019.

## Regras Implementadas

- A conta de FGTS fica em `payment.fgts_account`, vinculada a tenant, servidor e vinculo funcional.
- Cada competencia gera movimentos em `payment.fgts_movement` com valores `numeric(14,2)` e aliquotas `numeric(18,6)`.
- O fechamento da folha mensal (CALC-11) chama `payment.compute_fgts_monthly(payroll_run_id)` antes de fechar a competencia e grava `DEPOSIT_8` idempotente por folha.
- A rescisao (CALC-12) chama `payment.compute_fgts_termination_fine(payroll_run_id, employment_link_id, cause)` para CLT sem justa causa e grava `RESCISION_FINE_40`.
- O aviso previo indenizado (CLT-02) fica em `payment.prior_notice`; quando `kind = INDEMNIFIED`, a rubrica `RESC_AVISO_PREVIO` expoe a base e os dias proporcionais para compor a base de FGTS conforme Sumula 305/TST.
- O saldo usado para multa vem de `payment.v_fgts_balance`, somando depositos da conta, e nao de uma estimativa por salario.
- Pedido de demissao, dispensa com justa causa e vinculo estatutario nao geram multa de 40%.

## Integracao

Os movimentos alimentam bases para S-1200/S-2299/S-5013 e para relatorios operacionais. A geracao dos instrumentos de recolhimento fica em `folha-pagamento/operations/sifge`: a GRF mensal consolida movimentos `DEPOSIT_8`/`DEPOSIT_AVISO` da competencia, a GRRF rescisoria consome o movimento `RESCISION_FINE_40` ja apurado por CLT-01/CALC-12, e o adapter Caixa produz a estrutura SIFGE 4.0 com DAE e assinatura quando exigida pelo layout.

## Controles

As tabelas sao tenant-scoped, com RLS forçada por `sgp_tenant_matches(tenant_id)` e permissoes `payroll.fgts.read` / `payroll.fgts.write`. Toda mutacao passa por trigger de auditoria que chama `public.sgp_append_audit_event(...)`. Calculos monetarios ficam no banco, usando `round(..., 2)` em `numeric` e sem `Math.round` em codigo TypeScript.
