# Scripts Reference

## Name

SGP workspace scripts - operator and contributor command reference for the root
dispatcher, npm aliases, QA/bootstrap flows, database helpers, generated
artifacts, audit helpers, and governance checks.

## Synopsis

```bash
npm run <script-name> -- [script-specific-arguments]
node scripts/run.mjs <command> [subcommand] [options]
node scripts/<family>.mjs <subcommand> [options]
```

Run commands from the repository root unless a command explicitly says it is a
workspace command. Root npm scripts are thin entrypoints over
`scripts/run.mjs`.

## Description

The authoritative command surface is the root dispatcher:

```bash
node scripts/run.mjs <command> [subcommand] [options]
```

Root `package.json` exposes stable npm aliases for common workflows. Family
entrypoints under `scripts/` own human-facing command groups. Implementation
helpers live under `scripts/lib/` and are not operator entrypoints unless this
document says otherwise.

Use `--` after `npm run <script>` when passing options through npm:

```bash
npm run db:fk-coverage:check -- --json
npm run audit:hotspots -- --baseline <sha>
npm run qa:bootstrap -- --database-url postgresql://$USER@localhost:5432/sgp_test
```

## Files

| Path                                 | Role                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `package.json`                       | Root npm entrypoint surface.                                              |
| `scripts/run.mjs`                    | Main dispatcher for root commands.                                        |
| `scripts/audit.mjs`                  | Audit helper family.                                                      |
| `scripts/check-api.mjs`              | API alignment and OpenAPI check family.                                   |
| `scripts/check-db.mjs`               | Database alignment, FK coverage, and DB push guard family.                |
| `scripts/check-evidence.mjs`         | Evidence gate wrapper.                                                    |
| `scripts/check-frontend.mjs`         | Frontend policy check family.                                             |
| `scripts/db.mjs`                     | Database lifecycle implementation helper family.                          |
| `scripts/generate.mjs`               | Generated artifact family.                                                |
| `scripts/qa.mjs`                     | QA bootstrap and smoke URL helper family.                                 |
| `scripts/clean.mjs`                  | Local generated-output cleanup helper.                                    |
| `scripts/lib/workspace-commands.mjs` | Shared descriptions, format targets, hard-fail gates, and evidence steps. |

## Exit Status

| Code | Meaning                                                                                                           |
| ---- | ----------------------------------------------------------------------------------------------------------------- |
| 0    | Command completed successfully.                                                                                   |
| 1    | Validation failed, command arguments were invalid, a child command failed, or required configuration was missing. |
| 130  | QA bootstrap was interrupted with SIGINT.                                                                         |
| 143  | QA bootstrap or long-running services received SIGTERM during teardown.                                           |

Some QA/evidence commands distinguish "blocked" from "failed" in logs, but they
still return a non-zero exit code when required live services or environment
variables are missing.

## Environment

| Variable                          | Used By                                                                     | Meaning                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | DB migrate, DB smoke, backend e2e, backend coverage, QA bootstrap, evidence | PostgreSQL URL. Local DB-backed tests conventionally use `postgresql://$USER@localhost:5432/sgp_test`.          |
| `AUTH_ALLOW_UNSIGNED_TEST_TOKENS` | QA bootstrap, backend QA smoke                                              | Enables local unsigned test tokens when bootstrapping live QA services. Defaults to `true` inside QA bootstrap. |
| `QA_API_BASE_URL`                 | QA smoke, evidence                                                          | Backend API base URL.                                                                                           |
| `API_BASE_URL`                    | QA smoke                                                                    | Fallback backend API base URL.                                                                                  |
| `QA_ADMIN_FRONTEND_BASE_URL`      | QA smoke, evidence                                                          | Admin frontend base URL.                                                                                        |
| `QA_FRONTEND_BASE_URL`            | QA smoke                                                                    | Legacy fallback for admin frontend URL.                                                                         |
| `FRONTEND_BASE_URL`               | QA smoke                                                                    | Fallback admin frontend URL.                                                                                    |
| `QA_PORTAL_FRONTEND_BASE_URL`     | QA smoke, evidence                                                          | Portal frontend base URL.                                                                                       |
| `PORTAL_FRONTEND_BASE_URL`        | QA smoke                                                                    | Fallback portal frontend URL.                                                                                   |
| `OPENAPI_CORE_PORT`               | OpenAPI client generation                                                   | Temporary core API port. Default: 3300.                                                                         |
| `OPENAPI_PORTAL_PORT`             | OpenAPI client generation                                                   | Temporary portal API port. Default: 3301.                                                                       |
| `OPENAPI_WAIT_TIMEOUT_MS`         | OpenAPI client generation                                                   | Wait timeout for generated OpenAPI JSON. Default: 30000.                                                        |
| `SGP_DB_ALIGNMENT_PHASE`          | DB alignment check                                                          | Alignment phase to inspect. Default: `full_closure`.                                                            |
| `GITHUB_BASE_REF`                 | DB push guard                                                               | GitHub base branch used to derive the diff range in CI.                                                         |

