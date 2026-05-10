# Round 13 — Delta from Round 12

## Source Material

- Round 12 evidence: `docs/work/round-12/closure.json` (31 backlog items
  closed); `docs/gov/audit/diag/round-12/fr-delta.md` (empty data rows).
- No `docs/work/round-12/00-snapshot.md` was produced — see
  [00-snapshot.md](../../../../work/round-13/00-snapshot.md) baseline-fallback
  caveat.

## Baseline Caveat

Round 13 used the **fallback baseline** (current HEAD
`ff3aeacf335037f4ef825417d2aad183c4b134f1`) for hotspot extraction because no
prior `00-snapshot.md` exists at any round and no other unambiguous
previous-round baseline SHA was recorded. Per B0 §4.1 fallback rule:

- `docs/gov/audit/diag/round-13/hotspots.md` is a command-execution check
  only and contains zero churn rows by construction.
- Round 14's B0 runner MUST select round-13's HEAD as baseline:
  `npm run audit:hotspots -- --round 14 --baseline ff3aeacf335037f4ef825417d2aad183c4b134f1`.

## Feature-level Matrix Delta

From `docs/gov/audit/diag/round-13/fr-delta.md` against the prior ledger:

| Change                               | Count | FR-IDs                                                  |
| ------------------------------------ | ----: | ------------------------------------------------------- |
| `NEW → TODO`                         |     4 | FR-FI-352981, FR-PB-493825, FR-PR-9D4AE1, FR-TAS-94FEDC |
| `DONE → DONE` (held)                 |   ~25 | (per ledger)                                            |
| `DEFERRED → DEFERRED` (held)         |   ~57 | (per ledger)                                            |
| Regressions (`DONE → TODO/DEFERRED`) |     0 | —                                                       |
| Net new `DONE`                       |     0 | —                                                       |

Round 12 closure (`closure.json`) marked **30 backlog items done** and **1
obsolete** (R2-05 spec off-by-one — superseded). Those items live in the
backlog ledger, not the FR ledger, and are surfaced as evidence rows on the
relevant FRs.

## Global Completeness Delta

| Indicator                | Round 12               | Round 13             |
| ------------------------ | ---------------------- | -------------------- |
| FR ledger rows           | (not refreshed in r12) | 86 (87 incl. header) |
| FR DONE                  | (n/a)                  | 25                   |
| FR DEFERRED              | (n/a)                  | 57                   |
| FR TODO                  | (n/a)                  | 4                    |
| API routes (implemented) | (n/a)                  | 468                  |
| Schema tables            | (n/a)                  | 281                  |
| RLS coverage             | (n/a)                  | 277/281 (98.6%)      |
| Spec count (mapped)      | (n/a)                  | 588                  |
| PvD failures             | (n/a)                  | 0 / 25               |

Round 12's audit refresh did not run the deterministic ledger commands
(only `closure.json` was emitted). Round 13 establishes the first refreshed
baseline since round 11 for `schema-digest`, `api-surface`, `functional-requisites`,
and `inv/round-N/test-coverage-map`.

## Readiness Verdict Update

**Verdict (round 13):** SGP holds production-grade posture for
v0.0.1 in-scope FRs. Promise-vs-delivery is **25/25 ok**, no regressions.
The four newly surfaced `TODO` FRs are the round-14 backlog candidates; none
is critical-path under the current scope ledger.

Compared to the round-12 verdict implied by `closure.json` (which closed all
items as `done` across audit, observability, RBAC, eSocial, LGPD, portal,
quality posture), round 13 confirms no regression and adds four net-new
`TODO` FRs requiring B1 grooming.

## Documented Surface Changes

Recent commit window (per `00-snapshot.md`):

| Commit    | Subject                                           | Likely surface                           |
| --------- | ------------------------------------------------- | ---------------------------------------- |
| `ff3aeac` | feat: implement SGP production readiness tranches | Multi-surface (80 files / +6 009 / -571) |
| `9210ba1` | feat: close SGP production audit gaps             | Audit/governance                         |
| `f9c1a93` | chore: add hardening and deployment evidence      | Evidence, deploy                         |
| `0a47b7c` | docs: rebaseline external ownership boundaries    | `docs/gov/`                              |
| `b6d0756` | feat: close SGP-only B feature gaps               | Cross-domain                             |

## Open Questions for B1

1. Should `R2-05` (xsd-validator off-by-one) be removed from any `closure.json`
   future scaffolding now that it is `obsolete`?
2. Are the four `TODO` FRs in scope for round 14, or should they be moved to
   `DEFERRED` per `docs/gov/evidence/mvp-scope-ledger.md`? (Owner decision.)
3. Should the OpenAPI tag taxonomy be backfilled? All 468 routes report tag
   `untagged` per `docs/gov/audit/api-surface.md`. (Documentation-only
   improvement; not an FR.)
