# Legacy Parity (Round 4)

**Mode: delta + selective promotion.** The 84-feature canonical legacy parity matrix remains canonical at [`docs/work/round-2/10-legacy-parity.md`](../../../../work/round-2/10-legacy-parity.md). Round-3 was a no-op for parity; **round-4 promotes a small set of rows** based on R4-\* closures. This file records the round-4 verification + promotions.

## Inputs verified at round-4

| Source                                                                                            | Round-3 verdict | Round-4 verdict | Evidence                                                              |
| ------------------------------------------------------------------------------------------------- | --------------- | --------------- | --------------------------------------------------------------------- |
| [`docs/leg/sql-reference/`](../../../../../docs/leg/sql-reference/)                               | unchanged       | **unchanged**   | `git log 50dc67c..HEAD -- docs/leg/sql-reference/` returns no commits |
| [`docs/leg/handoff/agent-handoff.md`](../../../../../docs/leg/handoff/agent-handoff.md)           | minor           | **unchanged**   | no R4 commits touched it                                              |
| [`docs/leg/rev-eng/deprecation-status.md`](../../../../../docs/leg/rev-eng/deprecation-status.md) | minor           | **unchanged**   | no R4 commits touched it                                              |

Net: zero behavioral change to the legacy reference surface in round-4. **All round-4 deltas come from new SGP capabilities, not from re-reading legacy.**

## Per-feature delta vs round-3

Promotions traceable to R4 closure:

| Feature row                                   |     Round-3 maturity |                                                               Round-4 maturity | Closure path                                                 | Evidence                                                                                                                                                                       |
| --------------------------------------------- | -------------------: | -----------------------------------------------------------------------------: | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-FOL-007 Importador de Lançamento Manual     |              3 (Eq3) |                               **3 (Eq3)** unchanged — capped at 3 pending NQ-1 | R4-16 (PARTIAL — legacy XLSX byte-parity blocked)            | structural golden `tests/backend/golden/manual-entry-import-v01/`; documented as non-byte-parity per [`docs/work/round-3/QUESTIONS.md`](../../../../work/round-3/QUESTIONS.md) |
| F-FOL-008 Importador de Verbas de Servidor    |              3 (Eq3) |                                          **3 (Eq3)** unchanged — same NQ-1 cap | R4-16 (PARTIAL)                                              | structural golden `tests/backend/golden/servidor-import-v01/`                                                                                                                  |
| F-FOL-009 Importador de Verbas de Pensionista |              3 (Eq3) |                                          **3 (Eq3)** unchanged — same NQ-1 cap | R4-16 (PARTIAL)                                              | structural golden `tests/backend/golden/pensionista-import-v01/`                                                                                                               |
| F-RH-006 Funcionário (CRUD lifecycle)         |              4 (Eq+) |    **4 (Eq+)** unchanged but **internal quality lifted** — R4-40 decomposition | `employees.service.ts` 1 763 → 163 LOC across 9 sub-services | round-2 risk #3 **closed**                                                                                                                                                     |
| F-FOL-014 (Reintegração retroativa)           |   (per round-2 §1.3) | maturity unchanged; **idempotency adoption proven** under R4-21 (9/9 surfaces) | `tests/backend/reintegracao-retroativa-6m.e2e-spec.ts`       |
| F-RH-006 multi-vínculo CF compatibility       |          **0 (Abs)** |                                                                    **3 (Eq3)** | R4-17 — new `accumulation.service.ts` + matrix table         | spec covers professor+técnico-científico (legal) + 2 comissionados (illegal)                                                                                                   |
| F-FIS-DCTFWeb (CSLL adicional + MIT)          |      1 (Abs/planned) |                                                                    **3 (Eq3)** | R4-10                                                        | golden `tests/backend/golden/dctfweb-csll-v01/`; CSLL column on `fiscal.dctfweb_item`                                                                                          |
| F-FIS-EFD-Reinf R-2055 + R-2000               |                    1 |                                                                    **3 (Eq3)** | R4-11                                                        | golden `tests/backend/golden/efd-reinf-r2055-v01/`; new builders for R-2000 + R-2055                                                                                           |
| F-ESO-S-5002 (totalizer parser)               |             2 (stub) |                                                                    **3 (Eq3)** | R4-12                                                        | mapped totalizers + retro-adjustment spec                                                                                                                                      |
| F-ESO-S-5012 (totalizer parser)               |             2 (stub) |                                                                    **3 (Eq3)** | R4-13                                                        | reconciliation spec asserts S-5012 = sum(S-5002)                                                                                                                               |
| F-TCE-RREO/RGF (LRF)                          |         2 (skeleton) |                                                                    **3 (Eq3)** | R4-15                                                        | per-state goldens (SP, MG); `rreo.builder.ts` + `rgf.builder.ts`                                                                                                               |
| F-TCE-SIAFIC (Decreto 11.453/2023)            | 2 (sync schema only) |                                                            **3 (Eq3)** PARTIAL | R4-14                                                        | neutral JSON e2e + golden; `officialConformance=false` per `QUESTIONS.md`                                                                                                      |
| F-ESO-PAdES PKCS#7 envelope                   |    2 (hint-embedder) |                                                            **3 (Eq3)** PARTIAL | R4-01                                                        | software-cert variant signs S-1299; HSM decision deferred; multi-class expansion blocked                                                                                       |

