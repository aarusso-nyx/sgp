# Backend

NestJS workspace for the core API, portal API, payroll engine, integration
worker, report worker, and report service runtimes.

## Local Development

Run commands from the repository root. Use the root dispatcher for
cross-workspace flows, governance checks, topology health, deployment planning,
database/API alignment, and audit/QA helpers. Use direct workspace commands for
fast backend-only loops where the raw Nest, Jest, ESLint, or Prettier output is
the useful signal.

Common backend loops:

- Core API watch mode: `npm -w backend run start:dev`
- Portal API watch mode: `npm -w backend run start:portal:dev`
- Payroll engine: `npm -w backend run start:payroll-engine:dev`
- Integrations worker: `npm -w backend run start:integrations-worker:dev`
- Report worker: `npm -w backend run start:report-worker:dev`
- Report service: `npm -w backend run start:report-service:dev`
- Unit tests: `npm -w backend run test -- --runInBand`
- Backend e2e tests: `npm -w backend run test:e2e -- --runInBand`
- Lint check: `npm -w backend run lint:check`
- Format check: `npm -w backend run format:check`
- Typecheck: `npm -w backend run typecheck`
- Build: `npm -w backend run build`

Use dispatcher equivalents when validating the integrated repository surface:
`npm run start:core-api`, `npm run start:portal-api`,
`npm run start:payroll-engine`, `npm run start:integrations-worker`,
`npm run start:report-worker`, `npm run start:report-service`,
`npm run test:backend`, `npm run test:e2e`, `npm run typecheck`,
`npm run lint:check`, and `npm run build:backend`.

Local DB-backed backend tests and smoke checks use:

```bash
DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test
```

## Generated Permissions

The backend package has `prebuild: node ../scripts/generate.mjs permissions`.
That means `npm -w backend run build` and root `npm run build:backend`
regenerate permission artifacts before `nest build` runs.

The generator reads `database/seed/permission-catalog.json`, validates that
permission keys and module/resource/action tuples are unique, then writes:

- `backend/src/iam/permissions/permission-catalog.generated.ts`
- `frontend/src/app/core/navigation/route-permission-map.generated.ts`

Do not edit generated permission files directly. Update
`database/seed/permission-catalog.json` and rerun
`node scripts/generate.mjs permissions` or a backend build.
