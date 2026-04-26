# Verification Results

Generated at: 2026-04-26T04:06:40Z

## api-alignment-sync

- Command: `npm run api:alignment:sync`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-api-alignment-sync.log`

## api-alignment-check

- Command: `npm run api:alignment:check -- --json`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-api-alignment-check.log`
- Result: current documented routes `152`, current runtime routes `152`, documented missing `0`, runtime only `0`, domain modules implemented `11`, portal menu missing `0`, admin menu routes postponed `182/182`.

## db-alignment-check

- Command: `npm run db:alignment:check -- --json`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-db-alignment-check.log`

## health-json

- Command: `npm run health:json`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-health-json.log`

## portal-build

- Command: `npm --workspace frontend run build:portal`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-portal-build.log`

## admin-build

- Command: `npm --workspace frontend run build:admin`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-admin-build.log`

## test-portal

- Command: `npm run test:portal`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-test-portal.log`
- Result: 2 test files and 3 tests passed.

## frontend-admin-tests

- Command: `npm run test:frontend`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-frontend-admin-tests.log`
- Result: 28 test files and 56 tests passed.

## backend-build

- Command: `npm --workspace backend run build`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-backend-build.log`

## backend-e2e

- Command: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam-test npm run test:e2e`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-backend-e2e.log`
- Result: 1 suite and 18 tests passed.

## db-smoke

- Command: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam-test npm run db:smoke`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-db-smoke.log`

## backend-coverage

- Command: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam-test npm --workspace backend run test:cov`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-backend-coverage.log`
- Result: statements `94.88%`, lines `95.52%`, branches `85.01%`, functions `97.07%`.

## qa-smoke

- Command: `npm run test:qa`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-qa-smoke.log`
- Result: all QA smoke tests were skipped as `BLOCKED` because live backend/frontend base URLs are not configured. This is not a current governance blocker under the 2026-04-26 scope decision, but it is not passing live e2e evidence.

## qa-smoke-url-config

- Command: `npm run qa:smoke:urls`
- CWD: `source`
- Exit code: 0
- Raw log: `raw-qa-smoke-urls.log`
- Result: reports missing `QA_API_BASE_URL`/`API_BASE_URL`, `QA_ADMIN_FRONTEND_BASE_URL`/`QA_FRONTEND_BASE_URL`/`FRONTEND_BASE_URL`, and `QA_PORTAL_FRONTEND_BASE_URL`/`PORTAL_FRONTEND_BASE_URL`.

## evidence-check

- Command: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam-test npm run evidence:check`
- CWD: `source`
- Exit code: 1
- Result: aggregate evidence gate is implemented. Alignment, DB alignment, health, OpenAPI generation, build, lint, frontend tests, backend tests, backend e2e, DB smoke, and backend coverage pass. The aggregate gate fails only because QA live-smoke URL configuration is missing and QA smoke reports `BLOCKED`.
