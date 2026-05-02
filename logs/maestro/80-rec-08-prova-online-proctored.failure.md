# REC-08 Prova Online com Proctoring - Failure

Failing gate: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e` from `source`.

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 test:e2e
> npm --workspace backend run test:e2e

> backend@0.0.1 test:e2e
> jest --config ./test/jest-e2e.json

FAIL test/reintegracao-retroativa-6m.e2e-spec.ts
  ● Reintegracao retroativa S-2298 golden flow (e2e) › reprocesses six competencies idempotently and emits XSD-valid S-2298

    error: column "name" of relation "company" does not exist

      150 |       [tenantId, otherTenantId],
      151 |     );
    > 152 |     await client.query(
          |     ^
      153 |       `
      154 |       INSERT INTO hr.company (id, tenant_id, code, name, cnpj, status)
      155 |       VALUES ($1::uuid, $2::uuid, 'ES10-COMP', 'ES-10 Company', '12345678000199', 'ACTIVE'::"RecordStatus")

      at ../node_modules/pg/lib/client.js:631:17
      at seed (reintegracao-retroativa-6m.e2e-spec.ts:152:5)
      at Object.<anonymous> (reintegracao-retroativa-6m.e2e-spec.ts:38:5)

Summary of all failing tests
FAIL ./reintegracao-retroativa-6m.e2e-spec.ts
  ● Reintegracao retroativa S-2298 golden flow (e2e) › reprocesses six competencies idempotently and emits XSD-valid S-2298

    error: column "name" of relation "company" does not exist

      150 |       [tenantId, otherTenantId],
      151 |     );
    > 152 |     await client.query(
          |     ^
      153 |       `
      154 |       INSERT INTO hr.company (id, tenant_id, code, name, cnpj, status)
      155 |       VALUES ($1::uuid, $2::uuid, 'ES10-COMP', 'ES-10 Company', '12345678000199', 'ACTIVE'::"RecordStatus")

      at ../node_modules/pg/lib/client.js:631:17
      at seed (reintegracao-retroativa-6m.e2e-spec.ts:152:5)
      at Object.<anonymous> (reintegracao-retroativa-6m.e2e-spec.ts:38:5)

Test Suites: 1 failed, 84 passed, 85 total
Tests:       1 failed, 170 passed, 171 total
Snapshots:   0 total
Time:        6.884 s
Ran all test suites.
npm error Lifecycle script `test:e2e` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c jest --config ./test/jest-e2e.json
```

Earlier gates in this run passed before stopping: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint`, `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run typecheck`, and `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test`.
