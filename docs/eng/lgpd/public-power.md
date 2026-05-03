# LGPD treatment by public power

**Status:** Accepted for v0.0.1 R3-031.
**Runtime table:** `lgpd.public_power_treatment`.
**Backend surface:** `backend/src/lgpd/public-power.controller.ts`.

This workflow records the minimum auditable evidence for LGPD treatment by a
public controller under the existing ROPA/legal-basis model. It does not create
a second legal-basis registry and does not decide new legal interpretations.
Each record must point to an active tenant ROPA entry and the linked
`lgpd.legal_basis_rule`.

## Contract

`GET /api/v1/admin/lgpd/public-power-treatments` lists workflow records for the
tenant. It accepts optional `status` and `flowKey` filters. Read access follows
the LGPD audit pattern and requires `auditoria.read`.

`POST /api/v1/admin/lgpd/public-power-treatments` creates a workflow record
from either `ropaEntryId` or `flowKey`. Write access requires `gestao.write`.
When the operator does not supply a narrower value, the service defaults:

- `purpose` from the active legal-basis rule purpose
- `legalBasisReference` from the active legal-basis article and sensitive-basis
  article when present
- `responsibleArea` from the selected ROPA `controller_area`
- `evidenceRefs` from the legal-basis `decision_record_anchor`

`PATCH /api/v1/admin/lgpd/public-power-treatments/:id` updates mutable workflow
fields and the lifecycle status. Write access requires `gestao.write`.

Accepted statuses are:

- `REGISTERED`
- `UNDER_REVIEW`
- `SUSPENDED`
- `RETIRED`

## Captured Evidence

Each record stores:

- active `ropaEntryId`
- active `legalBasisRuleId`
- `flowKey`
- treatment `purpose`
- `legalBasisReference`
- `responsibleArea`
- `evidenceRefs`
- `status`
- `notes`
- `createdByRef` and `updatedByRef`

Create and update operations emit audit events with
`resourceType=lgpd_public_power_treatment` and
`tableName=lgpd.public_power_treatment`. Tenant isolation is enforced by RLS on
`lgpd.public_power_treatment`, and the table uses the same `gestao.write` write
policy shape as ROPA and RCIS.

## Exclusions

This workflow records operational evidence only. It does not publish public
notices, decide data-sharing legality, override ROPA/retention rules, perform
DPIA approval, or automate suspension of processing. Those decisions remain
owner/legal process until a future engineering spec defines exact rules.
