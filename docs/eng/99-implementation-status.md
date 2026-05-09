# Implementation Status

Status date: 2026-05-09

This page records the current implementation status for the feature-audit
execution round. It is intentionally conservative: source evidence can exist
before the feature-audit matrix has been regenerated.

## Phase 9 Feature-Audit Round

| Area                    | Status                           | Notes                                                                                                                 |
| ----------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Legal blockers          | Partial                          | P.12 is implemented; M.06, N.06, and N.07 remain design-only.                                                         |
| Portal self-service     | Implemented for the Wave B slice | Q.03, Q.04, and Q.09 were already present; Q.07, Q.11, and Q.12 now have dedicated portal/API evidence.               |
| Backend M2 hardening    | Implemented for the Wave C slice | R.01, T.05, T.07, and T.09 were already present; T.10 lock hardening now has source/test evidence.                    |
| SGP-only B closure      | Implemented                      | All 21 `Owner=SGP`, `Presence=B` rows in the closure slice are promoted to `P`; sibling-owned B rows are unchanged.   |
| Admin surfaces          | Out of SGP scope                 | Admin backend/db/frontend surfaces and AdminFeaturePage parity are delegated to `../stynx` framework ownership.       |
| eSocial and DET runtime | Out of SGP scope                 | eSocial implementation belongs to `../stynx-esocial`; DET implementation belongs to an external DET service boundary. |

## Current Verdict

SGP is not yet at a clean Phase 9 closure verdict. The remaining SGP-owned
closure blockers are M.06 MANAD, N.06 PCMAT, and N.07 CIPA. P.12 should be
eligible for reclassification after the feature-audit matrix is refreshed from
the current source evidence.

Admin parity, eSocial implementation, and DET implementation are not SGP
closure gaps. SGP owns only accepted product-domain APIs, portal/operator
surfaces, local eSocial/DET gateway projections, and status/audit consumers.
Admin backend/db/frontend surfaces are delegated to `../stynx`; eSocial
XML/XSD/signing/SOAP/return/totalizer/retry/DLQ implementation is delegated to
`../stynx-esocial`; DET polling/certificate/acknowledgement/normalization
implementation is delegated outside this repository.

The SGP-only B closure pass is complete for the 21 rows listed in
`docs/gov/audit/sgp-only-b-closure.md`. P.09 now has runtime-wired,
policy-driven pino redaction evidence, and R.07 is closed within the ADR-021
software A1/PKCS#12 boundary with non-secret certificate status proof.

Full-stack readiness still depends on external packages and services, but those
dependencies no longer count as SGP implementation backlog.

## Retained Evidence

| Evidence                                              | Purpose                                      |
| ----------------------------------------------------- | -------------------------------------------- |
| `docs/gov/audit/phase-9-closure.md`                   | Wave F compare and closure status.           |
| `docs/gov/audit/sgp-only-b-closure.md`                | SGP-only B row closure proof.                |
| `docs/gov/audit/lgpd-international-transfer-proof.md` | P.12 source/test evidence.                   |
| `docs/gov/audit/wave-D/coordination-ledger.md`        | Wave D 30-note handoff target evidence.      |
| `docs/gov/audit/wave-E/external-package-status.md`    | Wave E external package status.              |
| `docs/gov/audit/functional-requisites.md`             | Refreshed functional-requisite audit ledger. |
