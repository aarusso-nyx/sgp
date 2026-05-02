# Prompt 61 - PONTO-03 AFD Geracao e Importacao Failure

Failing gate: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e`

Diagnostic output:

```text
FAIL test/audit-coverage.e2e-spec.ts
  audit coverage > requires every registered mutating route to call auditMutation

Expected: []
Received:
[
  "integrations-worker/dirf/dirf.controller.ts:Post:generate"
]

at test/audit-coverage.e2e-spec.ts:67:21

Test Suites: 1 failed, 65 passed, 66 total
Tests:       1 failed, 144 passed, 145 total
Snapshots:   0 total
```

Earlier gates completed before stopping: `npm run lint`, `npm run typecheck`, and `npm run test` passed. Focused PONTO-03 checks also passed: `npm --workspace backend run test -- afd` and `npm --workspace backend run test:e2e -- ponto-afd-roundtrip`.
