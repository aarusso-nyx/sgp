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
- `node scripts/run.mjs qa bootstrap`
- `node scripts/run.mjs evidence check`
- `node scripts/run.mjs governance check`
- `node scripts/run.mjs health --json`
- `node scripts/run.mjs deploy --target stage --stack all --dry-run`

## Canonical npm Entry Points

- Build: `npm run build`, `npm run build:admin`, `npm run build:portal`, `npm run build:backend`
- Start: `npm run start`, `npm run start:admin`, `npm run start:portal`, `npm run start:core-api`, `npm run start:portal-api`, `npm run start:payroll-engine`, `npm run start:esocial-worker`, `npm run start:integrations-worker`, `npm run start:report-service`
- Quality: `npm run lint`, `npm run lint:check`, `npm run format`, `npm run format:check`, `npm run typecheck`
- Tests: `npm run test`, `npm run test:admin`, `npm run test:portal`, `npm run test:backend`, `npm run test:db`, `npm run test:e2e`, `npm run test:coverage`, `npm run test:qa`
- Database: `npm run db -- help`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run db:smoke`, `npm run db:studio`
- Governance/evidence: `npm run api:alignment:sync`, `npm run api:alignment:check -- --json`, `npm run db:alignment:check -- --json`, `npm run health:json`, `npm run governance:check`, `npm run evidence:check`
- Operations: `npm run qa:bootstrap`, `npm run qa:smoke:urls`, `npm run deploy -- --dry-run`, `npm run clean`

Do not add compatibility aliases for retired command names. Add new composed
behavior to `run.mjs` and the shared registry under `scripts/lib/`.
