# Test Confidence Proof

Status: retained evidence for the 2026-05-08 QA lift.

## Same-Lift Gate Evidence

- `npm run test:types`: passed after enabling frontend
  `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- `npm run test:mutation`: passed with Stryker mutation score `83.61`, above
  the scoped `break: 70` gate.
- `npm --workspace frontend run test:admin:coverage`: passed with the admin
  global ratchet at 90 statements, 90 branches, 90 functions, and 90 lines.
- `npm run test:frontend:coverage`: retained as the combined admin and portal
  frontend coverage gate. Portal retained 90 statements, 90 branches, 90
  functions, and 90 lines.
- `npm run test:coverage -- --runInBand`: passed for backend canonical
  coverage at 92.83 statements, 84.84 branches, 96.62 functions, and 92.83
  lines.
- `npm run test:backend:exception-filter`: previously passed with focused
  exception-envelope coverage.

## Coverage And Mixed-Test Evidence

- Backend canonical coverage thresholds are 90 statements, 80 branches, 90
  functions, and 90 lines in `tests/backend/jest-coverage.json`.
- Frontend coverage includes admin fiscal, payroll/rubrica, LGPD/public
  concurso, recruitment, audit, Angular TestBed metadata instantiation, portal
  endpoint, empty, and error paths.
- Mutation coverage is scoped to MVP-critical money and exception-envelope
  behavior in `stryker.conf.cjs`.
- Existing retained gates cover DB/RLS, e2e, frontend e2e/Playwright,
  OpenAPI drift, database alignment, type tests, unit tests, and mutation tests.

## Coverage Result

The admin frontend now passes the global 90% branch/function ratchet. The live
admin coverage result retained for this lift is 96.84% statements, 90.01%
branches, 98.63% functions, and 96.92% lines.

The combined frontend coverage gate now also keeps portal at 90% branch and
function thresholds. The live portal result retained for this lift is 100%
statements, 95.83% branches, 100% functions, and 100% lines.
