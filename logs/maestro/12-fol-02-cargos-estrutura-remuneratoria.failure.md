Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 test
> node scripts/run.mjs test

> sgp-modernization-source@0.1.0 test:workspaces
> npm run test:frontend && npm run test:portal && npm run test:backend

> sgp-modernization-source@0.1.0 test:frontend
> npm --workspace frontend run test:admin

Test Files  33 passed (33)
Tests       63 passed (63)

> sgp-modernization-source@0.1.0 test:portal
> npm --workspace frontend run test:portal

Test Files  6 passed (6)
Tests       7 passed (7)

> sgp-modernization-source@0.1.0 test:backend
> npm --workspace backend run test

> backend@0.0.1 test
> jest

FAIL src/iam/permissions/catalog-drift.spec.ts
  permission catalog drift
    keeps generated TypeScript permissions identical to the JSON seed

    expect(received).toEqual(expected) // deep equality

    Expected JSON seed permissions did not include:
      gestao.cargo.read
      gestao.cargo.write

    Generated TypeScript permissions did include:
      gestao.cargo.read
      gestao.cargo.write

    at source/backend/src/iam/permissions/catalog-drift.spec.ts:20:28

Test Suites: 1 failed, 71 passed, 72 total
Tests:       1 failed, 228 passed, 229 total
```
