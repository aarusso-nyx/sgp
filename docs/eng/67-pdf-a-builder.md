# PDF/A Builder Boundary

Date: 2026-05-24

## Decision

SGP adopts the `@stynx/pdf/public-payroll` template pack for official
payslip and yearly-income PDF construction. SGP keeps a thin
`PdfABuilderService` adapter for NestJS wiring, evidence appending, and existing
call-site compatibility.

The current adapter lives at
`backend/src/report-service/payslip/pdf-a-builder.service.ts`. The reusable
fixed-layout rendering logic is upstream in `@stynx/pdf/public-payroll`.

## Rationale

SGP payroll PDFs are regulatory output fixtures. The tests compare versioned
goldens byte-for-byte, including deterministic metadata and the internal
`%%STYNX-PADES-SIGNATURE` evidence block. STYNX now owns the deterministic
fixed-layout report construction, while SGP still owns the regulatory data,
storage, audit, and status boundary.

The STYNX template pack is still a PDF/A-style structural builder, not a bundled
validator-backed PDF/A conformance implementation. SGP therefore continues to
record `pdf_a_compliance = PDF_A_1B` only under the accepted internal pipeline
and retained golden evidence.

## Scope

SGP consumes `@stynx/pdf/public-payroll` for:

- PDF/A-style fixed-layout payslip construction.
- PDF/A-style fixed-layout yearly-income construction.
- Structural validation through `validatePdfAStyle(...)`.

SGP continues to own:

- Deterministic golden fixture comparison.
- STYNX PAdES evidence appending through `@stynx/pdf/evidence`.
- SQL reads, LGPD checks, RBAC/RLS/audit, storage keys, report persistence, and
  batch status transitions.
- Any byte-sensitive migration of existing goldens.

## Retirement Criteria

Retire the SGP adapter entirely only after `@stynx/pdf` also owns or exposes:

- A compatible PAdES evidence/hint hook accepted for SGP report-service output.
- Golden-fixture helpers that preserve byte-sensitive expected files.
- A real PDF/A conformance adapter if SGP wants to replace its current
  PDF/A-style structural assertion with validator-backed archival conformance.