## Root Dispatcher

### Name

`scripts/run.mjs` - root workspace dispatcher.

### Synopsis

```bash
node scripts/run.mjs help
node scripts/run.mjs <command> [subcommand] [options]
```

### Commands

| Command         | Description                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| `help`          | Print dispatcher help.                                                                      |
| `build`         | Build frontend admin, frontend portal, and backend.                                         |
| `start`         | Start local development runtimes.                                                           |
| `lint`          | Run fix-mode lint, or check-mode lint with `check`.                                         |
| `format`        | Run Prettier write mode, or check mode with `check`.                                        |
| `typecheck`     | Run frontend and backend TypeScript checks.                                                 |
| `test`          | Run unit, workspace, e2e, coverage, DB, and QA tests.                                       |
| `check`         | Run cross-cutting checks. Currently evidence only.                                          |
| `db`            | Run database lifecycle and database checks.                                                 |
| `api`           | Run API alignment, OpenAPI checks, and client generation.                                   |
| `qa`            | Run QA bootstrap and live URL checks.                                                       |
| `audit`         | Run governance audit extractors.                                                            |
| `governance`    | Run repository governance validation.                                                       |
| `health`        | Run non-destructive runtime topology and path health checks.                                |
| `deploy`        | Validate deployment plan arguments. Dry-run by default.                                     |
| `clean`         | Remove local generated outputs and caches.                                                  |
| `audit:<name>`  | Npm-compatible audit aliases handled by the dispatcher.                                     |
| `evidence-step` | Run one named evidence step from `scripts/lib/workspace-commands.mjs`. Diagnostic use only. |

## Build Commands

### Synopsis

```bash
npm run build
npm run build:admin -- [frontend build args]
npm run build:portal -- [frontend build args]
npm run build:backend -- [backend build args]
node scripts/run.mjs build [all|admin|portal|backend] [args]
```

### Actions

| Action    | Npm Alias               | Behavior                                                                            |
| --------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `all`     | `npm run build`         | Runs admin build, portal build, then backend build.                                 |
| `admin`   | `npm run build:admin`   | Runs frontend workspace `build:admin`.                                              |
| `portal`  | `npm run build:portal`  | Runs frontend workspace `build:portal`.                                             |
| `backend` | `npm run build:backend` | Runs backend workspace `build`. Backend `prebuild` regenerates permission catalogs. |

### Parameters

Arguments after the action are passed through to the workspace script. Example:

```bash
npm run build:admin -- --configuration production
node scripts/run.mjs build backend -- --verbose
```

## Start Commands

### Synopsis

```bash
npm run start
npm run start:admin -- [ng serve args]
npm run start:portal -- [ng serve args]
npm run start:core-api
npm run start:portal-api
npm run start:payroll-engine
npm run start:esocial-worker
npm run start:integrations-worker
npm run start:report-worker
npm run start:report-service
node scripts/run.mjs start [all|admin|portal|core-api|portal-api|payroll-engine|esocial-worker|integrations-worker|report-worker|report-service] [args]
```

### Actions

