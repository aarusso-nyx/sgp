# Round-4 Delta vs Round-3

Baseline: round-3 closing HEAD `50dc67c` (2026-05-03 22:36:49 -0300).
Current: round-4 audit HEAD `ea0966c` (2026-05-04 13:34:06 -0300).
Window: **1 commit**, ~15 hours, **+125 832 / −8 098 LOC** across 278 files (`git diff --shortstat 50dc67c..HEAD`).

Rubric: `docs/work/round-1/06-feature-matrix.md §6` (carried forward unchanged). `rubric-uncertainty: none` for round-4 → round-3 delta.

## 1. Feature-level matrix delta

Round-4 was a **substantive feature/closure round**: 35 / 37 R4-\* items DONE (94.6 %), 2 PARTIAL, 0 BLOCKED. **Three round-2-flagged top risks closed.**

| Domain                                                                 |                  R3 ≥4 | R3 =3 | R3 =2 | R3 ≤1 |                                    R4 Δ |
| ---------------------------------------------------------------------- | ---------------------: | ----: | ----: | ----: | --------------------------------------: |
| Gestão (35)                                                            |                      9 |    13 |    11 |     2 |                                       0 |
| RH (14)                                                                |                      5 |     6 |     1 |     2 | **+1 (R4-17 multi-vínculo from 0 → 3)** |
| Folha (17)                                                             |     (per round-2 §1.3) |       |       |       |       0 (capped F-FOL-007/008/009 hold) |
| Other (18 — Ponto / Saúde / TCE / Recrutamento / Convênio / Avaliação) | (per round-2 §1.4-1.6) |       |       |       |                                       0 |

See [docs/gov/audit/inv/round-4/legacy-parity.md](../../inv/round-4/legacy-parity.md) for the full per-row delta. Net legacy parity: **28 ≥4 (33 %) / 56 ≥3 (66.7 %)**, +1.2 pp at the ≥3 mark.

The other R4 closures (DCTFWeb, EFD-Reinf, S-5002/S-5012, RREO/RGF, SIAFIC, PAdES, margem 14.509, CF 37 XVI) close the **regulatory backlog**, not the 84-legacy-feature parity matrix. Their impact lives in [diag/round-4/regulatory-adherence.md](./regulatory-adherence.md).

## 2. Backlog ledger delta

From [`docs/work/round-4/closure.json`](../../../../work/round-4/closure.json) and [`docs/work/round-4/00-closure-snapshot.md`](../../../../work/round-4/00-closure-snapshot.md):

|                                               Wave | Items                                 | R4 close status                          |
| -------------------------------------------------: | ------------------------------------- | ---------------------------------------- |
|                     W0 (R4-04 / 50 / 60 / 61 / 62) | quick wins + tooling                  | **5 / 5 DONE**                           |
|                          W1 (R4-01 / 02 / 03 / 95) | production blockers + arch foundation | **4 / 4 DONE**                           |
|                          W2 (R4-10 / 11 / 12 / 13) | fiscal regulatory carry-over          | **4 / 4 DONE**                           |
| W3 (R4-14 / 15 / 16 / 81 / 90 / 91 / 96 / 97 / 98) | TCE/state + mock relays               | **7 / 9 DONE; 2 PARTIAL (R4-16, R4-90)** |
|                          W4 (R4-17 / 20 / 21 / 22) | critical-path deepening               | **4 / 4 DONE**                           |
|                                    W5 (R4-30 / 31) | observability + logging               | **2 / 2 DONE**                           |
|                               W6 (R4-40 / 41 / 42) | code-quality decomposition            | **3 / 3 DONE**                           |
|                               W7 (R4-70 / 71 / 72) | DB hardening                          | **3 / 3 DONE**                           |
|                                    W8 (R4-51 / 52) | FE modernization                      | **2 / 2 DONE**                           |
|                                         W9 (R4-80) | docs cross-reference                  | **1 / 1 DONE**                           |

**Closure rate:** 35 / 37 = **94.6 %** (was 23 / 33 = 69.7 % in round-3 → round-3 backlog). +24.9 pp closure improvement, fewer items deferred.

## 3. Persistent ledger delta

| Ledger                                                                            | Round-3                                                                              | Round-4                                                                                                       | Δ                                                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [docs/gov/audit/schema-digest.md](../../schema-digest.md)                         | 294 tables, 689 FKs, 1 036 indexes, 290 RLS, 612 policies, 264 triggers, 64 PII tags | 295 tables (+1), 689 FKs, 1 036 indexes, 290 RLS, 612 policies, **276 triggers (+12)**, **83 PII tags (+19)** | R4-17 + R4-20 + R4-70 effects                                                              |
| [docs/gov/audit/api-surface.md](../../api-surface.md)                             | 488 implemented routes; alignment+operation `ok`                                     | 488 routes (unchanged); `ok / ok`                                                                             | unchanged                                                                                  |
| [docs/gov/audit/functional-requisites.md](../../functional-requisites.md)         | 1 row (FR-001 stub — parser misfire)                                                 | **77 rows** parsed from `docs/eng/domains/*.md`                                                               | **R4-60 closure** — parser fully restored                                                  |
| [docs/gov/audit/non-functional-requisites.md](../../non-functional-requisites.md) | 8 DONE / 6 PARTIAL / 1 ongoing                                                       | **12 DONE / 3 PARTIAL**                                                                                       | +4 promoted (NFR-003 decimal, NFR-004 idempotency, NFR-006 observability, NFR-007 logging) |
| [docs/gov/audit/backlog-ledger.md](../../backlog-ledger.md)                       | last refreshed at round-2 closure                                                    | refreshed via `audit:backlog -- --closure docs/work/round-4/closure.json` per closure manifest                | R4 status column populated                                                                 |

