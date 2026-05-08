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

Use `GET /api/v1/admin/lgpd/dsar` to list tickets by `status` or `flowKey`.
Read access requires `auditoria.read`. The response is intentionally minimized:
it includes ticket status, right type, flow, SLA state, retention/sharing
snapshots, and hashed requester/employee references, but not raw login, token
subject, tenant id, or employee id.

Use `PATCH /api/v1/admin/lgpd/dsar/:id` to update `status` or
`triageOutcome`. Write access requires `gestao.write` and emits
`lgpd_data_subject_request` audit events. The endpoint is for lifecycle
tracking only; it does not erase, export, correct, or disclose personal data
from source systems.

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

## ROPA registry

Use `GET /api/v1/admin/lgpd/ropa` to list tenant ROPA entries. Optional
`flowKey` and `status` filters narrow the result to a data flow or lifecycle
state. Read access requires `auditoria.read`.

Use `POST /api/v1/admin/lgpd/ropa` to create an operation record for an active
legal-basis flow such as `payroll.payslip_pdf`,
`recruitment.public_application`, `time.attendance_register`, or
`regulatory.esocial_reporting`. The payload records operation ownership,
processors or recipients, security controls, lifecycle evidence, review date,
and risk level. Write access requires `gestao.write` and emits
`lgpd_ropa_entry` audit events.

Use `PATCH /api/v1/admin/lgpd/ropa/:id` to update mutable operation fields or
move the entry to `UNDER_REVIEW` or `RETIRED`. ROPA entries do not redefine the
legal basis; they reference the active `lgpd.legal_basis_rule` data-flow key.

## RCIS security incidents

Use `GET /api/v1/admin/lgpd/incidents` to list RCIS incidents by optional
`status` or `flowKey`. Read access requires `auditoria.read`.

Use `POST /api/v1/admin/lgpd/incidents` to register a detected incident. Supply
`flowKey` or `ropaEntryId` when the affected processing operation is known so
the incident snapshots the active ROPA/legal-basis identifiers.

Use these protected transitions to complete the workflow:

- `PATCH /api/v1/admin/lgpd/incidents/:id/triage`
- `PATCH /api/v1/admin/lgpd/incidents/:id/report`
- `PATCH /api/v1/admin/lgpd/incidents/:id/complement`
- `PATCH /api/v1/admin/lgpd/incidents/:id/close`

Triage records relevant-risk assessment and starts the ANPD timer when personal
data impact is confirmed. Reporting records protocol/contact evidence and
starts the complementation window. Complement and close retain operational
evidence. The API records workflow state only; it does not submit external ANPD
communications or decide breach-notification substance.
