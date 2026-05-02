# Implementation Status

This document tracks the current implementation state for SGP v0.0.1 after the stale
`docs/audit/diag` and `docs/audit/inv` evidence snapshots were removed.

Last reassessed: 2026-04-26 by running the final reassessment gates from
`docs/audit/plan/05-final-reassessment.prompt.md`.

## Current Scope

Status: current non-deferred scope is aligned with the authoritative `docs/eng`
specifications.

The current implementation covers:

- Split runtime topology for `sgp-admin`, `sgp-portal`, `sgp-core-api`,
  `sgp-portal-api`, `sgp-payroll-engine`, `sgp-esocial-worker`,
  `sgp-integrations-worker`, and `sgp-report-service`.
- Canonical API route alignment for the current SGP route set.
- Portal menu/workflow route parity for current portal scope.
- Full database closure for in-scope legacy objects, with tenant-aware canonical
  runtime targets.
- PostgreSQL-only runtime persistence, Prisma models, SQL support files, seed
  orchestration, tenant session context, and RLS policy coverage.
- Current domain modules for Gestao, RH workflows, Folha orchestration,
  eSocial stub/sandbox processing, Saude/Pericia, SST support catalogs,
  Recrutamento, Avaliacao, Consultas Gerenciais, Previdenciario, portal,
  public, and external API surfaces.
- Document module S3-compatible flow with MiniIO permitted for tests when S3 is
  not configured.
- QA bootstrap support for local API/admin/portal smoke execution.
- Reverse-engineering evidence from 2026-04-26 is canonicalized in
  `docs/eng` successor sections and tracked in
  `docs/legacy-reverse/deprecation-status.md`.
- Source workspace CI/governance baseline is installed with Node 24, npm,
  single `package-lock.json`, non-mutating lint/format/typecheck gates,
  alignment gates, health JSON, tests, build, coverage, and governance
  validation.

## Current Verification

The current status is based on these gates:

- `npm run qa:bootstrap -- --evidence`
  - OK.
  - Ran with `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam-test`.
  - Started local API, admin frontend, and portal frontend for live QA smoke.
  - Completed all evidence steps: route sync/check, DB alignment, health, lint,
    OpenAPI client generation, full build, frontend tests, backend tests, DB
    smoke, backend coverage, URL validation, and live QA smoke.
- `npm run api:alignment:check -- --json`
  - OK.
  - `153` current documented routes.
  - `0` documented missing routes.
  - `0` runtime-only routes.
  - `11/11` current SGP domain modules covered.
  - Portal menu alignment green.
  - Admin menu parity postponed under `ADMIN_INSTALL_LATER`.
- `npm run db:alignment:check -- --json`
  - OK.
  - `full_closure` covers `150` in-scope objects.
  - `0` deferred full-closure objects.
  - `0` in-scope explicit exclusions.
  - Tenant session, RLS helper, RLS policy, and portal projection checks green.
- `npm run health:json`
  - OK.
  - All declared runtimes are present and healthy.
- `npm --workspace frontend run build:portal`
  - OK.
- `npm run test:portal`
  - OK: `2` files and `3` tests passed.
- `npm --workspace backend run test:e2e -- --runInBand`
  - OK: `1` suite and `18` tests passed.
- `npm run db:smoke`
  - OK.
- `npm --workspace backend run test:cov -- --runInBand`
  - OK: `60` suites and `201` tests passed.
  - Coverage: statements `94.91%`, branches `85.09%`, functions `97.21%`,
    lines `95.56%`.
- Live QA smoke
  - OK: backend API/auth/domain smoke passed `10` tests.
  - OK: admin/portal frontend smoke passed `4` tests.

## Final Reassessment

### Closed Gaps

- Database full closure is green for current scope: `150` full-closure objects,
  `0` deferred objects, and `0` in-scope explicit exclusions.
- Route alignment is green for current scope: `153` documented runtime routes,
  `0` documented missing routes, and `0` runtime-only routes.
- Domain/workflow/menu parity is green for current non-deferred scope:
  `11/11` current domain modules covered, portal menu alignment green, and
  admin menu parity explicitly postponed.
- Runtime topology is green: all declared runtimes report implemented/healthy.
- Portal build and portal tests are green.
- Backend e2e, DB smoke, and backend coverage gates are green.
- QA smoke is real evidence: required base URLs were bootstrapped locally and
  live backend/frontend smoke tests passed.
- Reverse evidence coverage is no longer `not_covered` for the 2026-04-26
  artifact wave; raw formula CSVs and dump inventories remain partial evidence
  with canonical targets in `docs/eng`.
- `.github/workflows/source-ci.yml` is the active CI entry point for the
  repository-root workspace. The older workflow under `.github` remains a
  source-local reference and is not the root GitHub Actions entry point.

### Accepted Future-Version Arrecadacao Scope

Arrecadacao Previdenciaria remains later-version scope. It is outside current
route, menu, DB, frontend, backend, authorization, and test gates until
`docs/eng` explicitly reinstates it as current scope.

### Current-Scope Blockers

None known.

## Deferred Scope

The following items are intentionally postponed by `docs/eng` decisions and are
not current implementation blockers:

- Admin frontend tree and backend administrative route installation.
- OAuth/Cognito/Gov.br identity paths and administrative identity management.
- Arrecadacao Previdenciaria.
- Real eSocial external transmission, production certificates, and homologation.
- Final `infra` strategy choice.
- Release/homologation gates such as Pact/scanners and production observability
  enforcement.

## Remaining Open Work

No non-deferred implementation blocker is currently known.

Open work is limited to deferred product/operations decisions:

- Install the admin tree and identity flows when the owner reopens that scope.
- Decide and implement the final infrastructure strategy.
- Replace eSocial stub/sandbox behavior with real external integration when that
  version is scheduled.
- Expand beyond the source CI baseline into full release/homologation gates when
  the postponed gate scope is approved.

## Notes

- `docs/audit/diag` and `docs/audit/inv` were removed because they were stale
  derived evidence snapshots. Current verification should be produced from live
  commands instead of relying on those archived artifacts.
- `docs/eng` remains the authoritative source for SGP v0.0.1 scope and
  acceptance.