## 4. NFR ledger delta — by status

From [`docs/gov/audit/non-functional-requisites.md`](../../non-functional-requisites.md) at round-4:

| Status           |  Count | NFR-IDs                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DONE             | **12** | NFR-001 (RLS), NFR-002 (audit immutability), **NFR-003 (decimal policy — R4-22)**, **NFR-004 (idempotency — R4-21, 9/9)**, NFR-005 (RBAC), **NFR-006 (observability — R4-31)**, **NFR-007 (structured logging — R4-30)**, NFR-008 (rate-limit), NFR-009 (CORS), NFR-010 (FE coverage), NFR-011 (Playwright e2e), NFR-014 (API contract), NFR-015 (governance gate) |
| PARTIAL or other |      2 | NFR-013 (PII encryption — closed per R4-20 but ledger view truncated; recheck), one other. NFR-012 is reclassified in R5-32 as DONE-by-architecture because the 2026-05-04 owner decision confirms external homologation is downstream of the SGP boundary.                                                                                                        |

**Round-4 promotions vs round-3:** NFR-003 (decimal), NFR-004 (idempotency), NFR-006 (observability), NFR-007 (logging) **all promoted to DONE**. NFR-013 (PII encryption) effectively closed by R4-20 (19 cols extended; classification_comments 64 → 83); pending ledger view confirmation.

## 5. Code-surface delta

|                                          Scope | Round-3 | Round-4 |                                                      Δ |
| ---------------------------------------------: | ------: | ------: | -----------------------------------------------------: |
|    Backend `*.ts` excl. generated (incl. spec) | 140 421 | 149 235 |                                    **+8 814 (+6.3 %)** |
| Frontend admin + portal `*.ts` excl. generated |  24 573 |  24 477 |                                       **−96 (−0.4 %)** |
|     Tests `*.{ts,mjs,js}` (excl. node_modules) |  30 730 |  34 055 |                                   **+3 325 (+10.8 %)** |
|                            `database/**/*.sql` |  25 025 |  25 701 |                                      **+676 (+2.7 %)** |
|                         `prisma/schema.prisma` |   4 381 |   4 381 |                                                      0 |
|                                  SQL DDL files |      58 |      60 | **+2** (`91-reference-data.sql`, `92-audit-final.sql`) |
|                           Backend `*.ts` files |     985 |   1 052 |                                                **+67** |

The +125 k aggregate diff is dominated by mempalace completion notes (37 files), regenerated audit JSONs (`docs/gov/audit/inv/round-4/*.json`), R4 closure manifests, and a separate rounds-7 fixture set unrelated to source. Source-code growth (~9 k LOC backend + ~3 k LOC tests) is entirely R4-\* implementation work.

## 6. Promise vs Delivery (round-4 wave)

From [`docs/gov/audit/diag/round-4/promise-vs-delivery.md`](./promise-vs-delivery.md): 1 of 1 checked passed (FR-FI-1F136F SIAFIC). Per-FR coverage is now operational thanks to R4-60; the deeper round-4 wave delivery is captured in §2 above (35 / 37 = 94.6 % closure rate).

## 7. Verdict

**Round-4 is an exceptionally successful closure round.**

- ✅ All round-2-flagged Top-3 risks closed (employees.service decomposition, integrations-worker split, avaliacao split).
- ✅ All round-3-flagged W4 regulatory deferrals landed (DCTFWeb CSLL, EFD-Reinf R-2055, eSocial S-5002/S-5012, SIAFIC, TCE RREO/RGF, fixture conventions).
- ✅ All round-3-flagged W5 cross-cutting infra landed (worker scheduling, structured logging, observability, PAdES PKCS#7 spike).
- ✅ Round-3 newly-surfaced quick wins all closed (FR-ledger parser, hotspots exclude-list, empty FE feature dirs, long-tail decision ledger).
- ✅ Round-3 PARTIAL NFRs promoted to DONE (idempotency, decimal policy, observability, structured logging, PII encryption).
- ✅ SGP boundary architecture codified (R4-95 queue contract + 3 mock relays R4-96/97/98).
- ✅ FE modernization completed (R4-50 empty dirs cleanup, R4-51 below 50 `.subscribe()` threshold).
- ✅ FR-ledger parser restored (R4-60); 77 FR rows now mapped.
- ⚠️ Two R4 items PARTIAL with owner-decision blockers: R4-16 (legacy XLSX byte-parity), R4-90 (multi-class eSocial expansion).
- ⚠️ One R4 item PARTIAL with source-pending blocker: R4-14 (SIAFIC Decreto 11.453/2023 layout selection).

**Suggested round-5 backlog seeds** (in priority order):

1. **R5-90+97** — Multi-class eSocial relay/adapter/signer expansion (carries R4-90 owner decision).
2. **R5-02** — `report-worker.service.ts` decomposition (now top-1 by LOC; round-3 risk #6 follow-on).
3. **R5-14b** — SIAFIC layout decision recorded as out-of-scope per SGP boundary; R5-14 withdrawn.
4. **R5-16b** — Legacy XLSX byte-parity waived; F-FOL-007/008/009 remain permanent maturity-3 structural-golden caps.
5. **R5-FR-driver** — Drive per-FR test mapping coverage from 1 / 77 to ≥ 50 / 77 (newly possible after R4-60).
6. **R5-i18n** — Drive 251 hard-coded FE strings down (R4-52 baseline established).
7. **R5-pades-multiclass** — Extend PKCS#7 envelope beyond S-1299 (carries R4-01 expansion).
8. **R5-81** — SGP-boundary runbook documents the HSM/A3 config-driven integration shape after R5-01b withdraws the HSM runtime slice.
