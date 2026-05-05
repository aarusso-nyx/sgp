# Round-9 Delta vs Round-4

Baseline: round-4 closing HEAD `ea0966c` (2026-05-04 13:34:06 -0300). Round-9 audit is at the **same HEAD** with 199 paths in working-tree dirty state representing R5 + R6 in-flight closures. Rounds 5/6/7/8 reserved for the stynx-esocial lift-out program (per the user-confirmed framing); round-9 is the first normal SGP audit cycle following the lift-out.

Rubric: `docs/work/round-1/06-feature-matrix.md §6` carried forward unchanged. `rubric-uncertainty: none`.

## 1. Feature-level matrix delta

Round-9 is **mid-program for the lift-out** (R5 in flight + R6 in flight) and the next normal SGP audit. Per round-9 framing, eSocial parity rows reframe to "boundary integration" rather than "implementation depth"; legacy parity overall:

| Domain       |         R4 ≥4 |           R4 ≥3 |  R9 ≥4 (est.) |     R9 ≥3 (est.) |                                   Δ |
| ------------ | ------------: | --------------: | ------------: | ---------------: | ----------------------------------: |
| Gestão (35)  |             9 |              22 |             9 |           **23** |                +1 (R5-52 F-GES-029) |
| RH (14)      |             5 |              11 |             5 |           **13** | +2 (R5-50 F-RH-005, R5-51 F-RH-008) |
| Folha (17)   | (per round-2) |   (per round-2) |     unchanged |        unchanged |  0 (cap on F-FOL-007/008/009 holds) |
| Other (18)   | (per round-2) |   (per round-2) |     unchanged |        unchanged |                                   0 |
| **Total 84** | **28 (33 %)** | **56 (66.7 %)** | **28 (33 %)** | **~59 (70.2 %)** |          **+3 rows; +3.5 pp at ≥3** |

See [docs/gov/audit/inv/round-9/legacy-parity.md](../../inv/round-9/legacy-parity.md) for per-row delta.

## 2. Backlog ledger delta

| Round                    |                  Items planned |                                                                                                                               Items closed (in-flight or DONE) | Notes                                                                                            |
| ------------------------ | -----------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------ |
| R4 closure waves         |                             37 |                                                                                                                                                    35 (94.6 %) | round-4 closing                                                                                  |
| **R5 closure waves**     | **20 active** (post-decisions) | **~17–20 in flight** in working tree (R5-02, R5-30, R5-31, R5-40, R5-41, R5-50, R5-51, R5-52, R5-60, R5-61, R5-70, R5-80, R5-81 evident; R5-32 verify pending) | round-5 owner decisions resolved in W0; W4 superseded by R6→R10                                  |
| **R6 lift-out cycle 1**  |                   **11 items** |                                                        **~5–6 SGP-side in flight** (R6-01, R6-05, R6-06, R6-07; R6-08 partial; R6-10 pending closure manifest) | stynx-esocial-side items (R6-02, R6-03, R6-04, R6-11) require external repo + AWS account access |
| **Round-9 (this audit)** |                            n/a |                                                                                                                                                            n/a | first SGP audit post-lift-out program-start                                                      |

## 3. Persistent ledger delta

| Ledger                                                                            | Round-4                                                                              | Round-9                                                                                                                      | Δ                                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [docs/gov/audit/schema-digest.md](../../schema-digest.md)                         | 295 tables, 689 FKs, 1 036 indexes, 290 RLS, 612 policies, 276 triggers, 83 PII tags | **296 tables (+1), 690 FKs (+1), 1 040 indexes (+4), 291 RLS (+1), 615 policies (+3), 276 triggers (0), 119 PII tags (+36)** | new spool table; R5-70 PII tagging extension                  |
| [docs/gov/audit/api-surface.md](../../api-surface.md)                             | 488 routes; alignment+operation `ok`                                                 | **488 routes** unchanged                                                                                                     | no new public routes (gateway pattern is internal)            |
| [docs/gov/audit/functional-requisites.md](../../functional-requisites.md)         | 77 rows                                                                              | **82 rows**                                                                                                                  | +5 from R5-80 cross-reference extension to remaining clusters |
| [docs/gov/audit/non-functional-requisites.md](../../non-functional-requisites.md) | 12 DONE / 3 PARTIAL                                                                  | **12 DONE / 3 PARTIAL** (NFR-012 reframe pending verification per R5-32)                                                     | structural unchanged                                          |
| [docs/gov/audit/backlog-ledger.md](../../backlog-ledger.md)                       | 188 rows + R4 column                                                                 | **221 rows + R5 + R6 columns** (R5: 23 rows, R6: 11 rows incl. R5-90/97 superseded)                                          | round-5 + round-6 backlogs filed                              |

## 4. NFR ledger delta — by status

