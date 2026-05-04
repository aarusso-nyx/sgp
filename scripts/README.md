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
- Start: `npm run start`, `npm run start:admin`, `npm run start:portal`, `npm run start:core-api`, `npm run start:portal-api`, `npm run start:payroll-engine`, `npm run start:esocial-worker`, `npm run start:integrations-worker`, `npm run start:report-service`
- Quality: `npm run lint`, `npm run lint:check`, `npm run format`, `npm run format:check`, `npm run typecheck`
- Tests: `npm run test`, `npm run test:admin`, `npm run test:portal`, `npm run test:backend`, `npm run test:db`, `npm run test:e2e`, `npm run test:coverage`, `npm run test:qa`
- Audit helpers: `npm run audit:schema`, `npm run audit:api`, `npm run audit:fr`, `npm run audit:tests`, `npm run audit:hotspots -- --baseline <sha>`, `npm run audit:backlog -- --closure <path>`, `npm run audit:pvd`, `npm run audit:all`
- Database: `npm run db -- help`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run db:smoke`, `npm run db:studio`
- Governance/evidence: `npm run api:alignment:sync`, `npm run api:alignment:check -- --json`, `npm run api:operation:check`, `npm run api:spec:check`, `npm run db:alignment:check -- --json`, `npm run db:fk-coverage:check`, `npm run db:push:guard`, `npm run health:json`, `npm run governance:check`, `npm run evidence:check`
- Operations: `npm run qa:bootstrap`, `npm run qa:smoke:urls`, `npm run deploy -- --dry-run`, `npm run clean`
- Generators: `node scripts/generate.mjs openapi-client`, `node scripts/generate.mjs permissions`

Do not add compatibility aliases for retired command names. Add new composed
behavior to `run.mjs` and the shared registry under `scripts/lib/`.

## Shared Tooling Layer

- `scripts/lib/cli.mjs` owns common flag and option parsing.
- `scripts/lib/repo-paths.mjs` owns repository-local paths and default local
  test database environment.
- `scripts/lib/command-runner.mjs` owns process, npm, workspace, and sequence
  execution helpers.
- `scripts/audit.mjs`, `scripts/check.mjs`, `scripts/check-api.mjs`,
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
