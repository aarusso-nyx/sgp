---
name: sgp-fix-tests
description: Thin SGP adapter for DEVAI SKILL-fix-test. Use when the user asks to repair Jest, e2e, RLS, coverage, backend, frontend, DB, or Playwright test failures.
---

# SGP Fix Tests

Thin adapter. The canonical workflow lives in DEVAI `SKILL-fix-test` and is invoked with:

```bash
devai skill-run SKILL-fix-test --repo-root /Users/aarusso/Development/stech/sgp
```

## SGP Config

- Repo root: `/Users/aarusso/Development/stech/sgp`.
- Common test commands: `npm run test:backend -- --runInBand`, `npm run test:coverage -- --runInBand`, `npm run test:e2e`, `npm run test:db`, `npm run test:admin`, `npm run test:portal`, `npm run test:qa:api`, and `npm run test:qa:frontend` when present in live `package.json`.
- DB-backed tests use `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test`.

## Adapter Rules

- Reproduce the exact failing command first and prefer focused tests before broad gates.
- Fix product behavior over weakening tests unless authoritative specs changed.
- Use stubs, mocks, sandbox adapters, fixtures, or goldens for external integrations unless real-service testing is explicitly requested.
- Do not duplicate DEVAI test-fix logic here.

## Output Contract

Return the failing command, root cause, files changed, focused passing tests, broader gates run, skipped tests with reasons, and current git status.
