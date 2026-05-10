---
controllers:
  - backend/src/lgpd/international-transfer.controller.ts
  - backend/src/publico/public-transparency.controller.ts
migrations:
  - database/sql/18-lgpd-international-transfer.sql
infra: []
runbooks:
  - docs/user/lgpd-transferencia-internacional-runbook.md
---

# ADR-023: LGPD International Transfer Mechanism Registry

Date: 2026-05-08
Status: Accepted

## Context

The feature audit marks P.12 as absent because SGP did not have an explicit
mechanism registry for international personal-data transfers. LGPD art. 33 and
Resolução CD/ANPD 19/2024 require a lawful transfer mechanism before personal
data leaves Brazil. ANPD also now recognizes EU adequacy through Resolução
CD/ANPD 32/2026.

## Decision

SGP records tenant transfer mechanisms in `lgpd.international_transfer` with a
draft, DPO-review, active, closed, or rejected lifecycle. The accepted default
mechanism for countries without ANPD adequacy recognition is
`STANDARD_CONTRACTUAL_CLAUSES`. `ADEQUACY_DECISION` is allowed only when the
record cites an adequacy source such as `Resolução CD/ANPD 32/2026`.

The portal publishes active transfer summaries through
`GET /api/v1/public/lgpd/transferencias-internacionais`. Internal notes,
resource identifiers, and event metadata stay in the protected admin/audit
surface.

## Consequences

- Cross-border processor calls must include audit metadata with `flowKey`,
  `processorName`, and `destinationCountry` so `AuditWriterService` can append
  `lgpd.international_transfer_event` for active mechanisms.
- Non-EU EEA countries are seeded with SCC as the default until ANPD recognition
  is explicitly recorded.
- Real processor contract documents remain external records referenced by
  `mechanism_reference` and DPO approval references.
