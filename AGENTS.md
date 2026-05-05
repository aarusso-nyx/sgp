# AGENTS.md — SGP Repository Constitution

This file is the root agent protocol for SGP v0.0.1. It applies to every human
or autonomous agent working in this repository unless a more specific
subdirectory `AGENTS.md` exists.

Violations must be reported. Do not silently bypass these rules to make a task
look green.

## 1. Mission and Authority

Build and evolve a fresh SGP implementation from authoritative engineering
specs, with a folia-first payroll engine and no legacy compatibility runtime.

Authority order for SGP:

1. `docs/eng/` owns product behavior, architecture, domain scope, acceptance,
   ADRs, test strategy, and developer-facing regulatory facts.
2. Payroll-engine implementation decisions are folia-first. Use
   `docs/eng/domains/payroll-benefits.md` and the folia-derived design
   when reconciling payroll behavior.
3. Source code and executable tests prove whether an accepted behavior is
   actually implemented.
4. `docs/gov/audit/` owns current status, compiled audit context, functional and
   non-functional ledgers, inventories, diagnostics, and backlog status.
5. `docs/gov/` owns governance controls, generated surfaces, runtime topology,
   health/preflight rules, retained evidence, observability config, compliance
   readiness notes, and reusable round prompts under `docs/gov/prompts/`.
6. `docs/user/` owns user and operator instructions.
7. `docs/leg/sql-reference/` is legacy schema reference only.
8. `docs/leg/` is legacy, reverse-engineered, inventory, audit-history, and
   evidence archive material. It can inform analysis but cannot override
   `docs/eng/`.
9. `docs/work/` is ignored scratch space for materialized per-round prompts,
   audits, inventories, logs,
   and temporary reports. It is never acceptance authority.

When sources conflict:

- Prefer the higher authority source.
- Update lower authority docs/tests when implementation or accepted specs
  change.
- Do not weaken RBAC, tenant isolation, RLS, audit behavior, payroll correctness,
  or governance gates to satisfy stale docs or tests.
- Stop and ask for owner decision when a high-impact payroll conflict between
  folia behavior and `docs/eng/` remains unresolved.

## 2. Agent Operating Rules

- Inspect live repo state before non-trivial work: `git status --short --branch`,
  relevant source/docs, and the live `package.json` script surface.
- Preserve user and worker changes. Never revert unrelated dirty files unless
  explicitly asked.
- Keep diffs focused on the requested scope. Avoid opportunistic refactors.
- Keep code artifacts in English, including database physical names,
  API/runtime artifacts, TypeScript identifiers, scripts, and tests.
- Do not commit secrets, credentials, private keys, `.env` files with real
  values, or production data.
- Do not add backward-compatibility shims, legacy compatibility schemas, or
  transition aliases for v0.0.1.
- Prefer established local patterns and helpers over new abstractions. Add an
  abstraction only when it removes real duplication or matches an existing
  boundary.
- Use stubs, mocks, sandbox adapters, contract fixtures, or golden files for
  eSocial, ICP-Brasil, GovBR, TCE, banking, SIAFIC, storage, and other external
  integrations unless the user explicitly requests real-service tests.
- Public contract changes require matching code, tests, generated/client
  alignment, and docs updates.
- If a task exposes an unresolved owner decision, record it in the appropriate
  live docs or scratch prompt context and continue only with unrelated safe work.

## 3. devai Governance Boundary

SGP is the host Plant for devai-style governance. Keep the boundary clear:

- Plant: this repository, its source code, database, tests, runtime topology,
  local services, CI, and generated/runtime behavior.
- Semantic source: `docs/eng/` and accepted owner decisions.
- Constructor surfaces: implementation code, SQL, tests, scripts, and generated
  artifacts produced from accepted contracts.
- Sensors: lint, format, typecheck, unit/e2e/coverage tests, DB smoke/alignment,
  API alignment, governance check, health check, CI, runtime probes, and audit
  evidence.
- Host adapter: `devai.config.json`. It maps SGP paths and commands into the
  governance/control-plane model. It is not itself product semantics.
- Retained governance evidence: `docs/gov/**`.
- Current status and compiled context: `docs/gov/audit/**`.
- Reusable round prompts: `docs/gov/prompts/**`.
- Scratch evidence: `docs/work/**`.

devai concepts must not be used to rewrite SGP semantics silently. Constructor
work cannot redefine `docs/eng/`. Tests and sensors must report evidence, not
hide plant failures. Overrides, release decisions, and production readiness
claims require explicit owner authorization and retained evidence.

## 4. Repository Layout

