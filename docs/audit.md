# Audit Implementation

The Auditoria slice implements the observed legacy route `#!/auditoria/gestao` as a modern audit search and report-request workflow.

## Event Capture Policy

- Audit events are appended to `public.audit_event` and treated as immutable by application code.
- Existing mutation controllers call `AuditService.appendMutation`, which now delegates to `AuditWriterService`.
- `AuditWriterService` persists actor subject, actor login, action, resource type, resource id, table name, request id, client IP, user agent, and redacted metadata.
- If `DATABASE_URL` is not configured, audit writes remain no-ops so non-persistent tests and startup checks are not blocked.

## Redaction Policy

Audit metadata is recursively redacted for keys matching sensitive names such as authorization, cookie, password, token, secret, credential, `APP_LOGIN`, and `APP_PASSWORD`. Long strings and deep objects are truncated to keep rows bounded.

## Search API

Canonical endpoints:

- `GET /audit/events`
- `GET /audit/facets/actions`
- `GET /audit/facets/tables`
- `GET /audit/facets/users`
- `POST /audit/reports/requests`

Legacy-compatible module endpoint:

- `GET /auditoria/audit-search`

Supported filters:

- `search`
- `dateFrom`
- `dateTo`
- `actor`
- `action`
- `tableName`
- `resourceType`
- `resourceId`
- `requestId`
- `statusCode`
- `page`
- `pageSize`

## Frontend

The Angular Auditoria workspace provides:

- period filters matching the legacy fields `auditoriaFiltro.periodoInicial` and `auditoriaFiltro.periodoFinal`
- user filter matching `auditoriaFiltro.nome`
- table/action filters backed by facet endpoints
- free-text search, refresh, clear filters, and report request actions
- audit event table and redacted metadata detail panel

## Known Limits

- Audit search reads are not themselves audited by default to avoid high-volume recursive audit noise.
- Actual report file generation is still deferred to the report worker/export implementation; this slice creates a durable `report_request`.
- Database-level immutability enforcement for `audit_event` should be added when deployment roles are finalized.
