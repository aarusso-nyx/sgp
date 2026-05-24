# PDF/A Builder Boundary

Date: 2026-05-24

## Decision

SGP adopts `@stynx/pdf` for shared PDF digest helpers, but retains its local
`pdf-lib` PDF/A-style builders for official payroll fixtures.

The current local builder lives at
`backend/src/report-service/payslip/pdf-a-builder.service.ts`. Related yearly
income rendering is covered by
`backend/src/report-service/yearly-income/pdf-a-yearly.service.spec.ts`.

## Rationale

SGP payroll PDFs are regulatory output fixtures. The tests compare versioned
goldens byte-for-byte, including deterministic metadata and the internal
`%%SGP-PADES-SIGNATURE` evidence block. The current `@stynx/pdf` package does
not yet provide a PDF/A conformance adapter with those stability guarantees.

Replacing the local builder before the shared package owns PDF/A layout,
metadata, digest, and fixture-stability semantics would turn a regulated output
contract into an implementation detail. That is not acceptable for payroll,
annual income evidence, or audit replay.

## Scope

SGP may use shared `@stynx/pdf` helpers for digest and package-level utilities.
SGP continues to own:

- PDF/A-style document construction for payslips.
- Deterministic golden fixture comparison.
- Local PAdES evidence markers used by tests.
- Any byte-sensitive migration of existing goldens.

## Retirement Criteria

Retire the SGP `pdf-lib` builder only after `@stynx/pdf` provides:

- A PDF/A adapter with deterministic metadata and object ordering guarantees.
- A compatible PAdES evidence hook.
- Golden-fixture helpers that preserve byte-sensitive expected files.
- Passing SGP payslip and yearly-income golden tests without normalizing the
  existing expected PDFs.
