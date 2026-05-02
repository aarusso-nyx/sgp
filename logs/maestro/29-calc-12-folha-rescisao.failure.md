Gate failed: `npm run test`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 test
> node scripts/run.mjs test

> sgp-modernization-source@0.1.0 test:workspaces
> npm run test:frontend && npm run test:portal && npm run test:backend

Frontend admin tests passed: 34 files, 64 tests.
Frontend portal tests passed: 7 files, 8 tests.

> sgp-modernization-source@0.1.0 test:backend
> npm --workspace backend run test

> backend@0.0.1 test
> jest

FAIL src/folha-pagamento/payroll/payroll.controller.spec.ts
  PayrollController > delegates payroll calculation
    TypeError: Cannot read properties of undefined (reading 'auditMutation')

      110 |     const payrollRunId = params.folha_id ?? params.folha_rescisao_id ?? '';
      111 |     const updated = await this.payrollService.calculateRun(payrollRunId, body);
    > 112 |     await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
          |                             ^

  PayrollController > delegates payroll mass population
    TypeError: Cannot read properties of undefined (reading 'auditMutation')

      129 |   ) {
      130 |     const updated = await this.payrollService.populateRun(payrollRunId, body);
    > 131 |     await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
          |                             ^

  PayrollController > delegates advance payment creation
    TypeError: Cannot read properties of undefined (reading 'auditMutation')

      152 |       body,
      153 |     );
    > 154 |     await this.auditService.auditMutation(
          |                             ^

Test Suites: 1 failed, 80 passed, 81 total
Tests:       3 failed, 254 passed, 257 total
```

Notes: the original `db:smoke` migration failure was repaired by setting `app.current_tenant_id` before CALC-12 tenant bootstrap upserts in `source/backend/prisma/migrations/20260502005000_calc_12_folha_rescisao/migration.sql`. `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke` passed after marking the prior failed migration attempt rolled back. Acceptance gates then ran in order: `npm run lint` passed, `npm run typecheck` passed, and `npm run test` failed in the backend controller unit spec because the spec instantiates `PayrollController` without the new `auditService` dependency.