| Status           | R4 count |                  R9 count | NFR-IDs                                                                                                     |
| ---------------- | -------: | ------------------------: | ----------------------------------------------------------------------------------------------------------- |
| DONE             |       12 |                    **12** | NFR-001 through NFR-011 + NFR-013 + NFR-014 + NFR-015 (carry; NFR-013 PII coverage extended via R5-70)      |
| PARTIAL or other |        3 | **3** (1 reframe pending) | NFR-012 (regulatory output gates — pending R5-32 reframe to DONE-by-architecture per SGP boundary decision) |

Round-9 promotion candidates: NFR-012 → DONE-by-architecture (R5-32). Verify post-commit.

## 5. Code-surface delta

|                                          Scope | Round-4 |     Round-9 |                               Δ |
| ---------------------------------------------: | ------: | ----------: | ------------------------------: |
|    Backend `*.ts` excl. generated (incl. spec) | 149 235 | **154 118** |             **+4 883 (+3.3 %)** |
| Frontend admin + portal `*.ts` excl. generated |  24 477 |  **25 003** |               **+526 (+2.1 %)** |
|     Tests `*.{ts,mjs,js}` (excl. node_modules) |  34 055 |  **36 180** |             **+2 125 (+6.2 %)** |
|                            `database/**/*.sql` |  25 701 |  **25 901** |               **+200 (+0.8 %)** |
|                         `prisma/schema.prisma` |   4 381 |       4 381 |                               0 |
|                                  SQL DDL files |      60 |      **61** | **+1** (`16-esocial-spool.sql`) |
|                           Backend `*.ts` files |   1 052 |  **~1 130** |                         **+78** |
|                    Total `*.spec.ts` repo-wide |     476 |     **501** |                         **+25** |

## 6. Promise vs Delivery (round-9 wave)

From the round-9 promise-vs-delivery diagnostic at [diag/round-9/promise-vs-delivery.md](./promise-vs-delivery.md): 1 of 1 checked passed (FR-FI-1F136F SIAFIC; round-4 carry — only DONE-tagged FR row in the ledger). Per-FR coverage drive (R5-30) is in-flight; full re-mapping awaits closure-manifest sweep.

## 7. Verdict

**Round-9 is mid-program for the stynx-esocial lift-out.** R5 closure-track work landed broadly in working tree; R6 lift-out foundation items (R6-01, R6-05, R6-06, R6-07) landed in working tree. The lift-out program (R6 → R10) continues across rounds 7-8 (eSocial production migration to stynx-esocial AWS service) and round-10 (steady-state hardening + SGP-side `esocial.*` schema deletion).

**SGP measurable improvements vs round-4:**

- ✅ Round-4 top-1 LOC risk closed (R5-02: `report-worker.service.ts` 1 032 → ≤ 600 + 5 sub-services).
- ✅ PII tagging long-tail closed (R5-70: classification_comments 83 → 119).
- ✅ Three new legacy-parity rows promoted (R5-50 + R5-51 + R5-52: F-RH-005, F-RH-008, F-GES-029).
- ✅ Playwright e2e breadth extended (R5-60: 5 → 10+ specs).
- ✅ RLS spec coverage parity audit landed (R5-61).
- ✅ SGP-canonical `public.esocial_spool` table created (R6-06 — replaces in-process `esocial_event` model with explicit message-spool record).
- ✅ SGP-side queue transport pluggability + per-tenant flag (R6-05 + R6-07).
- ✅ Cross-boundary audit + spool-update consumers (R6-08).
- ✅ Boundary mock-relay extension to GovBR + SICONFI/SIOPE/SIOPS (R5-40 + R5-41).
- ⚠️ Working tree dirty; R5/R6 changes not yet committed. Subsequent agent should commit cleanly before R10 begins.
- ⚠️ R5-32 NFR-012 reframe not yet verified to land in NFR ledger.
- ⚠️ R6 stynx-esocial-side items (R6-02, R6-03, R6-04, R6-11) require external repo + AWS account access — out-of-tree.

**Suggested round-10 backlog seeds:**

1. **R10-01** — Commit R5/R6 working-tree changes cleanly; produce closure manifests for round-5 + round-6.
2. **R10-02** — Verify R5-32 NFR-012 reframe lands in NFR ledger; close PARTIAL count.
3. **R10-03** — Verify R5-30 FR-coverage drive landed (per-FR mapping rate ≥ 50/82).
4. **R10-04** — Delete `public.esocial_event` (per lift-out plan §R7-07 REVISED — replaced by `public.esocial_spool`).
5. **R10-05** — FE-never-hits-stynx-esocial CI lock-in (lint + bundle scan + CSP, plan §R10-07).
6. **R10-06** — Spool integrity nightly diff (plan §R10-08).
7. **R10-07** — SGP `esocial.*` schema deletion + `esocial-worker/*` deletion (lift-out plan §R9 in original numbering — happens at SGP-side strip phase).
8. **R10-08** — stynx-esocial cross-account audit pack (separate audit; first stynx-esocial-side audit cycle).
