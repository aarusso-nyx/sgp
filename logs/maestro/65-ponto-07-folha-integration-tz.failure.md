Gate failed: `npm run test:e2e` from `source/` with `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam`.

Diagnostics:

- `test/ponto-payroll-bridge-tz.e2e-spec.ts`: expected reduced night minutes `Math.ceil(120 * (60 / 52.5)) = 138`, but the test fixture supplied `137` for Acre, Brasilia, and Fernando de Noronha.
- `test/audit-coverage.e2e-spec.ts`: route coverage reported missing audit metadata for `ponto/payroll-bridge/payroll-bridge.controller.ts:Post:preview`.
- `test/tsv-contrato-alteracao-1m.e2e-spec.ts`: concurrent TS-V slice failure while seeding `hr.employment_link`: `new row for relation "employment_link" violates check constraint "employment_link_contract_type_check"`; cleanup also failed because `esocial.s2306_event` does not exist.
- `test/tce-03-audesp-sp.e2e-spec.ts`: concurrent TCE slice failure: `POST /v1/tce/audesp-sp/submissions/:id/submit` returned 500; stack shows `Cannot read properties of undefined (reading 'id')` in `source/backend/src/tce/queue/queue.types.ts:102`.

Earlier gates passed before this failure:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
