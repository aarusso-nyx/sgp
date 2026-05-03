# Worker Operations Runbook

**Status:** Implementado | **Escopo:** workers eSocial, integrations, reports, payroll engine, TCE queue

## Operating model

Workers run as independently deployable NestJS entrypoints and must be observable through the same runtime controls as synchronous APIs:

- `sgp-esocial-worker`: eSocial build, sign, submit, retorno sync, totalizers.
- `sgp-integrations-worker`: DCTFWeb, DIRF, EFD-Reinf, CNAB, SIAFIC, Siconfi/SIOPE/SIOPS export primitives.
- `sgp-report-worker`: batch report and PDF/PDF-A generation.
- `sgp-payroll-engine`: folia-first calculation runtime.
- `tce-worker`: Postgres-backed TCE submission queue and circuit breaker.

Each worker exposes Prometheus metrics through its runtime when an HTTP entrypoint is present. Polling workers must emit structured logs with `worker`, `tenant_id`, `job_id`, `attempt`, `status`, `duration_ms`, and `trace_id` when available.

## SLAs

| Worker               |                                                      Target latency |                                     Retry budget |            Dead-letter threshold |
| -------------------- | ------------------------------------------------------------------: | -----------------------------------------------: | -------------------------------: |
| Payroll calculation  |                  30 min per monthly run under nominal tenant volume |                               3 workflow retries |    any failed run older than 2 h |
| eSocial submission   | 15 min from approved event to accepted/protocol or definitive error | 3 transient retries plus service circuit breaker |      any DLQ item older than 4 h |
| Integrations exports |           30 min from request to artifact for tenant-scoped exports |                                        3 retries | any failed export older than 8 h |
| Reports              |                     20 min for batch payslip/yearly income packages |                                        3 retries | any failed report older than 4 h |
| TCE queue            |             30 min from validated submission to stub/sandbox result |              8 attempts with exponential backoff |            any `DEAD_LETTER` row |

## Alert thresholds

- `worker_backpressure_depth > 0` for 15 min: warning.
- `worker_backpressure_depth > 100` for 10 min: page owning team.
- `worker_dead_letters > 0`: page during business hours, immediate page for payroll/eSocial close windows.
- `worker_last_success_age_seconds > SLA * 2`: page.
- TCE circuit breaker `OPEN` for more than one cooldown window: page integration owner.
- Audit writer failures: page immediately; audit is a compliance control.

## Recovery steps

1. Identify the runtime and tenant from metrics or logs.
2. Check whether the failure is transient, validation, timeout, or circuit-open.
3. For transient failures, confirm retry schedule and circuit state before manual replay.
4. For validation failures, correct source data or layout/catalog metadata. Do not replay unchanged invalid payloads.
5. For `DEAD_LETTER`, inspect the final attempt payload, capture evidence, then replay through the documented endpoint when the cause is fixed.
6. For source-pending regulatory exporters, do not mark artifacts as official until the layout edition and source URL are owner-selected and recorded in the request payload.

## Evidence

The operational gate is:

- `npm run lint:check`
- `npm run typecheck`
- `npm run test:coverage`
- `npm run governance:check`
- `DATABASE_URL=... npm run db:smoke`

The worker smoke test is `tests/backend/worker-smoke.spec.ts`. TCE queue behavior is covered by `tests/backend/tce-04-queue-retry.e2e-spec.ts`.
