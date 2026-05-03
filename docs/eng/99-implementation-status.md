# Implementation Status

This document tracks the current implementation state for SGP v0.0.1 after the stale
audit snapshot workflow was replaced by live command evidence.

Last reassessed: 2026-05-03 against the root npm workspace, current
`docs/eng`, `docs/gov`, `docs/user`, backend, frontend, database, scripts, and
GitHub Actions surfaces.

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
- LGPD public DPO contact, portal Art. 18 titular-rights ticket intake, ROPA
  linkage, auditable backend DPO designation lifecycle, and auditable
  treatment-by-public-power records tied to active ROPA/legal-basis evidence.
- PII-at-rest hardening for a non-destructive high-risk HR identifier/banking
  batch using `pgcrypto` ciphertext siblings and decrypting views.
- Validated inferred FK closure for the current conservative FK set, with
  eSocial pending/request tables carrying standard audit timestamps.
- QA bootstrap support for local API/admin/portal smoke execution.
- Reverse-engineering evidence from 2026-04-26 is canonicalized in
  `docs/eng` successor sections and tracked in
  `docs/leg/rev-eng/deprecation-status.md`.
- Deferred or source-pending decisions are tracked in
  `docs/eng/103-deferred-decision-ledger.md` and must not be treated as
  production-complete claims.
- Thin backend surfaces are documented in
  `docs/eng/104-backend-surface-notes.md`.
- Source workspace CI/governance baseline is installed with Node 24, npm,
  single `package-lock.json`, non-mutating lint/format/typecheck gates,
  alignment gates, health JSON, tests, build, coverage, and governance
  validation.

## Current Verification

The current status is based on these live gates:

- `npm run api:alignment:check -- --json`
  - OK.
  - `488` current documented runtime routes.
  - `0` documented missing routes.
  - `0` runtime-only routes.
  - `11/11` current SGP domain modules covered.
  - Portal menu alignment covers `31` implemented routes and `3` postponed
    identity routes.
  - Admin menu parity remains postponed under `ADMIN_INSTALL_LATER`.
- `node scripts/check-openapi-generated.mjs`
  - OK.
  - Generated admin/core and portal specs are OpenAPI 3.1 with JSON Schema
    2020-12.
  - Non-204 2xx responses have JSON schemas and standard 4xx responses use
    `SgpProblemDetails`.
- `npm run db:alignment:check -- --json`
  - OK.
  - `full_closure` covers `150` in-scope objects.
  - `0` deferred full-closure objects.
  - `0` in-scope explicit exclusions.
  - Tenant session, RLS helper, RLS policy, tenant-scoped table declarations,
    and portal projection checks are green.
- `npm run health:json`
  - OK.
  - All declared runtimes are present and healthy.
- `npm run governance:check`
  - OK.
  - Root script authority, runtime pins, governance manifest paths, devai hard
    fail gates, and reverse-evidence succession are green.
- `npm run lint:check`
  - OK.
- `npm run format:check`
  - OK.
- `npm run typecheck`
  - OK.
- `npm run test:backend -- --runInBand`
  - OK: `285` suites and `3121` tests passed.
- `npm run test:coverage -- --runInBand`
  - OK: `495` suites, `4044` tests, and `22` snapshots passed.
  - Coverage: `95.13%` statements, `85.34%` branches, `98.35%`
    functions, and `95.13%` lines.

DB-backed local tests use
`DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test` when they need a real
PostgreSQL database.

## Final Reassessment

### Closed Gaps

- Database full closure is green for current scope: `150` full-closure objects,
  `0` deferred objects, and `0` in-scope explicit exclusions.
- Route alignment is green for current scope: `488` documented runtime routes,
  `0` documented missing routes, and `0` runtime-only routes.
- Domain/workflow/menu parity is green for current non-deferred scope:
  `11/11` current domain modules covered, portal menu alignment green, and
  admin menu parity explicitly postponed.
- Runtime topology is green: all declared runtimes report implemented/healthy.
- Backend coverage, lint, format, typecheck, API alignment, DB alignment,
  runtime health, and governance gates are green.
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
- Real CMS/PKCS#7/PAdES signing and production Gov.br advanced-signature
  provider integration.
- Licença-prêmio accrual balance, interruptions, pecuniary conversion, and
  payroll/reflex calculation policy.
- Banco de Talentos ranking/matching, portal-public curriculum intake, and
  hiring-policy prioritization beyond the backend CRUD/search slice.
- Repasse Fundo RH report generation until the fund basis, eligible rubricas,
  accounting allocation, reconciliation rules, and layout/golden fixtures are
  selected.
- Object-level malware scanning and quarantine.
- Real TCE/AUDESP/state-court submission and accepted Siconfi/SIOPE/SIOPS
  transmission.
- Final `infra` strategy choice.
- Release/homologation gates such as Pact, scanners, and production observability
  enforcement.

## Remaining Open Work

No non-deferred implementation blocker is currently known.

Open work is limited to deferred product/operations decisions:

- Install the admin tree and identity flows when the owner reopens that scope.
- Decide and implement the final infrastructure strategy.
- Replace eSocial stub/sandbox behavior with real external integration when that
  version is scheduled.
- Replace the internal PAdES/Gov.br evidence adapters with owner-selected real
  providers when that scope is scheduled.
- Decide the licença-prêmio payroll policy before adding accrual balance or
  payment/conversion logic.
- Decide the Repasse Fundo RH report policy before adding runtime generation.
- Expand beyond the source CI baseline into full release/homologation gates when
  the postponed gate scope is approved.

## Notes

- Old audit-derived evidence snapshots were removed because they were stale.
  Current verification should be produced from live commands instead of relying
  on archived artifacts.
- `docs/eng` remains the authoritative source for SGP v0.0.1 scope and
  acceptance.
