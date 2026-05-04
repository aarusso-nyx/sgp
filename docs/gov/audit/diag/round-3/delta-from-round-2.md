# Round-3 Delta vs Round-2

Baseline: round-2 closing HEAD `c66a7b9` (2026-05-03 03:07:58 -0300).
Current: round-3 audit HEAD `50dc67c` (2026-05-03 22:36:49 -0300).
Window: 8 commits, ~19h 30m, **+283 398 / −35 057 LOC** across 442 files (`git diff --shortstat c66a7b9..HEAD`).

Rubric: `docs/work/round-1/06-feature-matrix.md §6` (carried forward unchanged). Rubric reconciliation status for round-3 → round-2: **`rubric-uncertainty: none`**.

## 1. Feature-level matrix delta

Round-3 was a **governance / tooling consolidation** round, not a feature round. Per the closure-wave commit `c9d99ee` and the round-3 backlog tracker [`docs/work/round-2/prompts/ROUND3-INDEX.md`](../../../../work/round-2/prompts/ROUND3-INDEX.md), the items that landed were cross-cutting (idempotency, pagination, error registry, OpenAPI 3.1, RLS specs, missing goldens) plus LGPD procedural deepening (DPO/DSAR, public-power, PII batch) and FE modernization (dead modules, coverage/Playwright gate, signals slice).

No legacy parity row promotion. The round-2 84-feature matrix at [`docs/work/round-2/10-legacy-parity.md`](../../../../work/round-2/10-legacy-parity.md) carries forward unchanged. See [`../inv/round-3/legacy-parity.md`](../../inv/round-3/legacy-parity.md) for the verification.

| Domain                                                                 |                  R2 ≥4 | R2 =3 | R2 =2 | R2 ≤1 | R3 Δ |
| ---------------------------------------------------------------------- | ---------------------: | ----: | ----: | ----: | ---: |
| Gestão (35)                                                            |                      9 |    13 |    11 |     2 |    0 |
| RH (14)                                                                |                      5 |     6 |     1 |     2 |    0 |
| Folha (17)                                                             |     (per round-2 §1.3) |       |       |       |    0 |
| Other (18 — Ponto / Saúde / TCE / Recrutamento / Convênio / Avaliação) | (per round-2 §1.4-1.6) |       |       |       |    0 |

## 2. Backlog ledger delta

From [`docs/work/round-2/prompts/ROUND3-INDEX.md`](../../../../work/round-2/prompts/ROUND3-INDEX.md), the round-3 wave inventory was:

|                  Wave | Items                                                                                                          | Status at round-3 audit                      |
| --------------------: | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| W0 (R3-001 .. R3-005) | docs truth ledger, thin backend docs, OpenAPI contracts, route canary, backlog index                           | **5 / 5 complete**                           |
| W1 (R3-010 .. R3-016) | idempotency, pagination, error ratchet, 403 negatives, stub-spec replacement, RLS specs, missing goldens       | **7 / 7 complete**                           |
| W2 (R3-020 .. R3-025) | dead modules, coverage/Playwright gate, signals slice, small catalog parity, RH small parity, RH report+talent | **6 / 6 complete**                           |
| W3 (R3-030 .. R3-034) | LGPD DPO/DSAR, LGPD public-power, PII encryption batch, DB FK audit ratchet, live-data inventory               | **5 / 5 complete**                           |
| W4 (R3-040 .. R3-045) | DCTFWeb CSLL/MIT, EFD-Reinf R-2055/R-2000, eSocial totalizers, SIAFIC e2e, TCE RREO/RGF, fixture conventions   | **0 / 6 complete** — all PLANNED for round-4 |
| W5 (R3-050 .. R3-053) | worker scheduling, readiness/structured-logging, PAdES/GovBR spike, long-tail decision ledger                  | **0 / 4 complete** — all PLANNED for round-4 |

**Closure rate:** 23 / 33 round-3 backlog items complete (69.7 %). The 10 incomplete items are concentrated in W4 (regulatory) and W5 (cross-cutting infra) — both promoted as round-4 backlog seeds.

## 3. Persistent ledger delta

