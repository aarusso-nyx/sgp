# LGPD RCIS security-incident workflow

**Status:** Accepted for v0.0.1 R2-41.
**Canonical table:** `lgpd.security_incident`.
**API:** `/api/v1/admin/lgpd/incidents`.
**Regulatory source:** Resolução CD/ANPD 15/2024, published in DOU on 2024-04-26.

R2-41 implements the Comunicação de Incidente de Segurança (RCIS) workflow for incidents that affect personal data and may create relevant risk or harm to data subjects. The workflow reuses the R2-39 ROPA entry and R2-40 legal-basis rule as classification evidence; it does not create another legal-basis registry.

## State Machine

| State          | Meaning                                                                                                                         | Exit                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `DETECTED`     | Incident registered and under initial investigation.                                                                            | `PATCH /:id/triage`     |
| `TRIAGED`      | Personal-data impact and relevant-risk assessment recorded. The ANPD clock is running when personal data is confirmed affected. | `PATCH /:id/report`     |
| `REPORTED`     | Initial ANPD communication recorded with protocol/contact evidence. The complementation clock is running.                       | `PATCH /:id/complement` |
| `COMPLEMENTED` | Complementary information/report submitted.                                                                                     | `PATCH /:id/close`      |
| `CLOSED`       | RCIS process closed after communication and mitigation evidence.                                                                | terminal                |

Out-of-order transitions are rejected by the service. The API intentionally keeps mutation access on existing `gestao.write` and read access on existing `auditoria.read`.

## Deadline Rules

The official RCIS clock is three business days for communication to ANPD, counted from controller knowledge that the incident affected personal data. The implementation records:

| Field                        | Rule                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `personal_data_confirmed_at` | Start of the communication timer.                                                                         |
| `anpd_due_at`                | `personal_data_confirmed_at` plus 3 business days.                                                        |
| `anpd_alert_at`              | `personal_data_confirmed_at` plus 2 business days, used by list responses to surface `requiresAnpdAlert`. |
| `anpd_reported_at`           | Date/time of initial ANPD communication.                                                                  |
| `complement_due_at`          | `anpd_reported_at` plus 20 business days.                                                                 |

The v0.0.1 deadline helper counts weekdays and preserves the source timestamp. Holiday-calendar integration can replace the helper later without changing the persisted RCIS fields.

## API Contract

| Method  | Route                                         | Permission       | Audit                           |
| ------- | --------------------------------------------- | ---------------- | ------------------------------- |
| `GET`   | `/api/v1/admin/lgpd/incidents`                | `auditoria.read` | read-only                       |
| `POST`  | `/api/v1/admin/lgpd/incidents`                | `gestao.write`   | `CREATE lgpd_security_incident` |
| `PATCH` | `/api/v1/admin/lgpd/incidents/:id/triage`     | `gestao.write`   | `UPDATE lgpd_security_incident` |
| `PATCH` | `/api/v1/admin/lgpd/incidents/:id/report`     | `gestao.write`   | `UPDATE lgpd_security_incident` |
| `PATCH` | `/api/v1/admin/lgpd/incidents/:id/complement` | `gestao.write`   | `UPDATE lgpd_security_incident` |
| `PATCH` | `/api/v1/admin/lgpd/incidents/:id/close`      | `gestao.write`   | `UPDATE lgpd_security_incident` |

`POST` accepts either a `flowKey`, a `ropaEntryId`, both, or neither. When a source is provided, the service resolves an active tenant ROPA entry and snapshots the linked `legal_basis_rule_id`/`flow_key` into the incident. List responses include ROPA classification hints (`dataCategory`, `requiresDpia`, `sharingScope`) and timer booleans (`requiresAnpdAlert`, `isAnpdOverdue`).

## Logging And Data Minimization

Incident workflow logs are structured with stable fields: `event`, `action`, `incidentId`, `fromStatus`, `toStatus`, `flowKey`, `severity`, `riskRelevant`, `anpdDueAt`, and `complementDueAt`. Free-text summaries, risk details, contact details, and affected category values are kept in the database and audit metadata only where required; they are not emitted in service logs. This lets the R2-58 pino redaction contract protect nested PII paths while keeping operational incident telemetry useful.

## Contract Evidence

Focused coverage:

| Test                                            | Evidence                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `backend/src/lgpd/incidents.service.spec.ts`    | business-day deadlines, ROPA linkage, transition ordering, 3-day ANPD timer, 20-day complementation timer          |
| `backend/src/lgpd/incidents.controller.spec.ts` | audit calls for creation and every state transition                                                                |
| `tests/backend/lgpd-rcis.e2e-spec.ts`           | HTTP contract for `DETECTED -> TRIAGED -> REPORTED -> COMPLEMENTED -> CLOSED` under `/api/v1/admin/lgpd/incidents` |
