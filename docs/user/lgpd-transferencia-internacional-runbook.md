# LGPD International Transfer Runbook

## Purpose

Use this runbook when a processor, storage region, analytics service, or support
workflow may transfer personal data outside Brazil.

## Create A Mechanism

1. Confirm the ROPA flow key and processor name.
2. Create a draft at `POST /api/v1/admin/lgpd/transferencias-internacionais`.
3. Choose a mechanism:
   - `ADEQUACY_DECISION` only when the destination has ANPD adequacy recognition.
   - `STANDARD_CONTRACTUAL_CLAUSES` for the default contractual path.
   - Another listed mechanism only when legal review records the basis.
4. Include `mechanismReference`, data categories, safeguards, and review due date.

## DPO Review

1. Submit the draft with `PATCH /:id/dpo-review`.
2. The DPO reviews purpose, categories, destination, processor contract, and
   safeguards.
3. Activate with `PATCH /:id/approve` and record `dpoApprovalRef`.

## Monitoring

Systems that call registered international processors must send audit metadata:

- `flowKey`
- `processorName`
- `destinationCountry`
- optional `destinationRegion`
- optional `dataCategories`

When metadata matches an active mechanism, SGP records
`lgpd.international_transfer_event` for traceability.

## Closure

When a processor contract ends or the transfer stops, close the mechanism with
`PATCH /:id/close` and record `endsAt`. Do not delete historical records.
