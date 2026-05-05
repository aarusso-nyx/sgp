# Scripts

`run.mjs` is the authoritative workspace command dispatcher. Root `package.json`
keeps canonical npm entrypoints only; composed commands, runtime env injection,
formatter targets, and evidence/governance gate ordering live under `scripts/`.

## Dispatcher Commands

From the repository root:

- `node scripts/run.mjs help`
- `node scripts/run.mjs build`
- `node scripts/run.mjs start`
- `node scripts/run.mjs lint`
- `node scripts/run.mjs format`
- `node scripts/run.mjs typecheck`
- `node scripts/run.mjs test`
- `node scripts/run.mjs db help`
- `node scripts/run.mjs api help`
- `node scripts/run.mjs check evidence`
- `node scripts/run.mjs qa bootstrap`
- `node scripts/run.mjs audit all`
- `node scripts/run.mjs governance check`
- `node scripts/run.mjs health --json`
- `node scripts/run.mjs deploy --target stage --stack all --dry-run`
- `node scripts/run.mjs clean --dry-run`

## Canonical npm Entry Points

- Build: `npm run build`, `npm run build:admin`, `npm run build:portal`, `npm run build:backend`
- Start: `npm run start`, `npm run start:admin`, `npm run start:portal`, `npm run start:core-api`, `npm run start:portal-api`, `npm run start:payroll-engine`, `npm run start:integrations-worker`, `npm run start:report-worker`, `npm run start:report-service`
- Quality: `npm run lint`, `npm run lint:check`, `npm run format`, `npm run format:check`, `npm run typecheck`
- Tests: `npm run test`, `npm run test:admin`, `npm run test:portal`, `npm run test:backend`, `npm run test:db`, `npm run test:e2e`, `npm run test:coverage`, `npm run test:qa`
- Audit helpers: `npm run audit:schema`, `npm run audit:api`, `npm run audit:fr`, `npm run audit:tests`, `npm run audit:hotspots -- --baseline <sha>`, `npm run audit:backlog -- --closure <path>`, `npm run audit:pvd`, `npm run audit:all`
- Database: `npm run db -- help`, `npm run db:migrate`, `npm run db:seed`, `npm run db:smoke`
- Governance/evidence: `npm run api:alignment:sync`, `npm run api:alignment:check -- --json`, `npm run api:operation:check`, `npm run api:spec:check`, `npm run db:alignment:check -- --json`, `npm run db:fk-coverage:check`, `npm run db:push:guard`, `npm run health:json`, `npm run governance:check`, `npm run evidence:check`
- Operations: `npm run qa:bootstrap`, `npm run qa:smoke:urls`, `npm run deploy -- --dry-run`, `npm run clean`
- Generators: `node scripts/generate.mjs openapi-client`, `node scripts/generate.mjs permissions`

## Dispatcher vs Workspace Commands

Use the root dispatcher for commands that compose workspaces, inject runtime
environment, read runtime topology, or write governance/audit/evidence surfaces.
These command families are dispatcher-mandatory:

- Deployment planning: `npm run deploy -- --dry-run`
- Governance validation: `npm run governance:check`
- Audit inventories and diagnostics: `npm run audit:*`
- QA bootstrap and configured URL smoke checks: `npm run qa:bootstrap`,
  `npm run qa:smoke:urls`
- Runtime topology health: `npm run health:json`

Use direct workspace commands for tight backend or frontend loops when you want
raw `nest`, `ng`, `jest`, `eslint`, or `prettier` output and the command does
not need cross-workspace sequencing or governance side effects.

