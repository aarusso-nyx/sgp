# STYNX and DEVAI Adoption Inventory

Baseline: 2026-07-11, SHA `9364dea6b4f6b25da98497bacab1c82327184d49`.

## Call-site matrix

| Concern                                  | Current call sites                                                                      | Current STYNX use                                                                                         | Pre-cutover contract                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| DB/RLS and tenancy                       | `backend/src/database/`, `backend/src/stynx/`, `database/sql/`, `tests/rls/`            | STYNX DB-context contract active through the SGP transaction-local adapter; tenancy UUID decision blocked | tenant context is required for queries; canonical RLS/alignment gates                |
| Auth/authz/context                       | `backend/src/auth/`, `backend/src/iam/`, `backend/src/stynx/`                           | STYNX auth and authorization modules composed with Cognito, permission and general UUID tenant adapters   | global positive/negative auth, permission metadata, actor/request/tenant propagation |
| Sessions                                 | `backend/src/auth/session/`                                                             | Cognito retained as session authority by ADR-035; no second STYNX signing runtime                         | authenticated/anonymous session DTO and browser token lifecycle                      |
| Audit                                    | `backend/src/audit/`, `backend/src/common/audit/`, `backend/src/stynx/`                 | STYNX audit sink composed with the immutable SGP SQL writer                                               | append-only/redacted actor, tenant and request metadata; required mutation audit     |
| Storage                                  | `backend/src/documents/`, `backend/src/stynx/`                                          | STYNX object-storage contract bound to the SGP S3/key-policy adapter                                      | authorized S3 presign, key policy, registration and audit behavior                   |
| Logging/privacy                          | `backend/src/common/logging/`, `backend/src/common/observability/`, `docs/gov/privacy/` | shared STYNX composition active; SGP logger remains authoritative until Wave 4                            | structured request/trace fields and governed PII redaction                           |
| Health                                   | `backend/src/health/`, `backend/src/common/bootstrap/worker-readiness-probe.ts`         | shared STYNX health composition active in all six backend runtimes                                        | API liveness/readiness plus worker probe and eight-runtime topology                  |
| Rate limit                               | `backend/src/common/rate-limit/` and runtime bootstraps                                 | STYNX package declared; Nest throttler is active                                                          | configured route limits and `429` behavior                                           |
| Idempotency                              | `backend/src/common/idempotency/`, payroll and worker idempotency paths                 | STYNX package declared but not imported                                                                   | tenant-scoped reserve/replay/conflict and deterministic worker keys                  |
| i18n                                     | backend messages and `frontend/src/app/core/i18n/`                                      | STYNX packages declared but not imported                                                                  | `pt-BR` product messages and frontend extraction/check                               |
| Frontend auth/tenant                     | `frontend/src/app/shared/stynx-runtime-config.ts`, guards/interceptors in both apps     | angular-auth and angular-tenancy active                                                                   | login callback, token injection, permissions and tenant switching                    |
| Frontend UI/storage/profile/sessions/SDK | Admin/Portal feature and API layers                                                     | declared but no direct imports found                                                                      | unit suites, generated clients and Playwright journeys                               |
| PDF/signature/integrations               | report service, recruitment signing and integration worker adapters                     | PDF, PDF/A, signature, feature flags and integration adapter active                                       | byte-sensitive goldens, conformance, signature and deterministic provider tests      |
| DEVAI                                    | `.devai/config/` and retained `.devai/state/`                                           | exact CLI and dispatcher-backed inventory/sensor/scorecard pipeline active                                | generated governance state remains reproducible                                      |

Package presence without an import or runtime provider is classified as
declared-only, not adopted.

## Runtime and parity baseline

`npm run health:json` recognizes all eight implemented runtimes: Admin, Portal,
core API, portal API, payroll engine, integrations worker, report service, and
report worker. It is a topology/path check, not a live process probe. Wave 2
must add common boot and liveness/readiness/metrics probes for every runtime.

| Contract                                                              | Baseline command                                                          | Result                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| registry boundary                                                     | `npm run check:registry-dependencies`                                     | PASS                                                                    |
| governance and DEVAI config shape                                     | `npm run governance:check`                                                | PASS                                                                    |
| runtime topology                                                      | `npm run health:json`                                                     | PASS, 8/8 implemented                                                   |
| backend context/auth/audit/storage/PDF/signature/worker unit behavior | `npm run test:backend -- --runInBand`                                     | PASS, 349 suites, 3,844 tests, 27 snapshots                             |
| Admin behavior                                                        | `npm run test:admin`                                                      | PASS, 41 files, 111 tests; locale fallback warning retained             |
| Portal behavior                                                       | `npm run test:portal`                                                     | PASS, 17 files, 76 tests                                                |
| OpenAPI route alignment                                               | `npm run api:alignment:check -- --json`                                   | PASS, 480 implemented documented routes, no missing/runtime-only routes |
| OpenAPI generated contract                                            | `npm run api:spec:check`                                                  | PASS                                                                    |
| static DB alignment                                                   | `npm run db:alignment:check -- --json`                                    | PASS, 150/150 canonicalized and 132 tenant-scoped tables declared       |
| disposable DB/RLS execution                                           | `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test:db` | PASS after aligning PostGIS extension installation with ADR-033         |

Live Playwright journeys were not run because the required application stack
was not started during this evidence-only wave. Their current test surfaces are
`tests/frontend/admin/admin-playwright.spec.ts` and
`tests/frontend/portal/portal-playwright.spec.ts`; Wave 5 must run them against
the composed applications.

## Wave 0 closure

The DB-backed parity exit criterion is met. The initial run exposed that
`database/sql/00-extensions.sql` installed PostGIS into a non-authoritative
schema. After correcting that canonical bootstrap to comply with ADR-033, the
same local disposable database reset, canonical SQL application, deterministic
seed, RLS, audit, idempotency, and domain smoke checks passed.
