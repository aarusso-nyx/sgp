# Code Quality — Round 13

Schema: per-surface LOC, LOC hotspots, dependency-graph signals, gate-level
posture. No dynamic gate runs in this audit beyond the deterministic
`audit:*` extractors (per B0 §7).

## LOC by Surface

| Surface | Files | LOC |
| ------------------------------------------------------------ | ----------: | ------------: | ----- |
| `backend/src/**/*.ts` | 1 036 | 141 930 |
| `frontend/src/app` + `frontend/portal/src/app` (excl. specs) | — | 24 062 |
| `database/sql/*.sql` | 50 | 24 614 |
| `tests/\*_/_.spec.ts                                         | \*.test.ts` | 127 | 6 232 |
| `tests/rls/*.spec.ts` | 72 | (incl. above) |
| Backend e2e specs | 108 | (incl. above) |

## Backend Hotspots (largest non-spec `.ts` files)

| Path                                                                                  |   LOC |
| ------------------------------------------------------------------------------------- | ----: |
| `backend/src/portal/portal.service.ts`                                                | 1 113 |
| `backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts` |   939 |
| `backend/src/convenio/internships/internships.service.ts`                             |   900 |
| `backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts`                  |   814 |
| `backend/src/folha-pagamento/rescisao/rescisao.service.ts`                            |   797 |
| `backend/src/saude/pericia.service.ts`                                                |   752 |
| `backend/src/folha-pagamento/import/pensionista-import.service.ts`                    |   727 |
| `backend/src/rh/workflows/rh-workflows.controller.ts`                                 |   726 |
| `backend/src/previdenciario/previdenciario.controller.ts`                             |   714 |
| `backend/src/report-service/payslip/payslip-render.service.ts`                        |   692 |

The largest spec is
`backend/src/previdenciario/previdenciario.service.spec.ts` at 1 081 LOC,
followed by `coverage-hardening.database-unavailable.spec.ts` at 981 LOC.

**Watch-list:** `portal.service.ts` and `rh-workflows.controller.ts` deserve
review for natural seam extraction in a future quality round; both are
single-file lumps over 700 LOC. Round 13 does not open a backlog item — flag
for B1 grooming consideration.

## Frontend Hotspots

| Path                                                                                     |               LOC |
| ---------------------------------------------------------------------------------------- | ----------------: |
| `frontend/src/app/core/api/generated/openapi-client.ts`                                  | 3 561 (generated) |
| `frontend/src/app/core/navigation/admin-feature-catalog.ts`                              |             2 229 |
| `frontend/src/app/features/rh/pages/rh-home/rh-home.ts`                                  |               662 |
| `frontend/src/app/app.routes.ts`                                                         |               480 |
| `frontend/portal/src/app/core/api/generated/openapi-client.ts`                           |   382 (generated) |
| `frontend/portal/src/app/core/portal/portal-feature-catalog.ts`                          |               360 |
| `frontend/src/app/features/folha-pagamento/rubricas/rubricas.ts`                         |               324 |
| `frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts` |               323 |

Generated openapi clients dominate the top — expected and not a concern.
`admin-feature-catalog.ts` at 2 229 LOC is a navigation/registry file; large
size is structural rather than a quality signal.

## DDL Hotspots

| Path                                         |   LOC |
| -------------------------------------------- | ----: |
| `database/sql/40-payroll_calc-functions.sql` | 3 190 |
| `database/sql/70-hr-final.sql`               | 2 682 |
| `database/sql/10-05-hr-ddl.sql`              | 2 042 |
| `database/sql/40-recrutamento-functions.sql` | 1 032 |
| `database/sql/40-hr-functions.sql`           |   912 |
| `database/sql/70-payroll-final.sql`          |   882 |
| `database/sql/40-ponto-functions.sql`        |   821 |
| `database/sql/40-payment-functions.sql`      |   806 |

Function packs (`40-*-functions.sql`) and finalisers (`70-*-final.sql`) carry
the bulk; this matches the canonical structure.

## Dependency-graph signals

- ApiClient adoption in frontend: 102 importers vs 11 raw `this.http.*` sites
  (see `inv/round-13/frontend.md`). One tight constraint, easy to monitor.
- Backend module count: 35 NestJS modules in `app.module.ts` imports
  (see `inv/round-13/backend.md`). No detectable cycles surfaced by
  `npm run check:circular-deps` per round-12 closure (`R2-*` items).

## Gate Posture (last refresh source: NFR ledger)

Per `docs/gov/audit/non-functional-requisites.md` "Current Assessment Addendum":

> Current gates are green for format, lint, typecheck, governance, broad Jest
> tests, DB smoke, API alignment, DB alignment, and `git diff --check`.

Round 13 audit does not re-run those gates; the `audit:*` calls completed
silently with no error output (round-13 audit log).

## Findings

- No code-quality red flags newly introduced. Two backend service files
  (`portal.service.ts`, `rh-workflows.controller.ts`) are size-watch
  candidates for a future quality-round backlog.
- Generated openapi clients are appropriately quarantined under `core/api/generated/`.
- LOC growth since the previous baseline is dominated by the production
  readiness tranches (commit `ff3aeac`: +6 009/-571 across 80 files); not
  unusual for a closure-wave commit.