| Intent                     | Dispatcher/root command                                                                                                            | Direct workspace loop                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build everything           | `npm run build`                                                                                                                    | `npm -w frontend run build:admin && npm -w frontend run build:portal && npm -w backend run build`                                                                                              |
| Build backend only         | `npm run build:backend`                                                                                                            | `npm -w backend run build`                                                                                                                                                                     |
| Build admin or portal      | `npm run build:admin`, `npm run build:portal`                                                                                      | `npm -w frontend run build:admin`, `npm -w frontend run build:portal`                                                                                                                          |
| Serve admin or portal      | `npm run start:admin`, `npm run start:portal`                                                                                      | `npm -w frontend run start:admin`, `npm -w frontend run start:portal`                                                                                                                          |
| Serve core API             | `npm run start:core-api`                                                                                                           | `npm -w backend run start:dev`                                                                                                                                                                 |
| Serve portal API           | `npm run start:portal-api`                                                                                                         | `npm -w backend run start:portal:dev`                                                                                                                                                          |
| Serve backend workers      | `npm run start:payroll-engine`, `npm run start:integrations-worker`, `npm run start:report-worker`, `npm run start:report-service` | `npm -w backend run start:payroll-engine:dev`, `npm -w backend run start:integrations-worker:dev`, `npm -w backend run start:report-worker:dev`, `npm -w backend run start:report-service:dev` |
| Lint check                 | `npm run lint:check`                                                                                                               | `npm -w frontend run lint:check`, `npm -w backend run lint:check`                                                                                                                              |
| Format check               | `npm run format:check`                                                                                                             | `npm -w frontend run format:check`, `npm -w backend run format:check`                                                                                                                          |
| Typecheck                  | `npm run typecheck`                                                                                                                | `npm -w frontend run typecheck`, `npm -w backend run typecheck`                                                                                                                                |
| Backend tests              | `npm run test:backend`, `npm run test:e2e`                                                                                         | `npm -w backend run test -- --runInBand`, `npm -w backend run test:e2e -- --runInBand`                                                                                                         |
| Frontend tests             | `npm run test:admin`, `npm run test:portal`, `npm run test:admin:e2e`, `npm run test:portal:e2e`                                   | `npm -w frontend run test:admin`, `npm -w frontend run test:portal`, `npm -w frontend run test:admin:e2e`, `npm -w frontend run test:portal:e2e`                                               |
| Database and API alignment | `npm run db:alignment:check -- --json`, `npm run api:alignment:check -- --json`, `npm run api:client:generate`                     | Use dispatcher; these commands read or write repository-level generated surfaces.                                                                                                              |

## Generated Permission Catalogs

The backend workspace declares `prebuild` as
`node ../scripts/generate.mjs permissions`, so `npm -w backend run build` and
root `npm run build:backend` regenerate permission catalogs before Nest builds.
The generator reads `database/seed/permission-catalog.json`, rejects duplicate
permission keys and duplicate module/resource/action tuples, then writes:

- `backend/src/iam/permissions/permission-catalog.generated.ts`
- `frontend/src/app/core/navigation/route-permission-map.generated.ts`

Do not edit those generated files by hand. Change the seed catalog, then rerun
`node scripts/generate.mjs permissions` or a backend build.

Do not add compatibility aliases for retired command names. Add new composed
behavior to `run.mjs` and the shared registry under `scripts/lib/`.

## Shared Tooling Layer

- `scripts/lib/cli.mjs` owns common flag and option parsing.
- `scripts/lib/repo-paths.mjs` owns repository-local paths and default local
  test database environment.
- `scripts/lib/command-runner.mjs` owns process, npm, workspace, and sequence
  execution helpers.
- `scripts/audit.mjs`, `scripts/check-evidence.mjs`, `scripts/check-api.mjs`,
  `scripts/check-db.mjs`, `scripts/check-frontend.mjs`, `scripts/db.mjs`,
  `scripts/qa.mjs`, and `scripts/generate.mjs` are family entrypoints;
  implementation helpers live under `scripts/lib/**`.

Root `package.json` entries should route through `node scripts/run.mjs ...`.
Do not add new top-level helper scripts for individual checks or generators
unless they are a human-facing command family.

## Audit Helpers

The `audit:*` commands are deterministic, non-mutating product-code extractors
for the round loop. They write only under `docs/gov/audit/`, including
machine-readable inventories in `docs/gov/audit/inv/round-<n>/` and diagnostics
in `docs/gov/audit/diag/round-<n>/`.

- `audit:schema` parses `database/sql/**/*.sql` into schema tables, constraints,
  RLS, trigger, index, and PII/classification comment inventories.
- `audit:api` renders `docs/gov/generated/api/route-alignment.json` and records API
  route/decorator drift checks.
- `audit:fr` refreshes the functional requisite ledger from
  `docs/gov/evidence/implementation-status.md` and emits a per-round delta.
- `audit:tests` statically maps specs to functional requisite IDs.
- `audit:hotspots` aggregates git churn since `--baseline <sha>` or
  `--prev-round`.
- `audit:pvd` validates DONE/PARTIAL evidence references in the functional
  requisite ledger.
- `audit:backlog` applies an explicit B3 `closure.json` to the backlog ledger and
  is intentionally excluded from `audit:all`.
- `node scripts/run.mjs audit live-data --round <n>` refreshes the live database
  scratch inventory under `docs/work/round-<n>/`.

The committed audit helpers support `--help`, `--dry-run`, `--round <n>`, and
`--output-root <path>` for fixture or temporary output roots. The live-data
scratch helper supports `--output <path>` for an explicit report path.
