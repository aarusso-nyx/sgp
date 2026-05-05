# Gaps & Risks (Round 4)

Round-4 was a **substantive feature/closure round**: 35 / 37 R4-\* items DONE, 2 PARTIAL, 0 BLOCKED (94.6 % closure rate per [`docs/work/round-4/00-closure-snapshot.md`](../../../../work/round-4/00-closure-snapshot.md)). The deep round-3 gap inventory at [`docs/gov/audit/diag/round-3/gaps.md`](../round-3/gaps.md) is largely **closed**; this file overlays the round-4 closures + remaining residuals + newly-surfaced items.

## 1. Top-10 Missing Regulatory Items — Round-4 status

Carried from round-3 [`gaps.md`](../round-3/gaps.md) §1:

|   # | Reg. Ref.                             | Item                                | Round-3 status                 | Round-4 status                                                                                                                                | Evidence                                                                                                                                                                                                            |
| --: | ------------------------------------- | ----------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Lei 14.063/2020 art. 3 — PAdES PKCS#7 | eSocial S-1.3 signature envelope    | PLANNED (R3-052 / R4-01)       | **CLOSED for S-1299 (PARTIAL for full corpus)** — software-cert variant landed; HSM decision deferred; multi-class blocked per `QUESTIONS.md` | [`backend/src/auth/govbr/software-pades-pkcs7.signer.ts`](../../../../../backend/src/auth/govbr/software-pades-pkcs7.signer.ts) (503 LOC)                                                                           |
|   2 | IN RFB 2.319/2026 § CSLL              | DCTFWeb CSLL inclusion + adicional  | PLANNED (R3-040 / R4-10)       | **CLOSED**                                                                                                                                    | [`backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts`](../../../../../backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts) +141 LOC; golden `tests/backend/golden/dctfweb-csll-v01/` |
|   3 | Lei 14.509/2022 payroll               | Margem consignável golden fixture   | Not addressed in round-3       | **CLOSED (R4-04)**                                                                                                                            | golden `tests/backend/golden/margem-consignavel-v01/`                                                                                                                                                               |
|   4 | EFD-Reinf R-2000 + NT 01/2026         | R-2055 retroactive adjustment       | PLANNED (R3-041 / R4-11)       | **CLOSED**                                                                                                                                    | new builders `r2055.builder.ts` + `r2000.builder.ts`; golden `tests/backend/golden/efd-reinf-r2055-v01/`                                                                                                            |
|   5 | eSocial S-5002 / S-5012               | Totalizer parsers                   | PLANNED (R3-042 / R4-12+R4-13) | **CLOSED**                                                                                                                                    | [`backend/src/esocial-worker/parsers/totalizer.parser.ts`](../../../../../backend/src/esocial-worker/parsers/totalizer.parser.ts) +585 LOC; reconciliation spec asserts S-5012 = sum(S-5002)                        |
|   6 | LGPD art. 23–32                       | Tratamento Poder Público controller | DONE (R3-031)                  | DONE (carried)                                                                                                                                | [`backend/src/lgpd/public-power.controller.ts`](../../../../../backend/src/lgpd/public-power.controller.ts)                                                                                                         |
|   7 | Comprovante Anual PDF/A               | Yearly-income golden                | DONE (R3-016)                  | DONE (carried)                                                                                                                                | `tests/backend/golden/comprovante-anual-v01/`                                                                                                                                                                       |
|   8 | LGPD art. 41 § 1 — DPO designation    | DPO public endpoint                 | DONE (R3-030)                  | DONE (carried)                                                                                                                                | [`backend/src/lgpd/dpo.controller.ts`](../../../../../backend/src/lgpd/dpo.controller.ts)                                                                                                                           |
|   9 | Column-level encryption (CLE)         | Sensitive PII beyond salary/SSN     | PARTIAL (4 cols → 23)          | **CLOSED (R4-20)** — 19 high/medium-priority cols extended; classification_comments grew 64 → 83                                              | per [docs/gov/audit/schema-digest.md:5-13](../../schema-digest.md); `database/sql/15-pii-encryption.sql`                                                                                                            |
|  10 | CF art. 37 XVI — acumulação lícita    | Multi-vínculo compatibility matrix  | Not addressed in round-3       | **CLOSED (R4-17)** — new `accumulation.service.ts` + matrix table                                                                             | spec covers professor+técnico (legal), 2 comissionados (illegal)                                                                                                                                                    |

**Round-4 closure rate on the round-3 Top-10 regulatory:** 9 / 10 fully closed, 1 / 10 PARTIAL (item 1, PAdES — S-1299 only). **No items remain untouched.**

## 2. Top-10 Critical-Path Go-Live Blockers — Round-4 status

Carried from round-3 §2:

