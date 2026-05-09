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

## Property-Based Coverage

`fast-check` underwrites a small but load-bearing set of monetary,
calculation, and rounding invariants that traditional unit tests miss
because the bug surfaces only at boundary cases (rounding ties, sign
flips, associativity drift, bracket boundaries, ceiling clamps).

Inventory of `fc.assert` call sites and the invariant each defends:

- `backend/src/common/money/money.property.spec.ts` — `roundMoney(a + b - b)`
  equals `roundMoney(a)` at scale 2, defending associativity-under-rounding
  for the central money helper that backs every payroll line.
- `backend/src/common/money/money.invariants.property.spec.ts` — six
  properties: rounding idempotency, zero/small-value preservation,
  sign symmetry under `ROUND_HALF_UP`, three-addend distribution drift
  bounded by 0.03, `toMoney` integer round-trip, and a hard cap on
  decimal places. Defends the canonical-format contract that the
  `sgp/no-math-round-money` ESLint rule complements.
- `backend/src/payroll-engine/payroll-calc.property.spec.ts` — six
  payroll-engine invariants:
  - folha mensal net total is linear over independent employee lines;
  - INSS linear contribution is proportional for celetista salaries;
  - IRRF progressive contribution is monotonic for a fixed dependent
    count;
  - IRRF bracket boundaries do not produce negative withholding;
  - RPPS progressive contribution is monotonic until the ceiling and
    capped beyond it;
  - ATS grows monotonically by completed service year and is zero at
    admission.

Property-based coverage is intentionally narrow and concentrated on
folha-pagamento money math and the RPPS/IRRF tax surfaces, where a
regression carries the highest cost. Expansion follows the same
deliberate-amendment policy as the Stryker mutation scope (ADR-028).

## Fault-Injection Coverage

External-service outage paths beyond the single `coverage-hardening.
database-unavailable.spec.ts` baseline are now exercised by:

- `backend/src/coverage-hardening.sqs-unavailable.spec.ts` — asserts
  that AWS SQS `SendMessageCommand` timeouts and
  `ServiceUnavailableException` propagate to the publisher unchanged
  (so the caller can retry with bounded backoff), that
  `GetQueueUrlCommand` returning an empty envelope surfaces a typed
  `domainError`, and that the polling subscription returns a callable
  `unsubscribe` that stops the loop cleanly.
- `backend/src/coverage-hardening.s3-unavailable.spec.ts` — asserts
  that AWS S3 `HeadObjectCommand` returning `NoSuchKey` translates to
  `NotFoundException` at the storage boundary, that generic
  `S3ServiceException` and `TimeoutError` translate to
  `ServiceUnavailableException`, that `PutObjectCommand` outages
  propagate from `storeGeneratedObject`, and that the absence of S3
  configuration produces a typed `ServiceUnavailableException` rather
  than a silent no-op.
- `backend/src/coverage-hardening.network-timeout.spec.ts` — asserts
  that asynchronous SDK timeouts surface as `TimeoutError`, that
  `AbortSignal` cancellation initiated by the caller mid-flight is
  honored as `AbortError`, and that empty success envelopes from the
  SDK still produce a typed `domainError` rather than a fall-through
  `undefined`.