| Ledger                                                                              | Round-2                           | Round-3                                                                                  | Δ                                                                                                            |
| ----------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`docs/gov/audit/schema-digest.md`](../../schema-digest.md)                         | (refreshed at round-2)            | refreshed at `50dc67c`                                                                   | 0 schema delta (294 tables, 689 FKs, 1 036 indexes, 290 RLS tables, 612 policies, 264 triggers, 64 PII tags) |
| [`docs/gov/audit/api-surface.md`](../../api-surface.md)                             | (refreshed at round-2)            | refreshed at `50dc67c`; **488 implemented routes**; alignment+operation checks both `ok` | (round-2 didn't record the count in the ledger; round-3 baseline is 488)                                     |
| [`docs/gov/audit/functional-requisites.md`](../../functional-requisites.md)         | (refreshed at round-2)            | refreshed at `50dc67c`; **1 row** (FR-001 stub — parser misfire)                         | parser regression (see [`gaps.md`](./gaps.md) §4 item 1)                                                     |
| [`docs/gov/audit/non-functional-requisites.md`](../../non-functional-requisites.md) | 15 NFR rows                       | unchanged at `50dc67c`; 8 DONE / 6 PARTIAL / 1 unmoved                                   | unchanged                                                                                                    |
| [`docs/gov/audit/backlog-ledger.md`](../../backlog-ledger.md)                       | last refreshed at round-2 closure | **not refreshed** in round-3 audit (requires `closure.json` from execute phase)          | by-design lag                                                                                                |

## 4. NFR ledger delta — by status

From [`docs/gov/audit/non-functional-requisites.md`](../../non-functional-requisites.md) at round-3:

| Status  | Count | NFR-IDs                                                                                                                                                                                                                                                      |
| ------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DONE    |     8 | NFR-001 (RLS), NFR-002 (audit immutability), NFR-005 (RBAC), NFR-008 (rate-limit), NFR-009 (CORS), NFR-010 (FE coverage), NFR-011 (Playwright e2e), NFR-014 (API contract), NFR-015 (governance gate)                                                        |
| PARTIAL |     6 | NFR-003 (decimal policy), NFR-004 (idempotency adoption breadth), NFR-006 (observability adoption), NFR-007 (structured logging adoption), NFR-012 (regulatory output gates — homologation deferred), NFR-013 (PII encryption — 19 plaintext columns remain) |

Round-3 promotions vs round-2: NFR-010 (FE coverage), NFR-011 (Playwright e2e), and NFR-014 (API contract / OpenAPI 3.1) **promoted to DONE** by R3-021 and R3-003. NFR-004 (idempotency) **promoted from absent to PARTIAL** by the R3-010 helper landing.

## 5. Code-surface delta

From [`docs/work/round-3/00-snapshot.md`](../../../../work/round-3/00-snapshot.md) §"LOC delta":

|                                          Scope | Round-2 | Round-3 |                   Δ |
| ---------------------------------------------: | ------: | ------: | ------------------: |
|    Backend `*.ts` excl. generated (incl. spec) | 137 405 | 140 421 | **+3 016 (+2.2 %)** |
| Frontend admin + portal `*.ts` excl. generated |  25 125 |  24 573 |   **−552 (−2.2 %)** |
|     Tests `*.{ts,mjs,js}` (excl. node_modules) |  29 854 |  30 730 |   **+876 (+2.9 %)** |
|                            `database/**/*.sql` |  24 842 |  25 025 |   **+183 (+0.7 %)** |
|                         `prisma/schema.prisma` |   4 381 |   4 381 |                   0 |
|                                  SQL DDL files |      58 |      58 |                   0 |

The +283 k aggregate diff is dominated by `docs/refs/**` regulatory text dumps, `docs/eng/` consolidation (`platform.md`, `experience.md`, `quality-migration.md`, `product.md`), and the regenerated `frontend/src/app/core/api/generated/openapi-core.json` (+51 k LOC from R3-003).

## 6. Promise vs Delivery (round-3 wave)

From [`docs/gov/audit/diag/round-3/promise-vs-delivery.md`](./promise-vs-delivery.md): 1 of 1 checked failed (`FR-001` parser-stub case). The deeper round-3 wave delivery is captured in §2 above (23 / 33 closure rate).

## 7. Verdict

**Round-3 is a successful consolidation round.**

- ✅ Cross-cutting helpers (idempotency, pagination, error registry) landed.
- ✅ FE quality gates (coverage threshold, Playwright in CI) closed.
- ✅ OpenAPI 3.1 mandate satisfied; client regenerated.
- ✅ LGPD procedural deepening (DPO/DSAR, public-power, PII batch) closed.
- ✅ Audit-tooling pipeline locked behind 8 specs.
- ✅ Governance reorg consolidated the docs/gov tree (new `docs/gov/evidence/`, `docs/gov/generated/`, `docs/gov/prompts/`, plus `docs/gov/audit/inv/` and `docs/gov/audit/diag/` per-round subtrees).
- ✅ Reusable B0–B3 round prompts extracted; reusable Claude/Codex SGP skills landed.
- ⚠️ W4 regulatory closures (DCTFWeb CSLL, EFD-Reinf R-2055, eSocial S-5002/S-5012, SIAFIC e2e, TCE RREO/RGF) deferred to round-4.
- ⚠️ W5 infra closures (worker scheduling, structured-logging adoption, PAdES PKCS#7) deferred to round-4.
- ⚠️ Three pre-existing risks untouched: `employees.service.ts` 1 763 LOC, report-worker thread safety, full PII encryption coverage.
- ⚠️ Newly-surfaced: FR-ledger parser misfire (single FR-001 row) — small tooling fix to restore per-FR coverage mapping.

**Suggested round-4 backlog seeds** (in priority order):

1. R3-052 PAdES/GovBR real spike (go-live gate).
2. R3-040..045 regulatory closures (DCTFWeb CSLL, EFD-Reinf R-2055, eSocial totalizers, SIAFIC e2e, TCE RREO/RGF, fixture conventions).
3. R3-050 worker scheduling + R3-051 readiness/structured-logging.
4. `employees.service.ts` decomposition.
5. Report-worker concurrency hardening.
6. Lei 14.509 golden fixture + CF 37 XVI acumulação lícita.
7. Empty FE feature directories sweep.
8. FR-ledger parser fix.