| Action                | Npm Alias                           | Runtime                                                                                          |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `all`                 | `npm run start`                     | Starts core API, portal API, admin, and portal together.                                         |
| `admin`               | `npm run start:admin`               | Starts `sgp-admin` on 127.0.0.1:4200 by default.                                                 |
| `portal`              | `npm run start:portal`              | Starts `sgp-portal` on 127.0.0.1:4300 by default.                                                |
| `core-api`            | `npm run start:core-api`            | Starts backend core API with `APP_SERVICE_NAME=sgp-core-api`.                                    |
| `portal-api`          | `npm run start:portal-api`          | Starts backend portal API with `APP_SERVICE_NAME=sgp-portal-api`.                                |
| `payroll-engine`      | `npm run start:payroll-engine`      | Starts payroll engine with `APP_SERVICE_NAME=sgp-payroll-engine` and `PAYROLL_ENGINE_PORT=3302`. |
| `esocial-worker`      | `npm run start:esocial-worker`      | Starts eSocial worker.                                                                           |
| `integrations-worker` | `npm run start:integrations-worker` | Starts integrations worker.                                                                      |
| `report-worker`       | `npm run start:report-worker`       | Starts report worker.                                                                            |
| `report-service`      | `npm run start:report-service`      | Starts report service with `REPORT_SERVICE_PORT=3305`.                                           |

### Signals

For `start all`, SIGINT and SIGTERM stop all child processes. If one child
exits non-zero, the dispatcher terminates the group.

## Quality Commands

### Synopsis

```bash
npm run lint
npm run lint:check
npm run format
npm run format:check
npm run typecheck
node scripts/run.mjs lint [check]
node scripts/run.mjs format [check]
node scripts/run.mjs typecheck
```

### Actions

