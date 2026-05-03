# Observability Worker Backpressure

Wave 7 worker runtimes expose queue and active-claim pressure before each long-running poll.

## Metrics

- `sgp_queue_depth{queue}` records queued work by worker name.
- `sgp_worker_active_claims{worker}` records work already claimed or running by worker name.
- `sgp_audit_events_emitted_total{controller,route}` records persisted audit events for mutation coverage.

## Worker Poll Policy

The long-running `sgp-esocial-worker`, `sgp-integrations-worker`, and `sgp-report-worker` entrypoints call `backpressureStatus()` before `pollOnce()`. A poll proceeds only when available capacity is positive:

`available_capacity = poll_limit - active_claims`

If queue depth is zero or active claims consume the configured capacity, the loop logs `poll skipped` and does not claim more work on that interval. One-shot and HTTP-triggered `pollOnce()` keep their existing behavior for operator-initiated drains and tests.

## Configuration

- `ESOCIAL_WORKER_POLL_LIMIT` defaults to `10`.
- `INTEGRATIONS_WORKER_POLL_LIMIT` defaults to `10`.
- `REPORT_WORKER_POLL_LIMIT` defaults to `10`.

The dashboard and alert configuration for audit coverage and worker pressure are governed under `docs/gov/observability/`.
