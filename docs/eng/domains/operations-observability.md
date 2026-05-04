# Operations And Observability Domain Authority

Authored domain authority for audit implementation, workers, queues, backpressure, and operational observability.

## Merged Artifact Index

- Audit Implementation
- Observability Worker Backpressure
- Worker Operations Runbook

## Audit Implementation

## Audit Implementation

The Auditoria slice implements the observed legacy route `#!/auditoria/gestao` as a modern audit search and report-request workflow.

### Event Capture Policy

- Audit events are appended to `public.audit_event` and treated as immutable by application code.
- Existing mutation controllers call `AuditService.appendMutation`, which now delegates to `AuditWriterService`.
- `AuditWriterService` persists actor subject, actor login, action, resource type, resource id, table name, request id, client IP, user agent, and redacted metadata.
- Successful audit writes increment `sgp_audit_events_emitted_total{controller,route}`. The controller and route labels come from the mutating request interceptor context when available, then fall back to request metadata.
- If `DATABASE_URL` is not configured, audit writes remain no-ops so non-persistent tests and startup checks are not blocked.

### Coverage Observability

The Prometheus metric `sgp_audit_events_emitted_total{controller,route}` is paired with `sgp_http_requests_total{method=~"POST|PUT|PATCH|DELETE"}` to monitor audit coverage for mutating requests. The governed Grafana dashboard and Prometheus alert rules live in:

- `docs/gov/observability/audit-worker-dashboard.json`
- `docs/gov/observability/audit-worker-alerts.yml`

The alert `SgpAuditCoverageBelowMutatingRequests` fires when `audit_events / mutating_requests < 1` for 10 minutes.

### Redaction Policy

Audit metadata is recursively redacted for keys matching sensitive names such as authorization, cookie, password, token, secret, credential, `APP_LOGIN`, and `APP_PASSWORD`. Long strings and deep objects are truncated to keep rows bounded.

### Search API

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

### Frontend

The Angular Auditoria workspace provides:

- period filters matching the legacy fields `auditoriaFiltro.periodoInicial` and `auditoriaFiltro.periodoFinal`
- user filter matching `auditoriaFiltro.nome`
- table/action filters backed by facet endpoints
- free-text search, refresh, clear filters, and report request actions
- audit event table and redacted metadata detail panel

### Known Limits

- Audit search reads are not themselves audited by default to avoid high-volume recursive audit noise.
- Actual report file generation is still deferred to the report worker/export implementation; this slice creates a durable `report_request`.
- Database-level immutability enforcement for `audit_event` should be added when deployment roles are finalized.

## Observability Worker Backpressure

## Observability Worker Backpressure

Wave 7 worker runtimes expose queue and active-claim pressure before each long-running poll.

### Metrics

- `sgp_queue_depth{queue}` records queued work by worker name.
- `sgp_worker_active_claims{worker}` records work already claimed or running by worker name.
- `sgp_audit_events_emitted_total{controller,route}` records persisted audit events for mutation coverage.

### Worker Poll Policy

The long-running `sgp-esocial-worker`, `sgp-integrations-worker`, and `sgp-report-worker` entrypoints call `backpressureStatus()` before `pollOnce()`. A poll proceeds only when available capacity is positive:

`available_capacity = poll_limit - active_claims`

If queue depth is zero or active claims consume the configured capacity, the loop logs `poll skipped` and does not claim more work on that interval. One-shot and HTTP-triggered `pollOnce()` keep their existing behavior for operator-initiated drains and tests.

### Configuration

- `ESOCIAL_WORKER_POLL_LIMIT` defaults to `10`.
- `INTEGRATIONS_WORKER_POLL_LIMIT` defaults to `10`.
- `REPORT_WORKER_POLL_LIMIT` defaults to `10`.

The dashboard and alert configuration for audit coverage and worker pressure are governed under `docs/gov/observability/`.

## Worker Operations Runbook

## Worker Operations Runbook

**Status:** Implementado | **Escopo:** workers eSocial, integrations, reports, payroll engine, TCE queue

### Operating model

Workers run as independently deployable NestJS entrypoints and must be observable through the same runtime controls as synchronous APIs:

- `sgp-esocial-worker`: eSocial build, sign, submit, retorno sync, totalizers.
- `sgp-integrations-worker`: DCTFWeb, DIRF, EFD-Reinf, CNAB, SIAFIC, Siconfi/SIOPE/SIOPS export primitives.
- `sgp-report-worker`: batch report and PDF/PDF-A generation.
- `sgp-payroll-engine`: folia-first calculation runtime.
- `tce-worker`: Postgres-backed TCE submission queue and circuit breaker.

Each worker exposes Prometheus metrics through its runtime when an HTTP entrypoint is present. Polling workers must emit structured logs with `worker`, `tenant_id`, `job_id`, `attempt`, `status`, `duration_ms`, and `trace_id` when available.

### SLAs

| Worker               |                                                      Target latency |                                     Retry budget |            Dead-letter threshold |
| -------------------- | ------------------------------------------------------------------: | -----------------------------------------------: | -------------------------------: |
| Payroll calculation  |                  30 min per monthly run under nominal tenant volume |                               3 workflow retries |    any failed run older than 2 h |
| eSocial submission   | 15 min from approved event to accepted/protocol or definitive error | 3 transient retries plus service circuit breaker |      any DLQ item older than 4 h |
| Integrations exports |           30 min from request to artifact for tenant-scoped exports |                                        3 retries | any failed export older than 8 h |
| Reports              |                     20 min for batch payslip/yearly income packages |                                        3 retries | any failed report older than 4 h |
| TCE queue            |             30 min from validated submission to stub/sandbox result |              8 attempts with exponential backoff |            any `DEAD_LETTER` row |

### Alert thresholds

- `worker_backpressure_depth > 0` for 15 min: warning.
- `worker_backpressure_depth > 100` for 10 min: page owning team.
- `worker_dead_letters > 0`: page during business hours, immediate page for payroll/eSocial close windows.
- `worker_last_success_age_seconds > SLA * 2`: page.
- TCE circuit breaker `OPEN` for more than one cooldown window: page integration owner.
- Audit writer failures: page immediately; audit is a compliance control.

### Recovery steps

1. Identify the runtime and tenant from metrics or logs.
2. Check whether the failure is transient, validation, timeout, or circuit-open.
3. For transient failures, confirm retry schedule and circuit state before manual replay.
4. For validation failures, correct source data or layout/catalog metadata. Do not replay unchanged invalid payloads.
5. For `DEAD_LETTER`, inspect the final attempt payload, capture evidence, then replay through the documented endpoint when the cause is fixed.
6. For source-pending regulatory exporters, do not mark artifacts as official until the layout edition and source URL are owner-selected and recorded in the request payload.

### Evidence

The operational gate is:

- `npm run lint:check`
- `npm run typecheck`
- `npm run test:coverage`
- `npm run governance:check`
- `DATABASE_URL=... npm run db:smoke`

The worker smoke test is `tests/backend/worker-smoke.spec.ts`. TCE queue behavior is covered by `tests/backend/tce-04-queue-retry.e2e-spec.ts`.