| Command                | Behavior                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`         | Runs frontend lint/fix policy checks and backend ESLint fix mode.                                                                  |
| `npm run lint:check`   | Runs frontend checks, backend ESLint check mode, test-debt guard, API operation decorator check, and OpenAPI generated-spec check. |
| `npm run format`       | Runs frontend formatter, backend formatter, then root workspace format targets.                                                    |
| `npm run format:check` | Checks formatting across frontend, backend, root docs, scripts, tests, infra, and root config targets.                             |
| `npm run typecheck`    | Runs frontend TypeScript checks and backend `tsconfig.build.json` check.                                                           |

## Test Commands

### Synopsis

```bash
npm run test
npm run test:admin
npm run test:portal
npm run test:backend -- [jest args]
npm run test:db
npm run test:e2e -- [jest args]
npm run test:coverage -- [jest args]
npm run test:frontend:coverage
npm run test:frontend:e2e
npm run test:qa
npm run test:qa:api
npm run test:qa:frontend
node scripts/run.mjs test <subcommand> [args]
```

### Actions

| Subcommand        | Npm Alias                        | Behavior                                                                           |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `unit`            | `npm run test`                   | Runs frontend admin tests, frontend portal tests, then backend Jest unit tests.    |
| `admin`           | `npm run test:admin`             | Runs frontend admin tests.                                                         |
| `portal`          | `npm run test:portal`            | Runs frontend portal tests.                                                        |
| `admin-e2e`       | `npm run test:admin:e2e`         | Runs admin Playwright suite.                                                       |
| `portal-e2e`      | `npm run test:portal:e2e`        | Runs portal Playwright suite.                                                      |
| frontend-e2e      | `npm run test:frontend:e2e`      | Runs admin and portal Playwright suites.                                           |
| `backend`         | `npm run test:backend`           | Runs backend Jest unit tests. Extra args are passed to Jest.                       |
| `db`              | `npm run test:db`                | Runs DB bootstrap smoke via `scripts/db.mjs bootstrap-smoke`.                      |
| `e2e`             | `npm run test:e2e`               | Runs backend Jest e2e tests with local test database env defaulting to `sgp_test`. |
| `coverage`        | `npm run test:coverage`          | Runs backend coverage with local test database env defaulting to `sgp_test`.       |
| frontend-coverage | `npm run test:frontend:coverage` | Runs Angular coverage for admin and portal.                                        |
| `qa`              | `npm run test:qa`                | Runs black-box API and frontend QA smoke suites.                                   |
| `qa-api`          | `npm run test:qa:api`            | Runs `tests/backend/api` and `tests/backend/e2e` Node tests.                       |
| `qa-frontend`     | `npm run test:qa:frontend`       | Runs `tests/frontend/e2e` Node tests.                                              |

## Database Commands

### Synopsis

```bash
npm run db -- help
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:smoke
npm run db:studio
npm run db:alignment:check -- --json
npm run db:fk-coverage:check -- --json
npm run db:fk-coverage:write
npm run db:push:guard -- --range <git-range>
node scripts/run.mjs db <subcommand> [options]
node scripts/check-db.mjs <family> <action> [options]
node scripts/db.mjs <apply-sql|bootstrap-smoke>
```

### Actions

| Subcommand          | Npm Alias                      | Behavior                                                                                                                      |
| ------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `generate`          | `npm run db:generate`          | Runs Prisma generate in backend workspace.                                                                                    |
| `migrate`           | `npm run db:migrate`           | Applies Prisma migrations, then canonical SQL files from `database/sql/`. Requires `DATABASE_URL`.                            |
| `seed`              | `npm run db:seed`              | Runs backend deterministic seed.                                                                                              |
| `smoke`             | `npm run db:smoke`             | Runs DB bootstrap smoke. Uses local `sgp_test` by default when no `DATABASE_URL` is set by the dispatcher.                    |
| `studio`            | `npm run db:studio`            | Opens Prisma Studio in backend workspace.                                                                                     |
| `alignment check`   | `npm run db:alignment:check`   | Validates generated database alignment matrix, Prisma/schema posture, RLS, tenant coverage, and forbidden runtime references. |
| `fk-coverage check` | `npm run db:fk-coverage:check` | Validates FK and leading-column index coverage from canonical SQL.                                                            |
| `fk-coverage write` | `npm run db:fk-coverage:write` | Rewrites generated FK/index SQL support files. Review generated SQL diffs intentionally.                                      |
| `push-guard`        | `npm run db:push:guard`        | Scans added diff lines for forbidden `prisma db push --force-reset`.                                                          |

### Parameters

| Option                | Commands                                     | Meaning                          |
| --------------------- | -------------------------------------------- | -------------------------------- |
| `--json`              | `db:alignment:check`, `db:fk-coverage:check` | Emit machine-readable JSON.      |
| `--range <git-range>` | `db:push:guard`                              | Explicit git diff range to scan. |

### Notes

`db:smoke` is destructive only for a local disposable database whose URL path is
`/sgp_test` and whose host is localhost, 127.0.0.1, or ::1. It resets schemas,
applies SQL, validates RLS and partition coverage, runs seed, and performs
schema/RLS assertions.

## API Commands

### Synopsis

```bash
npm run api:alignment:sync
npm run api:alignment:check -- --json
npm run api:operation:check
npm run api:spec:check
npm run api:client:generate
node scripts/run.mjs api <alignment|operation|spec|client> <action> [options]
node scripts/check-api.mjs <alignment sync|alignment check|operation check|spec check> [options]
node scripts/generate.mjs openapi-client
```

### Actions

| Subcommand        | Npm Alias                     | Behavior                                                                                                             |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `alignment sync`  | `npm run api:alignment:sync`  | Rebuilds generated API route alignment JSON from current docs and backend controllers.                               |
| `alignment check` | `npm run api:alignment:check` | Validates generated API route alignment JSON.                                                                        |
| `operation check` | `npm run api:operation:check` | Ensures controller route handlers declare `@ApiOperation`.                                                           |
| `spec check`      | `npm run api:spec:check`      | Validates generated OpenAPI specs are OpenAPI 3.1 and include documented 2xx/4xx contracts.                          |
| `client generate` | `npm run api:client:generate` | Builds backend, starts generated backend dist entrypoints, pulls OpenAPI JSON, and regenerates frontend API clients. |

### Parameters

| Option or Env             | Commands              | Meaning                                  |
| ------------------------- | --------------------- | ---------------------------------------- |
| `--json`                  | `api:alignment:check` | Emit machine-readable JSON.              |
| `OPENAPI_CORE_PORT`       | `api:client:generate` | Temporary core API port.                 |
| `OPENAPI_PORTAL_PORT`     | `api:client:generate` | Temporary portal API port.               |
| `OPENAPI_WAIT_TIMEOUT_MS` | `api:client:generate` | Wait timeout for generated OpenAPI JSON. |

## Frontend Check Commands

### Synopsis

```bash
node scripts/check-frontend.mjs [all|api-client|modern-angular|i18n] [--help]
npm --workspace frontend run lint
npm --workspace frontend run lint:check
npm --workspace frontend run i18n:check
```

### Actions

| Action           | Behavior                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `all`            | Runs all frontend policy checks. Default when no action is provided.                                        |
| `api-client`     | Fails on raw `this.http.get/post/put/patch/delete` calls outside allowed API client files.                  |
| `modern-angular` | Enforces OnPush component posture, subscribe-site ceiling, and signal adoption baseline.                    |
| `i18n`           | Validates Angular localize setup, extracted catalogs, English target catalog, and template marker coverage. |

## QA Commands

### Synopsis

```bash
npm run qa:bootstrap -- [options]
npm run qa:smoke:urls -- [--json] [--check]
node scripts/run.mjs qa <bootstrap|smoke:urls> [options]
node scripts/qa.mjs <bootstrap|smoke-urls> [options]
```

### Bootstrap Options

| Option                 | Meaning                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `--database-url <url>` | DATABASE_URL for live backend services. Required unless `DATABASE_URL` is already set. |
| `--prepare-db`         | Run `db:migrate` and `db:seed` before starting services.                               |
| `--evidence`           | Run `evidence:check` after services are ready instead of `test:qa`.                    |
| `--keep-alive`         | Start services and wait, but do not run tests. Use Ctrl-C to stop.                     |
| `--timeout-ms <ms>`    | Readiness timeout per target. Default: 120000.                                         |
| `--help`               | Print help.                                                                            |

### Smoke URL Options

| Option    | Meaning                                             |
| --------- | --------------------------------------------------- |
| `--json`  | Emit JSON with configured and missing URL groups.   |
| `--check` | Exit non-zero when required URL groups are missing. |

### URL Groups

QA smoke checks accept these environment variables:

| Group                     | Accepted Variables                                                        | Example                 |
| ------------------------- | ------------------------------------------------------------------------- | ----------------------- |
| API smoke                 | `QA_API_BASE_URL`, `API_BASE_URL`                                         | `http://127.0.0.1:3000` |
| Backend auth/domain smoke | `QA_API_BASE_URL`, `API_BASE_URL`                                         | `http://127.0.0.1:3000` |
| Admin frontend smoke      | `QA_ADMIN_FRONTEND_BASE_URL`, `QA_FRONTEND_BASE_URL`, `FRONTEND_BASE_URL` | `http://127.0.0.1:4200` |
| Portal frontend smoke     | `QA_PORTAL_FRONTEND_BASE_URL`, `PORTAL_FRONTEND_BASE_URL`                 | `http://127.0.0.1:4300` |