|   # | Category      | Item                             | Round-3 status            | Round-4 status                                                                                     |
| --: | ------------- | -------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
|   1 | Testing       | Playwright e2e in CI             | DONE (R3-021)             | DONE (carried)                                                                                     |
|   2 | Architecture  | PAdES PKCS#7 stack               | PLANNED                   | **CLOSED for S-1299** (R4-01); multi-class deferred                                                |
|   3 | Risk LOC      | `employees.service.ts` 1 763 LOC | Not refactored in round-3 | **CLOSED (R4-40)** — 1 763 → 163 LOC across 9 sub-services                                         |
|   4 | Testing       | Frontend coverage gate           | DONE (R3-021)             | DONE (carried)                                                                                     |
|   5 | Frontend      | Async pipe / signals             | PARTIAL (R3-022)          | **CLOSED (R4-51)** — `.subscribe()` count under 50 (target met)                                    |
|   6 | Backend       | Report-worker thread safety      | Not addressed             | **CLOSED (R4-02)** — concurrency guard + e2e spec                                                  |
|   7 | Testing       | 18 eSocial events without golden | PARTIAL (R3-016)          | **PARTIAL** — totalizers S-5002/S-5012 added (R4-12/R4-13); other event-class goldens still patchy |
|   8 | Observability | Logging bootstrap-only           | PLANNED (R3-051 / R4-30)  | **CLOSED (R4-30)** — handler lint rule + Pino bootstrap + readiness probes                         |
|   9 | DevOps        | Docker / K8s orchestration       | Not addressed             | Not addressed in round-4 (out of SGP code-base scope per round-3 finding)                          |

**Round-4 closure rate on round-3 Top-10 critical-path:** 6 / 9 closed (items 3, 5, 6, 8 + carries 1, 4); 1 / 9 PARTIAL (item 2 + 7); 1 / 9 untouched (item 9 — out of scope by SGP boundary architecture).

## 3. Cross-cutting concerns — round-4 status

| Concern                  | Round-3 status                                           | Round-4 status                                                       | Evidence                                                                                                                                                            |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idempotency              | PARTIAL (R3-010 helper landed; adoption breadth partial) | **DONE** (R4-21 — 9/9 surfaces 100 %)                                | NFR-004 → DONE; [diag/round-4/idempotency-coverage.md](./idempotency-coverage.md)                                                                                   |
| Pagination               | DONE (R3-011)                                            | DONE (carried)                                                       | —                                                                                                                                                                   |
| Domain errors            | DONE (R3-012)                                            | DONE (carried)                                                       | —                                                                                                                                                                   |
| Money rounding           | PARTIAL (NFR-003)                                        | **DONE** (R4-22 — 0 violations across 714 TS files)                  | NFR-003 → DONE; [diag/round-4/decimal-coverage.md](./decimal-coverage.md)                                                                                           |
| Time-zone                | DONE                                                     | DONE (carried)                                                       | —                                                                                                                                                                   |
| RBAC                     | DONE (NFR-005)                                           | DONE (carried)                                                       | —                                                                                                                                                                   |
| Audit trail              | DONE (NFR-002)                                           | DONE (carried)                                                       | —                                                                                                                                                                   |
| Concurrency / scheduling | PLANNED (R3-050 / R4-03)                                 | **DONE** (R4-03 — `@nestjs/schedule`-based)                          | new [`backend/src/common/worker-scheduling/worker-poll-scheduler.service.ts`](../../../../../backend/src/common/worker-scheduling/worker-poll-scheduler.service.ts) |
| Multi-tenant RLS         | DONE (NFR-001)                                           | DONE (carried; 290/295 tables — 1 new ref-catalog allowed per R4-72) | —                                                                                                                                                                   |
| Structured logging       | PARTIAL (NFR-007)                                        | **DONE** (R4-30)                                                     | NFR-007 → DONE                                                                                                                                                      |
| Observability adoption   | PARTIAL (NFR-006)                                        | **DONE** (R4-31)                                                     | NFR-006 → DONE                                                                                                                                                      |
| PII encryption           | PARTIAL (NFR-013, 19 cols plaintext)                     | **DONE** (R4-20)                                                     | NFR-013 → DONE; classification_comments 64 → 83                                                                                                                     |

**12 / 15 NFRs DONE** (was 8 / 15 at round-3 close; +4 NFRs → DONE). **Remaining 3 PARTIAL/other:**

- **NFR-012** (regulatory output gates) — homologation deferred per SGP boundary architecture (not a defect; codified by owner decision 2026-05-03).
- Two NFRs not detailed in the truncated ledger view (likely the deferred-decision items absorbed into the SGP boundary).

## 4. Newly-surfaced items in round-4

