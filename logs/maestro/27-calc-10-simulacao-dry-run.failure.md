Failing gate: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e`

Completed before failure:
- `npm run lint` passed.
- `npm run typecheck` passed.
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test` passed.

Diagnostic output:

```text
FAIL test/calc-irrf.e2e-spec.ts
  CALC-02 IRRF progressive table golden scenarios (e2e)
  - evaluates IRRF isento through evaluate_earning_deduction
  - evaluates IRRF faixa 2 through evaluate_earning_deduction
  - evaluates IRRF faixa maxima com 2 dependentes through evaluate_earning_deduction

  error: function payroll_calc.f_irrf_progressive(uuid, integer, integer) does not exist

  at ../src/database/database.service.ts:37:22
  at calc-irrf.e2e-spec.ts:99:22
  at calc-irrf.e2e-spec.ts:81:22

FAIL test/calc-simulacao.e2e-spec.ts
  CALC-10 payroll simulation dry-run (e2e)
  - runs five simulations without changing payroll_run or line counts
  - applies a 10 percent base salary override and moves IRRF into the next amount

  Error: Payroll simulation changed payroll_run tables

  at ../src/folha-pagamento/simulacao/simulacao.service.ts:113:17
  at ../src/database/database.service.ts:59:22
  at calc-simulacao.e2e-spec.ts:108:22
  at calc-simulacao.e2e-spec.ts:125:20

FAIL test/audit-coverage.e2e-spec.ts
  audit coverage
  - requires every registered mutating route to call auditMutation

  Missing audit coverage:
  - folha-pagamento/simulacao/simulacao.controller.ts:Post:run

Test Suites: 3 failed, 27 passed, 30 total
Tests: 6 failed, 76 passed, 82 total
Snapshots: 0 total
```