## Audit Commands

### Synopsis

```bash
npm run audit:schema -- [options]
npm run audit:api -- [options]
npm run audit:fr -- [options]
npm run audit:tests -- [options]
npm run audit:hotspots -- (--baseline <sha> | --prev-round)
npm run audit:backlog -- --closure <path>
npm run audit:pvd -- [options]
npm run audit:all -- [options]
node scripts/run.mjs audit <schema|api|fr|tests|hotspots|backlog|pvd|live-data|all> [options]
node scripts/audit.mjs <schema|api|fr|tests|hotspots|backlog|pvd|live-data|all> [options]
```

### Actions

| Action      | Npm Alias                | Behavior                                                                                   |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `schema`    | `npm run audit:schema`   | Parses canonical SQL DDL and emits schema digest artifacts.                                |
| `api`       | `npm run audit:api`      | Renders API route surface from generated route alignment and records drift checks.         |
| `fr`        | `npm run audit:fr`       | Refreshes functional requisite status and writes per-round delta.                          |
| `tests`     | `npm run audit:tests`    | Builds a static test coverage map from spec files and FR IDs.                              |
| `hotspots`  | `npm run audit:hotspots` | Aggregates git churn since a baseline. Requires `--baseline` or resolvable `--prev-round`. |
| `backlog`   | `npm run audit:backlog`  | Applies a round closure file to the backlog ledger. Not included in `audit:all`.           |
| `pvd`       | `npm run audit:pvd`      | Validates promise-vs-delivery evidence references.                                         |
| `live-data` | none                     | Generates a scratch live PostgreSQL data inventory under `docs/work/`.                     |
| `all`       | `npm run audit:all`      | Runs schema, API, FR, tests, hotspots, and promise-vs-delivery in order.                   |

