# Backend And DB Test Gate Diagnostic

Generated at: 2026-04-26T03:40:00Z

## Backend E2E

`DATABASE_URL=postgresql://aarusso@localhost:5432/pecam-test npm run test:e2e` passes with 1 suite and 18 tests. The suite uses the global `/api` prefix and representative `/api/v1/...` paths.

## DB Smoke

`DATABASE_URL=postgresql://aarusso@localhost:5432/pecam-test npm run db:smoke` passes. The command runs migrations, SQL support files, deterministic seed, schema assertions, tenant/RLS checks through a non-bypass smoke role, and portal privilege assertions.

## Coverage

Backend coverage thresholds are enforced from `docs/eng/62-estrategia-testes.md`: global lines `85`, branches `85`, functions `85`. The current observed coverage passes: lines `95.52%`, branches `85.01%`, functions `97.07%`.

## QA Smoke

`npm run test:qa` was re-run without QA base URL variables. The node:test process exits `0` because all missing-environment suites are skipped, but every skipped test is reported with a `BLOCKED` prefix and the summary states that skipped suites are not passing e2e evidence. Under the 2026-04-26 scope decision, this is not treated as a current governance blocker, but it remains a live-environment evidence gap.
