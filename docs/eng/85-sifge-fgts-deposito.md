# SIFGE FGTS — Deposito Caixa

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** implemented
**Escopo:** Folha de Pagamento / BANK-05 | **Depende de:** CLT-01, BANK-01, ES-04, ES-05, ES-07

## Fundamento

A Caixa Economica Federal e o banco operador do FGTS conforme Lei 8.036/1990, art. 7. A obrigacao mensal usa a aliquota de 8% do art. 15 para vinculos celetistas, enquanto a rescisao sem justa causa usa a multa ja apurada por CLT-01/CALC-12 sobre o saldo da conta vinculada. A trilha eSocial S-1200/S-5013 atende a obrigacao acessoria; este modulo gera o instrumento financeiro de recolhimento.

## Modelo Operacional

- `payment.fgts_remittance` registra cada remessa GRF mensal ou GRRF rescisoria, com status, competencia, totais, DAE, layout, adapter e hash do arquivo.
- `payment.fgts_grf` detalha a GRF por folha mensal, preservando quantidade de empregados, base, aliquota e valor por `payroll_run_id`.
- `payment.fgts_grrf` detalha a GRRF por vinculo rescindido, com data de desligamento, saldo-base, aliquota de multa, multa e valor de aviso previo indenizado quando houver.
- `payment.fgts_caixa_adapter` seleciona o adapter ativo por tenant. O padrao e `caixa-sifge-v4`; a troca para `caixa-sifge-mock` ocorre por configuracao de banco, sem alterar o orquestrador.

## Fluxo Mensal

`generateMonthlyGRF(tenantId, competence)` consolida somente movimentos `payment.fgts_movement` da competencia, com `kind IN ('DEPOSIT_8', 'DEPOSIT_AVISO')`, `source_event = 'MONTHLY'` e folha associada. Os totais da GRF batem com o totalizador da propria `payment.fgts_movement`; o modulo nao recalcula bases nem aliquotas em TypeScript.

## Fluxo Rescisorio

`generateTerminationGRRF(employmentLinkId, terminationId)` localiza o movimento `RESCISION_FINE_40` produzido pela rescisao, usa o valor de base e multa ja persistidos, acrescenta o aviso previo indenizado de `payment.prior_notice` quando aplicavel, e emite uma remessa `GRRF_TERMINATION` para a conta vinculada do trabalhador.

## Adapter Caixa

O contrato `CaixaSifgeAdapter` expoe `assemble(payload)`, `parse(buffer)`, `signIfRequired(buffer)`, `adapterKey`, `layoutVersion` e `requiresSignature`. O adapter `caixa-sifge-v4` serializa um envelope deterministico SIFGE 4.0, valida round-trip e aplica assinatura logica ICP-Brasil/ES-07 por digest SHA-256 quando o layout exige. O arquivo persistido referencia `sifge://fgts-remittances/<id>.sifge`, com SHA-256 gravado em `payment.fgts_remittance.file_hash`.

## Controles

As novas tabelas sao tenant-scoped e tem RLS forcada por `sgp_tenant_matches(tenant_id)` combinada com `sgp_has_any_permission('payroll.fgts.read','payroll.fgts.write','payment.remittance.write')`. Toda mutacao dispara trigger de auditoria com `public.sgp_append_audit_event(...)`. Colunas monetarias usam `numeric(14,2)`, aliquotas usam `numeric(18,6)`, e o codigo TypeScript do modulo nao usa `Math.round`.
