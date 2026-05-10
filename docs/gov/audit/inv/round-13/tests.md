# Tests Inventory — Round 13

Narrative wrapper around
[`docs/gov/audit/inv/round-13/test-coverage-map.json`](test-coverage-map.json)
and the markdown rendering at
[`docs/gov/audit/inv/round-13/test-coverage-map.md`](test-coverage-map.md).

## Aggregate

| Metric                                                   |                     Value |
| -------------------------------------------------------- | ------------------------: |
| Total spec files mapped (Jest + Vitest + RLS + e2e)      |                   **588** |
| Functional requisites in scope                           | 86 (87 rows incl. header) |
| FRs with at least one mapped spec                        |                 86 (100%) |
| Backend `*.spec.ts` / `*.test.ts` files (under `tests/`) |                       127 |
| Backend e2e specs (`tests/**/*.e2e-spec.ts`)             |                       108 |
| RLS cross-tenant specs (`tests/rls/*.spec.ts`)           |                        72 |
| Playwright suites                                        |        2 (admin + portal) |

Source: [`test-coverage-map.md:5`](test-coverage-map.md).

## Test-density per FR

- Mean specs-per-FR: **74.6**
- Lowest density (top 10):

| FR-ID         | Spec count |
| ------------- | ---------: |
| FR-PT-EC4F9F  |         29 |
| FR-TAS-04FA10 |         30 |
| FR-PR-9D4AE1  |         32 |
| FR-PR-278EF3  |         33 |
| FR-PR-310238  |         36 |
| FR-TAS-31AA0F |         37 |
| FR-TAS-94FEDC |         37 |
| FR-PR-27A188  |         38 |
| FR-PR-DE52F4  |         38 |
| FR-FI-9FDB83  |         41 |

The clustering of `PR-*` (people-recruitment) and `TAS-*`
(time-attendance-sst) at the bottom suggests targeted spec-strengthening if
those FRs are promoted from `DEFERRED` → `TODO` in B1.

## FR Status Distribution (round 13)

| Status   | Count |
| -------- | ----: |
| DONE     |    25 |
| DEFERRED |    57 |
| TODO     |     4 |

Cross-check: matches `docs/gov/audit/functional-requisites.md` totals (25/57/4
out of 86 in-scope rows; total 87 rows incl. one row that may be absent in the
delta — see `fr-delta.md`).

## Test Trees

- `tests/backend/{unit,golden,observability,support,api,fixtures,e2e,helpers}` —
  primary backend test surfaces. Goldens hold deterministic byte-for-byte
  fixture comparisons (e.g. AFD/AFDT, EFD-Reinf TXT, DIRF TXT).
- `tests/rls/{*-cross-tenant.spec.ts, *-self-only.spec.ts}` — 72 specs
  exercising tenant isolation per table family.
- `tests/e2e/{folha,fiscal,recrutamento,ponto,rh,avaliacao,tce,support}` —
  end-to-end runs grouped by domain; consume backend HTTP via Nest test app.
- `tests/frontend/{unit,api,admin,portal,e2e}` — Vitest unit + API contract +
  Playwright e2e.
- `tests/audit/`, `tests/db/`, `tests/scripts/`, `tests/lib/` — non-domain
  scaffolding.

## Critical-path coverage check (golden tests)

- Payroll calc property-based tests: `R2-153` complete (per `closure.json` round 12).
  Cite: `backend/src/folha-pagamento/operations/**/*.spec.ts` plus property
  helpers in `tests/backend/helpers`.
- AFD/AFDT goldens: present (`tests/e2e/ponto/`, mapped to `FR-TAS-CBF51F`,
  `FR-TAS-B89144`).
- DCTFWeb totalizer reconciliation:
  `tests/backend/dctfweb-totalizer-reconciliation.e2e-spec.ts:55` per
  `functional-requisites.md` evidence row for `FR-FI-93690B`.
- DIRF: `tests/backend/dirf-validacao.e2e-spec.ts` for `FR-FI-06B611`.
- EFD-Reinf R-4000 trio (R-4010/4020/4040/4080/4099):
  `backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.spec.ts:22`
  per `FR-FI-26241D` evidence row.

## Watch-list for B1

- Four `TODO` FRs are net-new in round 13 (see `diag/round-13/fr-delta.md`):
  `FR-FI-352981`, `FR-PB-493825`, `FR-PR-9D4AE1`, `FR-TAS-94FEDC`. They
  already inherit ≥30 specs each from cross-cutting bootstrap/observability
  suites, but **lack focused implementation specs**. Treat the inherited count
  as a transitive proximity, not a delivery signal, when scoring maturity.
- Spec coverage map does not currently cross-classify by golden vs unit vs
  e2e — for round 14 it may be worth extending `audit:tests` to emit per-FR
  type breakdown if owner agrees.