### Common Options

| Option                 | Meaning                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `--help`               | Print family or helper help.                                                     |
| `--dry-run`            | Print intended writes without writing files.                                     |
| `--round <n>`          | Use an explicit round number. Defaults to highest `docs/work/round-N` directory. |
| `--output-root <path>` | Write committed audit outputs under a temporary or alternate root.               |
| `--repo-root <path>`   | Read from a temporary or fixture repository root.                                |

### Action-Specific Options

| Option             | Action            | Meaning                                            |
| ------------------ | ----------------- | -------------------------------------------------- |
| `--baseline <sha>` | `hotspots`        | Git baseline SHA for churn aggregation.            |
| `--prev-round`     | `hotspots`, `all` | Resolve the previous round baseline automatically. |
| `--closure <path>` | `backlog`         | Closure JSON file to apply.                        |
| `--output <path>`  | `live-data`       | Explicit live-data report path.                    |

## Generate Commands

### Synopsis

```bash
node scripts/generate.mjs openapi-client
node scripts/generate.mjs permissions
npm run api:client:generate
npm --workspace backend run prebuild
```

### Actions

| Action           | Trigger                       | Behavior                                                                                           |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `openapi-client` | `npm run api:client:generate` | Regenerates OpenAPI JSON and Angular API client files. The npm alias builds backend first.         |
| `permissions`    | Backend `prebuild`            | Regenerates backend and frontend permission catalogs from `database/seed/permission-catalog.json`. |

### Outputs

| Action           | Output                                                                        |
| ---------------- | ----------------------------------------------------------------------------- |
| `openapi-client` | OpenAPI JSON and client files under frontend generated API directories.       |
| `permissions`    | Backend permission catalog and frontend route permission map generated files. |

## Evidence and Governance Commands

### Synopsis

```bash
npm run evidence:check -- [options]
npm run governance:check
node scripts/run.mjs check evidence [options]
node scripts/run.mjs governance check
node scripts/run.mjs evidence-step <step-name>
```

### Evidence

`npm run evidence:check` runs the ordered evidence sequence defined in
`scripts/lib/workspace-commands.mjs`.

| Step                      | Command                                  |
| ------------------------- | ---------------------------------------- |
| `api-alignment-sync`      | `npm run api:alignment:sync`             |
| `api-alignment-check`     | `npm run api:alignment:check -- --json`  |
| `db-alignment-check`      | `npm run db:alignment:check -- --json`   |
| `runtime-health`          | `npm run health:json`                    |
| `lint-check`              | `npm run lint:check`                     |
| `format-check`            | `npm run format:check`                   |
| `typecheck`               | `npm run typecheck`                      |
| `openapi-client-generate` | `npm run api:client:generate`            |
| `build-all`               | `npm run build`                          |
| `unit-tests`              | `npm run test`                           |
| backend-e2e               | `npm run test:e2e`                       |
| frontend-e2e              | `npm run test:frontend:e2e`              |
| `db-smoke`                | `npm run test:db`                        |
| backend-coverage          | `npm run test:coverage`                  |
| frontend-coverage         | `npm run test:frontend:coverage`         |
| `governance-check`        | `npm run governance:check`               |
| `qa-smoke-url-config`     | `node scripts/qa.mjs smoke-urls --check` |
| `qa-smoke-live`           | `npm run test:qa`                        |

