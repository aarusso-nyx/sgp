# LGPD ROPA registry

**Canonical table:** `lgpd.ropa_entry`
**API:** `/api/v1/admin/lgpd/ropa`
**Legal-basis source:** `lgpd.legal_basis_rule`

R2-39 implements the Registro de Operacoes de Tratamento (ROPA) as tenant-scoped operation records linked to the R2-40 legal-basis registry. ROPA entries store operational ownership, processors/recipients, safeguards, lifecycle evidence, review status, and risk level. Legal-basis text is not duplicated in ROPA; API responses join the active legal-basis rule by `flow_key`.

## API contract

| Method  | Route                         | Permission       | Audit                    |
| ------- | ----------------------------- | ---------------- | ------------------------ |
| `GET`   | `/api/v1/admin/lgpd/ropa`     | `auditoria.read` | read-only                |
| `POST`  | `/api/v1/admin/lgpd/ropa`     | `gestao.write`   | `CREATE lgpd_ropa_entry` |
| `PATCH` | `/api/v1/admin/lgpd/ropa/:id` | `gestao.write`   | `UPDATE lgpd_ropa_entry` |

`GET` accepts optional `flowKey` and `status` filters. `POST` requires `flowKey`, `operationName`, and `controllerArea`; it rejects unknown or inactive data-flow keys through `LgpdLegalBasisService.assertPiiReadAllowed(flowKey)`. `PATCH` can update mutable ROPA operation fields and can relink the entry to another active legal-basis flow key.

## Seed baseline

The seed script creates one tenant ROPA entry for each major R2-39 acceptance flow:

| Major flow   | Seeded `flow_key`                | Operation                                        |
| ------------ | -------------------------------- | ------------------------------------------------ |
| Folha        | `payroll.payslip_pdf`            | Payroll payslip generation and employee delivery |
| Ponto        | `time.attendance_register`       | Attendance register and time-bank processing     |
| Recrutamento | `recruitment.public_application` | Public recruitment application intake            |

Additional LGPD flows remain available from `lgpd.legal_basis_rule` and can be added to ROPA through the admin API without creating another legal-basis registry.

R2-41 RCIS incidents can link to an active ROPA entry through `lgpd.security_incident.ropa_entry_id`; the incident workflow snapshots the linked legal-basis rule and flow key without duplicating ROPA operation metadata. See `docs/eng/lgpd/rcis.md`.

## Database controls

`lgpd.ropa_entry` is tenant scoped, has RLS enabled, and uses these permissions:

| Operation     | RLS permission                                         |
| ------------- | ------------------------------------------------------ |
| Select        | any of `auditoria.read`, `gestao.read`, `gestao.write` |
| Insert/update | `gestao.write`                                         |

The table references `public.tenant` and `lgpd.legal_basis_rule`, with a uniqueness constraint on `(tenant_id, flow_key, operation_name)`.

## Contract evidence

Focused coverage:

| Test                                       | Evidence                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `backend/src/lgpd/ropa.service.spec.ts`    | joins ROPA with legal-basis rules, creates only for active flow keys, patches mutable fields |
| `backend/src/lgpd/ropa.controller.spec.ts` | verifies audit calls for POST/PATCH                                                          |
| `tests/backend/lgpd-ropa.e2e-spec.ts`      | exercises GET/POST/PATCH under `/api/v1/admin/lgpd/ropa` with RBAC and mutation audit        |
