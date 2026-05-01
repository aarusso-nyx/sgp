Failing gate: `npm run test:e2e` from `/Users/aarusso/Development/stech/sgp/source` with `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam`.

Preceding gates in this retry:

```text
npm run lint      PASS
npm run typecheck PASS
npm run test      PASS
```

Diagnostic output:

```text
FAIL test/calc-rpps.e2e-spec.ts
  CALC-03 RPPS progressive table golden scenarios (e2e)
    evaluates RPPS statutory low bracket through evaluate_earning_deduction
      Expected: "157.23"
      Received: "0.00"
      at calc-rpps.e2e-spec.ts:91:53

    evaluates RPPS statutory max bracket with ceiling through evaluate_earning_deduction
      Expected: "951.63"
      Received: "0.00"
      at calc-rpps.e2e-spec.ts:91:53

    records an audit event for non-statutory bypass
      Expected: > 0
      Received:   0
      at calc-rpps.e2e-spec.ts:99:19

Summary of all failing tests
FAIL ./calc-rpps.e2e-spec.ts
  Test Suites: 1 failed, 21 passed, 22 total
  Tests:       3 failed, 55 passed, 58 total
  Snapshots:   0 total
  Time:        3.053 s
  Ran all test suites.

npm error Lifecycle script `test:e2e` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c jest --config ./test/jest-e2e.json
```