## Subdomain totals (preliminary)

Note: a precise rescore of the full 84-feature matrix awaits round-5; round-4 promotes the rows above. Of the 84 canonical legacy features:

- Round-3 closing (carried unchanged): 28 ≥4 (Eq+), 55 ≥3 (Eq3 or better), 65.5 % at maturity ≥ 3.
- Round-4 net delta: +1 row promoted from 0 → 3 (F-RH multi-vínculo per R4-17). The other promotions (DCTFWeb, EFD-Reinf, S-5002, S-5012, RREO/RGF, SIAFIC, PAdES) are eSocial / fiscal / TCE clusters that were **regulatory backlog rows**, not the 84-legacy-feature row set.
- New estimate: **~56 ≥3** (66.7 %), **28 ≥4** (33 %) — same ≥4 count; one more row crosses ≥3.

## Items permanently capped by R5-16b (legacy XLSX byte-parity waived)

R4-16 shipped structural goldens for F-FOL-007 / 008 / 009 but explicitly **does not** claim legacy template byte parity. Owner decision R5-16b (2026-05-04) waives byte-parity under the greenfield no-shims rule, so the round-3 cap holds permanently at maturity 3.

**Owner decision recorded** in [`docs/gov/evidence/deferred-decision-ledger.md`](../../../evidence/deferred-decision-ledger.md): waive the legacy XLSX template referenced as `/api/importadorVerbasFuncionario/template`. No legacy template was found in the repo, and future byte-parity work would require a new governance event rather than a v0.0.1 compatibility shim.

## Headline carry-forward

Round-3 closing: 28 ≥4 / 55 ≥3 / 65.5 % at maturity ≥ 3.

Round-4 closing (estimated):

- **+1 row** at ≥3 from R4-17 (F-RH multi-vínculo CF compatibility).
- Total: 28 ≥4 / 56 ≥3 / **66.7 % at maturity ≥ 3** (+1.2 pp).
- Top-cap blockers (F-FOL-007/008/009 NQ-1) are closed by R5-16b as permanent maturity-3 caps.

The major round-4 closures (DCTFWeb CSLL, EFD-Reinf R-2055, S-5002/S-5012, RREO/RGF, SIAFIC, PAdES) close the **regulatory backlog**, not the 84-legacy-feature parity matrix per se. Their impact is more visible in [diag/round-4/regulatory-adherence.md](../../diag/round-4/regulatory-adherence.md).