| Path | Responsibility |
| --- | --- |
| `backend/` | NestJS backend workspace for core API, portal API, services, workers, backend tests, and runtime entrypoints. |
| `frontend/` | Angular workspace for `sgp-admin` and `sgp-portal`, frontend API clients, UI tests, and Playwright surfaces. |
| `database/sql/` | Canonical SQL packs for schemas, RLS, functions, grants, seeds, FK/index hardening, and PII/audit data controls. |
| `database/seed/` | Deterministic non-secret seed fixtures and seed documentation. |
| `scripts/` | Authoritative orchestration scripts. `scripts/run.mjs` is the root dispatcher; shared command/gate metadata lives under `scripts/lib/`. |
| `tests/backend/` | Backend e2e and Jest configuration surfaces. |
| `tests/rls/` | Executable tenant/RLS isolation specs. |
| `.github/workflows/` | Repository CI workflows using the canonical root commands. |
| `docs/eng/` | Product, engineering, architecture, ADR, acceptance, domain behavior, and developer-fact authority. |
| `docs/gov/audit/` | Current implementation status, compiled audit context, ledgers, inventories, diagnostics, and backlog tracking. |
| `docs/gov/generated/` | Machine-generated governance surfaces such as runtime topology, governance manifest, route alignment, and database alignment. |
| `docs/gov/prompts/` | Reusable B0-B3 phase prompts for the measure-plan-execute-compare loop. |
| `docs/gov/` | Governance controls, health/preflight, compliance, observability config, generated surfaces, retained evidence, and reusable prompts. |
| `docs/user/` | User/operator setup, environment, testing, and runtime guidance. |
| `docs/leg/` | Legacy and reverse-evidence archive. |
| `docs/work/` | Ignored scratch for audits, prompts, inventories, and temporary working notes. |

Runtime topology is tracked in `docs/gov/generated/runtime-topology.json`. Keep runtime
names aligned with that file and root commands.

## 5. Backend Rails

- Backend runtime is NestJS. Keep controllers thin and put business behavior in
  services/providers.
- Entry surfaces include `sgp-core-api`, `sgp-portal-api`,
  `sgp-payroll-engine`, `sgp-integrations-worker`, `sgp-report-worker`, and
  `sgp-report-service`. eSocial processing runs outside SGP in
  `stynx-esocial`; SGP keeps only the `public.esocial_spool` gateway boundary.
- Preserve tenant context, RLS posture, RBAC decorators/guards, audit events,
  request IDs, and PII redaction when touching protected routes or services.
- DTOs and validation live at API boundaries. Avoid `any`; use precise types or
  `unknown` plus narrowing.
- Keep OpenAPI decorators, generated OpenAPI/client surfaces, route alignment,
  and tests in sync for API contract changes.
- Standardize error behavior through existing envelopes/helpers. Do not change
  public status codes or DTO wire shapes without authority from `docs/eng/`.
- Worker and external-integration behavior must be idempotent and observable.
  Use deterministic fake/sandbox adapters in tests unless real integration work
  is explicitly requested.
- Structured logs must not include secrets or raw PII. Audit logs must remain
  append-oriented and traceable.

## 6. Database Rails

- Canonical SQL lives under `database/sql`. Do not create alternate legacy
  schemas or compatibility database layers.
- Canonical SQL and database-facing runtime code must remain aligned with
  accepted behavior; use the canonical DB alignment scripts before claiming
  parity.
- Local DB-backed tests and smoke checks use:

```bash
DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test
```

- Database changes must consider tenant isolation, RLS policies, FK/index
  coverage, audit columns, deterministic seeds, and PII encryption/tagging.
- Do not run destructive migrations, production data repair, or retention-policy
  changes without explicit owner direction.
- Seeds and fixtures must be deterministic and contain no sensitive production
  data.

## 7. Frontend Rails

- `frontend/` contains the Angular admin and portal projects. Keep admin and
  portal boundaries clear.
- Prefer modern Angular patterns already adopted in the repo: standalone-style
  feature boundaries, OnPush/signals where established, and generated API
  clients over hand-rolled HTTP contracts.
- Route guards, role/permission checks, API clients, and user-visible flows must
  stay aligned with backend contracts and `docs/eng/experience.md`.
- User-facing behavior changes require relevant tests and docs/user updates when
  operator instructions change.
- Do not hardcode secrets, tenant IDs, production URLs, or credentials in UI
  code or fixtures.
- Use Playwright/admin/portal gates when changing routed UI behavior.

## 8. Canonical Commands

Run commands from the repository root. Root `package.json` is a thin entrypoint
layer over `scripts/run.mjs`; do not add retired aliases.

Core commands:

```bash
npm run build
npm run build:admin
npm run build:portal
npm run build:backend
npm run start
npm run start:admin
npm run start:portal
npm run start:core-api
npm run start:portal-api
npm run start:payroll-engine
npm run start:integrations-worker
npm run start:report-worker
npm run start:report-service
```

Quality gates:

```bash
npm run lint
npm run lint:check
npm run format
npm run format:check
npm run typecheck
npm run governance:check
npm run health:json
```

Tests:

```bash
npm run test
npm run test:backend
npm run test:db
npm run test:e2e
npm run test:coverage
npm run test:admin
npm run test:portal
npm run test:admin:e2e
npm run test:portal:e2e
npm run test:frontend:e2e
npm run test:frontend:coverage
npm run test:qa
npm run test:qa:api
npm run test:qa:frontend
```

Database, alignment, governance, and operations:

```bash
npm run db -- help
npm run db:migrate
npm run db:seed
npm run db:smoke
npm run db:alignment:check -- --json
npm run db:fk-coverage:check
npm run db:push:guard
npm run api:alignment:sync
npm run api:alignment:check -- --json
npm run api:operation:check
npm run api:spec:check
npm run api:client:generate
npm run evidence:check
npm run qa:bootstrap
npm run qa:smoke:urls
npm run deploy -- --dry-run
npm run clean
```

Before diagnosing script failures, inspect `scripts/run.mjs`,
`scripts/lib/workspace-commands.mjs`, and `scripts/README.md`.

## 9. Documentation Policy

- Behavior changes update `docs/eng/`.
- Current status, implementation ledgers, compiled context, and audit snapshots
  update `docs/gov/audit/`.
- Governance control, topology, compliance, health, audit, or observability
  changes update `docs/gov/`.
- Reusable round-loop prompt changes update `docs/gov/prompts/`.
- Operator or user workflow changes update `docs/user/`.
- Legacy, reverse-engineered, old-spec, crawler, audit-history, inventory, and
  diagnostic material stays under `docs/leg/`.
- Reverse evidence must be succeeded into `docs/eng/` before it becomes current
  product/runtime truth. Track reverse-doc deprecation coverage in
  `docs/leg/rev-eng/deprecation-status.md`.
- Scratch prompts, generated temporary inventories, logs, and round audits stay
  under `docs/work/` and must not be cited as authoritative acceptance.
- Do not reintroduce stale docs paths. Current live roots are `docs/eng`,
  `docs/gov`, `docs/user`, `docs/leg`, and `docs/work`.
- Run `npm run governance:check` after docs path or backticked-reference
  changes.

## 10. Tests and Evidence

- Prefer focused tests first, then broaden to the relevant gate.
- Do not lower coverage thresholds or exclude active runtime/domain code to make
  coverage pass.
- Do not weaken tests to hide plant failures. If a test is stale, update it with
  an explanation tied to `docs/eng/` or live behavior.
- RBAC and protected-route work needs positive and negative authorization tests.
- Tenant/RLS changes need DB-backed tests against the local `sgp_test` database.
- Regulatory outputs, banking files, PDFs, XML, and TCE/SIAFIC/eSocial payloads
  should use deterministic fixtures or goldens.
- Treat snapshot and golden changes as contract changes; review them
  intentionally.
- Avoid duplicate long-running coverage jobs. Use targeted Jest/e2e commands for
  fix-up loops and run one broad coverage gate when needed.

## 11. Commit, Merge, and Publish Rules

- Commit, merge, push, or open PRs only when explicitly requested.
- Stage only files you changed or can attribute to the current task. Use
  full-tree staging only when the user explicitly asks to publish all changes.
- Before committing, inspect staged paths and staged diff for secrets,
  credentials, private keys, `.env` additions, and unrelated changes.
- Use concise commit messages in imperative style; include scope when helpful.
- Do not force-push `main` or rewrite published history without explicit
  authorization.
- After push, verify the intended branch and remote SHA when the user asks for
  publication or acceptance evidence.

## 12. Prohibited Actions

- Do not commit secrets, credentials, production data, or real `.env` values.
- Do not bypass auth, RBAC, tenant isolation, RLS, audit, validation, or
  governance checks to get a green result.
- Do not add compatibility shims, legacy schemas, retired command aliases, or
  transitional APIs for v0.0.1.
- Do not treat `docs/work/**` or `docs/leg/**` as acceptance authority.
- Do not hardcode external-service credentials, production endpoints, tenant
  IDs, or date-sensitive regulatory assumptions.
- Do not add large dependencies or new external-service SDKs without checking
  license, size, maintenance, and whether an existing repo pattern already
  covers the need.
- Do not normalize byte-sensitive `.rem`, `.ret`, XML, TXT, PDF, banking, or
  regulatory golden fixtures unless the relevant spec/test requires it.
