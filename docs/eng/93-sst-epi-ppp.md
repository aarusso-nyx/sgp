# SST-05 — Riscos Ambientais, EPI e PPP

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** inventario de exposicao ambiental, S-2240, entrega de EPI e PPP precursor.

## Decisao

O SGP v0.0.1 registra exposicoes ambientais em `saude.environmental_exposure`, sempre vinculadas a um PGR `ACTIVE` de `saude.risk_management_program` que cubra a data inicial da exposicao. A tabela e tenant-scoped, auditada por `sgp_append_audit_event(...)` e protegida por RLS com `saude.exposure.read`, `saude.exposure.write`, `saude.epi.read`, `saude.epi.write`, `esocial.event.read` e `esocial.event.write`.

## S-2240

Cada insercao de exposicao cria pendencia `START` em `esocial.s2240_pending`. Alteracoes de agente, intensidade, periodo ou mitigacoes criam `CHANGE`; preenchimento de `exposure_end` cria `END`. O builder `source/backend/src/esocial-worker/builders/s2240.builder.ts` gera `evtExpRisco` S-1.3 e envia pelo hub ES-07, sem escrita direta em `public.esocial_event`.

## EPI

O inventario de EPI fica em `saude.epi_inventory`, por CA, nome, descricao e validade em meses. Entregas ficam em `saude.epi_delivery` e exigem `signature_method` `FISICA`, `DIGITAL` ou `GOVBR`; entregas digitais e GovBR exigem `signature_evidence_uri`. O campo `training_done_at` registra treinamento NR-6 quando aplicavel.

## PPP

`saude.ppp_record` e append-only. A geracao agrega exposicoes ambientais e entregas de EPI no periodo informado em `snapshot_json`, com `generated_at`, e bloqueia `UPDATE` e `DELETE` por trigger. O PPP eletronico do INSS permanece fora do escopo; este registro e o precursor local e auditavel.

## Contrato com CALC-07

A funcao `saude.exposure_read_for_payroll(employee_id, ref_date)` expõe a folha as exposicoes vigentes na data de referencia, incluindo `insalubrity_due` e `danger_pay_due`. A rubrica `SST_INSALUBRIDADE` usa `payroll_calc.evaluate_earning_deduction(...)` por meio de `payroll_calc.f_sst_insalubridade`, calculando 20% do salario base quando houver ruido acima de 85 dB(A) sem mitigacao por EPI.
