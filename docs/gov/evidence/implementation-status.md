# Implementation Status Evidence

Evidence/status artifact. It records implementation state and does not override authored or facts authority.

## Merged Artifact Index

- Implementation Status

## Implementation Status

## Implementation Status

This document tracks the current implementation state for SGP v0.0.1 after the stale
audit snapshot workflow was replaced by live command evidence.

Last reassessed: 2026-05-09 against the root npm workspace, current
`docs/eng`, `docs/gov`, `docs/user`, backend, frontend, database, scripts, and
GitHub Actions surfaces. This refresh supersedes the older 2026-05-03
assessment while preserving its inspection trail.

### Current Scope

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
- Full high-risk PII encryption inventory closure: all `30` high-risk PII
  columns have cipher siblings, with non-destructive rotation/backfill support
  retained in `database/sql/15-pii-encryption.sql` and
  `database/sql/15a-pii-encryption-rotation.sql`.
- M.06 MANAD report-worker export package with deterministic TXT/JSON artifacts,
  approved/paid/closed payroll-run validation, generated-report audit, and a
  golden fixture.
- Banco de Talentos accepted ranking defaults: consent-gated intake, profile
  completeness score, weighted skill/experience ranking, and deterministic
  tie-breakers.
- Repasse Fundo RH accepted report defaults: approved payroll-run basis,
  eligible rubrica classification, source allocation, reconciliation totals, and
  deterministic PDF/CSV/JSON outputs.
- N.06/N.07 SST legal lifecycle foundations for PCMAT and CIPA in canonical SQL,
  with tenant-scoped validity, work-location scope, audit triggers, and RLS.
- Validated inferred FK closure for the current conservative FK set, with
  eSocial pending/request tables carrying standard audit timestamps.
- QA bootstrap support for local API/admin/portal smoke execution.
- Reverse-engineering evidence from 2026-04-26 is canonicalized in
  `docs/eng` successor sections and tracked in
  `docs/leg/rev-eng/deprecation-status.md`.
- Deferred or source-pending decisions are tracked in
  `docs/gov/evidence/deferred-decision-ledger.md` and must not be treated as
  production-complete claims.
- Thin backend surfaces are documented in
  `docs/gov/evidence/backend-surface-notes.md`.
- Source workspace CI/governance baseline is installed with Node 24, npm,
  single `package-lock.json`, non-mutating lint/format/typecheck gates,
  alignment gates, health JSON, tests, build, coverage, and governance
  validation.

### Current Verification

The current status is based on these live gates:

- `npm run api:alignment:check -- --json`
  - OK.
  - `453` current documented runtime routes.
  - `0` documented missing routes.
  - `0` runtime-only routes.
  - `11/11` current SGP domain modules covered.
  - Portal menu alignment covers `31` implemented routes and `3` postponed
    identity routes.
  - Admin menu parity remains postponed under `ADMIN_INSTALL_LATER`.
- `node scripts/check-api.mjs spec check`
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
- `npm run test:db`
  - OK.
  - Canonical SQL bootstrap, deterministic seed, tenant/RLS checks, and DB smoke
    assertions pass.
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
- `npm run test`
  - OK: `323` suites, `3381` tests, and `27` snapshots passed.
- `git diff --check`
  - OK.

DB-backed local tests use
`DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test` when they need a real
PostgreSQL database.

### Final Reassessment

#### Closed Gaps

- Database full closure is green for current scope: `150` full-closure objects,
  `0` deferred objects, and `0` in-scope explicit exclusions.
- Route alignment is green for current scope: `453` documented runtime routes,
  `0` documented missing routes, and `0` runtime-only routes.
- Domain/workflow/menu parity is green for current non-deferred scope:
  `11/11` current domain modules covered, portal menu alignment green, and
  admin menu parity explicitly postponed.
- Backend coverage, lint, format, typecheck, API alignment, DB alignment,
  DB smoke, broad test, and governance gates are green.
- DB bootstrap blockers around `lgpd.sgp_lgpd_touch_updated_at()` and canonical
  `payroll.employee_payroll_item` setup are repaired; `npm run test:db` is
  green.
- M.06 MANAD and P.12 LGPD international transfer have current runtime/test
  evidence.
- Banco de Talentos and Repasse Fundo RH are no longer deferred decisions for
  SGP: accepted defaults are implemented in the current backend/report-worker
  slice.
- Identity, admin framework surfaces, eSocial runtime, and malware
  scanning/quarantine are not SGP implementation backlog after the owner
  decision; they are delegated to `../stynx`, `../stynx-esocial`, or the
  accepted storage/external-service boundary.
- Reverse evidence coverage is no longer `not_covered` for the 2026-04-26
  artifact wave; raw formula CSVs and dump inventories remain partial evidence
  with canonical targets in `docs/eng`.
- `.github/workflows/source-ci.yml` is the active CI entry point for the
  repository-root workspace. The older workflow under `.github` remains a
  source-local reference and is not the root GitHub Actions entry point.

#### Accepted Future-Version Arrecadacao Scope

Arrecadacao Previdenciaria remains later-version scope. It is outside current
route, menu, DB, frontend, backend, authorization, and test gates until
`docs/eng` explicitly reinstates it as current scope.

#### Current-Scope Blockers

No absent SGP-owned M1 blocker is currently known. Remaining M1 feature-audit
pressure is partial operator/API evidence for N.06 PCMAT and N.07 CIPA.

### Deferred Scope

The following items are intentionally postponed by `docs/eng` decisions and are
not current implementation blockers:

- Admin frontend tree, generic admin backend/db scaffolds, and administrative
  route installation, delegated to `../stynx`.
- Gov.BR/Cognito identity provider integration and administrative identity
  management, delegated to `../stynx`; SGP consumes Stynx-issued actor/session
  claims.
- Arrecadacao Previdenciaria.
- Real eSocial runtime, production certificates, return parsing, totalizers,
  retries, DLQ, and homologation, delegated to `../stynx-esocial`.
- Real CMS/PKCS#7/PAdES signing and production Gov.br advanced-signature
  provider integration.
- Licença-prêmio accrual balance, interruptions, pecuniary conversion, and
  payroll/reflex calculation policy.
- Object-level malware scanning and quarantine, delegated to `../stynx` storage.
- Real TCE/AUDESP/state-court submission and accepted Siconfi/SIOPE/SIOPS
  transmission; SGP owns deterministic mocks/contracts unless a future owner
  decision reopens a real connector.
- Release/homologation gates such as Pact, scanners, and production observability
  enforcement.

### Remaining Open Work

Open work is limited to partial SGP-owned evidence and deferred
product/operations decisions:

- Add focused operator/API evidence for PCMAT and CIPA.
- Keep feature-audit scratch matrix/report refresh discipline after future
  retained closure evidence lands.
- Coordinate admin, identity, and storage platform work in `../stynx`.
- Coordinate eSocial runtime and homologation in `../stynx-esocial`.
- Coordinate DET runtime in the external DET service boundary.
- Replace the internal PAdES/Gov.br evidence adapters with owner-selected real
  providers when that scope is scheduled.
- Decide the licença-prêmio payroll policy before adding accrual balance or
  payment/conversion logic.
- Expand beyond the source CI baseline into full release/homologation gates when
  the postponed gate scope is approved.

### Notes

- Old audit-derived evidence snapshots were removed because they were stale.
  Current verification should be produced from live commands instead of relying
  on archived artifacts.
- `docs/eng` remains the authoritative source for SGP v0.0.1 scope and
  acceptance.
