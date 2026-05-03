# LGPD Operations

This guide covers the operator workflow for the current LGPD surfaces.

## DPO designation

Use `GET /api/v1/admin/lgpd/dpo` to review the tenant DPO designation before
publishing the public portal contact.

Use `POST /api/v1/admin/lgpd/dpo` for the first designation and
`PATCH /api/v1/admin/lgpd/dpo` for later updates. The payload stores the public
contact plus lifecycle metadata:

- `name`
- `email`
- `phone`
- `channelUrl`
- `officeHours`
- `postalAddress`
- `status`
- `designationAct`
- `designatedAt`
- `notes`

Creation and update require `gestao.write` and generate audit events for
`lgpd_dpo_designation`. Read access requires `gestao.read`.

## Public DPO contact

`GET /api/v1/public/lgpd/encarregado` returns the public DPO contact. The
optional `x-tenant-id` header selects a tenant when the public host cannot do
that resolution.

## Data-subject requests

Portal actors submit Art. 18 requests through
`POST /api/portal/v1/lgpd/direitos`. The endpoint accepts `rightType`,
`flowKey`, and `description`, then creates an `lgpd.data_subject_request`
ticket tied to the active ROPA/legal-basis record for that treatment flow.

Operators triage the generated ticket from the LGPD/audit back office. The
endpoint records the request and retention/sharing snapshots; it does not make
the legal decision or mutate personal data automatically.

## Treatment by public power

Use `GET /api/v1/admin/lgpd/public-power-treatments` to list public-controller
treatment evidence records by `status` or `flowKey`.

Use `POST /api/v1/admin/lgpd/public-power-treatments` with either `ropaEntryId`
or `flowKey` to create the first record for an active ROPA operation. The
service fills the purpose, legal-basis reference, responsible area, and evidence
anchor from the active ROPA/legal-basis record unless the operator supplies a
narrower value approved by the owner/legal process.

Use `PATCH /api/v1/admin/lgpd/public-power-treatments/:id` to move a record to
`UNDER_REVIEW`, `SUSPENDED`, or `RETIRED`, or to update notes/evidence refs.
Create and update require `gestao.write` and emit
`lgpd_public_power_treatment` audit events. List access requires
`auditoria.read`.
