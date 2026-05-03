# LGPD titular-rights portal tickets

**Canonical table:** `lgpd.data_subject_request`
**API:** `POST /api/portal/v1/lgpd/direitos`
**Legal source:** LGPD Art. 18, incisos I through VI.
**ROPA source:** `lgpd.ropa_entry`
**Legal-basis source:** `lgpd.legal_basis_rule`

The employee portal creates an LGPD Art. 18 request ticket instead of executing
data mutation inline. The ticket is tenant-scoped, records the authenticated
portal actor, links to an active ROPA entry by `flow_key`, snapshots the
retention and sharing rules from `lgpd.legal_basis_rule`, and starts the local
manual-process SLA timer documented in `docs/eng/41-arquitetura-sistema.md`.

## Accepted right types

| Type                              | Art. 18 grounding                                                                     | Initial triage         |
| --------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- |
| `CONFIRMATION`                    | I - confirmation of processing existence                                              | `EXECUTABLE`           |
| `ACCESS`                          | II - access to data                                                                   | `EXECUTABLE`           |
| `CORRECTION`                      | III - correction of incomplete, inaccurate, or outdated data                          | `EXECUTABLE`           |
| `ANONYMIZATION_BLOCKING_DELETION` | IV - anonymization, blocking, or deletion of unnecessary, excessive, or unlawful data | `RETENTION_RESTRICTED` |
| `PORTABILITY`                     | V - portability on express request, subject to ANPD regulation and protected secrets  | `EXECUTABLE`           |
| `CONSENT_DELETION`                | VI - deletion of personal data processed with consent, except Art. 16 cases           | `RETENTION_RESTRICTED` |

`RETENTION_RESTRICTED` means the portal has accepted the request, but execution
requires controller/DPO triage against the stored retention rule. R2-43 does not
implement RCIS, does not create another legal-basis registry, and does not add a
new RBAC permission; the portal endpoint uses the existing
`portal.profile.write` permission.

## Contract evidence

`tests/backend/lgpd-direitos-titular.e2e-spec.ts` exercises the six accepted
right types through `POST /api/portal/v1/lgpd/direitos`, verifies ticket
creation, SLA timestamps, ROPA/legal-basis snapshots, and mutation audit.