The steps backend-e2e, `db-smoke`, and backend-coverage require
`DATABASE_URL`. The QA smoke steps require the live base URL variables listed in
the QA section.

### Governance

`npm run governance:check` validates runtime pins, lockfile layout, governance
manifest controls, reverse-evidence succession, devai config, canonical root
scripts, executable RLS spec posture, live docs path references, and current
architecture state markers.

## Health Commands

### Synopsis

```bash
npm run health
npm run health:json
node scripts/run.mjs health [--json]
```

### Behavior

Health is non-destructive. It checks required workspace paths and runtime
topology entries from `docs/gov/generated/runtime-topology.json`. Use `--json`
for machine-readable status.

## Deploy Commands

### Synopsis

```bash
npm run deploy -- --dry-run
npm run deploy -- --target <stage|prod> --stack <name> [--apply]
npm run deploy:plan
npm run deploy:stage
npm run deploy:prod
node scripts/run.mjs deploy [--target <target>] [--stack <stack>] [--dry-run] [--apply]
```

### Options

| Option              | Default           | Meaning                                                                             |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `--target <target>` | `stage`           | Deployment target label.                                                            |
| `--stack <stack>`   | `all`             | Stack template group. Valid values: `all`, `cognito`, `rds`, `backend`, `frontend`. |
| `--dry-run`         | active by default | Print plan metadata and do not apply infrastructure.                                |
| `--apply`           | false             | Attempts apply mode. Currently blocked until templates are parameterized.           |

## Clean Commands

### Synopsis

```bash
npm run clean -- [--dry-run] [all|root|backend|frontend]
node scripts/run.mjs clean [--dry-run] [all|root|backend|frontend]
node scripts/clean.mjs [--dry-run] [all|root|backend|frontend]
```

### Targets

| Target     | Removes                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `all`      | Root, backend, and frontend generated outputs. Default target.                                                   |
| `root`     | Root dependency, cache, coverage, dist, generated, and TypeScript build-info outputs.                            |
| `backend`  | Backend dependency, dist, generated, coverage, cache, ESLint cache, and TypeScript build-info outputs.           |
| `frontend` | Frontend dependency, dist, Angular cache, coverage, Vite/cache, ESLint cache, and TypeScript build-info outputs. |

Use `--dry-run` before destructive cleanup:

```bash
npm run clean -- --dry-run backend
```

## Npm Script Index

### Build and Start

| Npm Script                  | Dispatcher Command                                                  |
| --------------------------- | ------------------------------------------------------------------- |
| `build`                     | `node scripts/run.mjs build`                                        |
| `build:admin`               | `node scripts/run.mjs build admin`                                  |
| `build:portal`              | `node scripts/run.mjs build portal`                                 |
| `build:backend`             | `node scripts/run.mjs build backend`                                |
| `start`                     | `node scripts/run.mjs start`                                        |
| `start:admin`               | `node scripts/run.mjs start admin -- --host 127.0.0.1 --port 4200`  |
| `start:portal`              | `node scripts/run.mjs start portal -- --host 127.0.0.1 --port 4300` |
| `start:core-api`            | `node scripts/run.mjs start core-api`                               |
| `start:portal-api`          | `node scripts/run.mjs start portal-api`                             |
| `start:payroll-engine`      | `node scripts/run.mjs start payroll-engine`                         |
| `start:esocial-worker`      | `node scripts/run.mjs start esocial-worker`                         |
| `start:integrations-worker` | `node scripts/run.mjs start integrations-worker`                    |
| `start:report-worker`       | `node scripts/run.mjs start report-worker`                          |
| `start:report-service`      | `node scripts/run.mjs start report-service`                         |

### Quality and Tests