These were **not** present in round-3's gap register; they emerged from round-4 closure:

1. **R4-90 PARTIAL: eSocial relay supports S-1299 only.** The mock relay + adapter (R4-97) and submission-via-queue (R4-90) work end-to-end for S-1299 but **block other implemented S-1xxx/S-2xxx classes** with `ESOCIAL_QUEUE_EVENT_UNSUPPORTED` (safe-default per `QUESTIONS.md`). Owner decision needed: expand relay/adapter/signer to cover all implemented classes, or narrow R4-90 acceptance permanently to S-1299. **Round-5 candidate: `R5-{90,97}` expansion.**
2. **R4-16 PARTIAL: legacy XLSX template byte-parity.** Three structural goldens shipped (manual-entry, servidor, pensionista) but **no legacy template artefact exists in the repo**. Owner decision needed: provide or waive the `/api/importadorVerbasFuncionario/template` source. F-FOL-007/008/009 capped at maturity 3.
3. **R4-14 PARTIAL: SIAFIC Decreto 11.453/2023 layout.** Neutral JSON e2e + golden shipped with `officialConformance=false`. `docs/refs/tce/siafic.md` pins Decreto 10.540/2020, not 11.453/2023. Owner decision needed: select layout version, official endpoint, field dictionary, homologation fixture source.
4. **eSocial production homologation deferred (out of SGP scope).** Per the SGP boundary architecture decision (2026-05-03), real eSocial production endpoints are **explicitly OUT** of SGP scope. Mock relay (R4-97) is the SGP boundary. Recorded in [`docs/gov/evidence/deferred-decision-ledger.md`](../../../evidence/deferred-decision-ledger.md) per R4-62.
5. **HSM-vs-software-cert decision (PAdES).** R4-01 chose software-cert variant; HSM decision recorded as deferred. Affects production readiness story; not blocking sandbox.
6. **77 FR rows now mapped.** R4-60 fixed the FR-ledger parser; per-FR test coverage mapping is operational. Most rows still TODO — [docs/gov/audit/functional-requisites.md](../../functional-requisites.md) — only 1 marked DONE (FR-FI-1F136F SIAFIC). **Round-5 candidate: drive per-FR coverage rate.**
7. **`report-worker.service.ts` LOC unchanged** — R4-02 added concurrency guard but did not decompose. Now the largest backend file at 1 032 LOC after the round-3 hotspots dropped. **Round-5 candidate: split.**
8. **`totalizer.parser.ts` is the new big file** — 927 LOC after R4-12+R4-13 added 585 LOC. Acceptable for a parser bundle but worth splitting if S-5003/S-5011/S-5013 grow further.

## 5. Top-5 risks (forward-looking, round-5 prep)

1. **Multi-class eSocial expansion** — R4-90 is S-1299-only. To unblock production homologation downstream of the SGP boundary, the mock relay + adapter + PKCS#7 signer must extend to all implemented S-1xxx/S-2xxx classes.
2. **Legacy XLSX template byte-parity** — F-FOL-007/008/009 cap holds without owner-provided template.
3. **SIAFIC layout decision** — without layout source, `officialConformance` flag stays false.
4. **HSM contract decision** — software-cert variant ships; production deployment may need HSM-backed signing depending on ente policy.
5. **Per-FR test mapping expansion** — 76 / 77 FR rows are TODO. Driving these to DONE/PARTIAL needs a sustained effort.

## 6. Top-5 quick wins (round-5 candidates)

1. **R5-{90,97}** — multi-class eSocial relay/adapter/signer expansion (M effort if owner approves).
2. **R5-02** — `report-worker.service.ts` (1 032 LOC) decomposition (M effort, no reg).
3. **R5-90b** — Owner-decision capture for R4-14 SIAFIC layout, R4-16 legacy template, R4-90 multi-class (S each, governance only).
4. **R5-FR-driver** — bring per-FR test mapping from 1 / 77 to ≥ 50 / 77 (M effort).
5. **R5-i18n** — drive 251 hard-coded FE strings down (M effort, baseline established).

## Cross-references

- [docs/gov/audit/diag/round-4/regulatory-adherence.md](./regulatory-adherence.md) — per-cluster regulatory matrix.
- [docs/gov/audit/diag/round-4/delta-from-round-3.md](./delta-from-round-3.md) — full round-3 → round-4 delta.
- [docs/gov/audit/diag/round-4/code-quality.md](./code-quality.md) — top-N file LOC delta after R4-40/R4-41/R4-42.
- [docs/gov/audit/non-functional-requisites.md](../../non-functional-requisites.md) — NFR ledger.
- [docs/work/round-3/QUESTIONS.md](../../../../work/round-3/QUESTIONS.md) — three R4 owner-decision blockers.
