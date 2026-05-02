Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e`

Diagnostic output:

```text
FAIL test/audit-coverage.e2e-spec.ts
  audit coverage › requires every registered mutating route to call auditMutation

  Expected missing audited mutating routes to be [], but received:
  esocial-worker/exclusion/s3000.controller.ts:Post:accept

Test Suites: 1 failed, 37 passed, 38 total
Tests: 1 failed, 93 passed, 94 total
```