| Npm Script               | Dispatcher Command                            |
| ------------------------ | --------------------------------------------- |
| `lint`                   | `node scripts/run.mjs lint`                   |
| `lint:check`             | `node scripts/run.mjs lint check`             |
| `format`                 | `node scripts/run.mjs format`                 |
| `format:check`           | `node scripts/run.mjs format check`           |
| `typecheck`              | `node scripts/run.mjs typecheck`              |
| `test`                   | `node scripts/run.mjs test`                   |
| `test:admin`             | `node scripts/run.mjs test admin`             |
| `test:portal`            | `node scripts/run.mjs test portal`            |
| `test:backend`           | `node scripts/run.mjs test backend`           |
| `test:db`                | `node scripts/run.mjs test db`                |
| `test:e2e`               | `node scripts/run.mjs test e2e`               |
| `test:admin:e2e`         | `node scripts/run.mjs test admin-e2e`         |
| `test:portal:e2e`        | `node scripts/run.mjs test portal-e2e`        |
| `test:frontend:e2e`      | `node scripts/run.mjs test frontend-e2e`      |
| `test:coverage`          | `node scripts/run.mjs test coverage`          |
| `test:frontend:coverage` | `node scripts/run.mjs test frontend-coverage` |
| `test:qa`                | `node scripts/run.mjs test qa`                |
| `test:qa:api`            | `node scripts/run.mjs test qa-api`            |
| `test:qa:frontend`       | `node scripts/run.mjs test qa-frontend`       |

### QA, Audit, Database, API, Governance, and Operations

| Npm Script             | Dispatcher Command                                                 |
| ---------------------- | ------------------------------------------------------------------ |
| `qa:bootstrap`         | `node scripts/run.mjs qa bootstrap`                                |
| `qa:smoke:urls`        | `node scripts/run.mjs qa smoke:urls`                               |
| `audit:schema`         | `node scripts/run.mjs audit:schema`                                |
| `audit:api`            | `node scripts/run.mjs audit:api`                                   |
| `audit:fr`             | `node scripts/run.mjs audit:fr`                                    |
| `audit:tests`          | `node scripts/run.mjs audit:tests`                                 |
| `audit:hotspots`       | `node scripts/run.mjs audit:hotspots`                              |
| `audit:backlog`        | `node scripts/run.mjs audit:backlog`                               |
| `audit:pvd`            | `node scripts/run.mjs audit:pvd`                                   |
| `audit:all`            | `node scripts/run.mjs audit:all`                                   |
| `db`                   | `node scripts/run.mjs db`                                          |
| `db:generate`          | `node scripts/run.mjs db generate`                                 |
| `db:migrate`           | `node scripts/run.mjs db migrate`                                  |
| `db:seed`              | `node scripts/run.mjs db seed`                                     |
| `db:smoke`             | `node scripts/run.mjs db smoke`                                    |
| `db:studio`            | `node scripts/run.mjs db studio`                                   |
| `db:fk-coverage:check` | `node scripts/run.mjs db fk-coverage check`                        |
| `db:fk-coverage:write` | `node scripts/run.mjs db fk-coverage write`                        |
| `db:push:guard`        | `node scripts/run.mjs db push-guard`                               |
| `db:alignment:check`   | `node scripts/run.mjs db alignment check`                          |
| `api:alignment:sync`   | `node scripts/run.mjs api alignment sync`                          |
| `api:alignment:check`  | `node scripts/run.mjs api alignment check`                         |
| `api:operation:check`  | `node scripts/run.mjs api operation check`                         |
| `api:spec:check`       | `node scripts/run.mjs api spec check`                              |
| `api:client:generate`  | `node scripts/run.mjs api client generate`                         |
| `governance:check`     | `node scripts/run.mjs governance check`                            |
| `evidence:check`       | `node scripts/run.mjs check evidence`                              |
| `deploy`               | `node scripts/run.mjs deploy`                                      |
| `deploy:plan`          | `node scripts/run.mjs deploy --dry-run`                            |
| `deploy:stage`         | `node scripts/run.mjs deploy --target stage --stack all --dry-run` |
| `deploy:prod`          | `node scripts/run.mjs deploy --target prod --stack all --dry-run`  |
| `health`               | `node scripts/run.mjs health`                                      |
| `health:json`          | `node scripts/run.mjs health --json`                               |
| `clean`                | `node scripts/run.mjs clean`                                       |

## See Also

- `docs/user/local-setup.md`
- `docs/user/testing.md`
- `docs/user/environment.md`
- `scripts/README.md`
