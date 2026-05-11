---
controllers:
  - backend/src/portal/portal.controller.ts
  - backend/src/report-service/report-service.controller.ts
  - backend/src/report-service/payslip/payslip.controller.ts
  - backend/src/report-service/yearly-income/yearly-income.controller.ts
  - backend/src/det/det.controller.ts
  - backend/src/integrations-worker/dctfweb/dctfweb.controller.ts
  - backend/src/integrations-worker/efd-reinf/efd-reinf.controller.ts
  - backend/src/integrations-worker/dirf/dirf.controller.ts
  - backend/src/integrations-worker/gps/gps.controller.ts
  - backend/src/integrations-worker/cnab240/return/cnab240-return.controller.ts
migrations:
  - database/sql/19-idempotency-keys.sql
infra: []
runbooks: []
---

# ADR-031: Centralised Idempotency Interceptor

Status: Accepted

Date: 2026-05-10

## Context

SGP already has domain-specific idempotency in payroll imports, queue adapters,
spool consumers, and external mock relays. Those controls remain valid for
domain convergence, but HTTP mutation idempotency is scattered across adapter
code and cannot be proven consistently for public API calls.

Dim 6 robustness closure requires one tenant-scoped HTTP contract for replaying
successful mutation responses, rejecting key/body drift, and surfacing in-flight
duplicate submissions predictably.

## Decision

SGP will use a NestJS `IdempotencyInterceptor` and `@Idempotent()` decorator for
mutating routes that are safe to replay by idempotency key.

The interceptor persists request state in `public.idempotency_keys` with:

- tenant-scoped composite key `(tenant_id, key_hash)`,
- request hash for same-key/different-body detection,
- status `processing`, `completed`, or `failed`,
- response snapshot for completed replay,
- TTL timestamp for cleanup and replay expiry.

Routes without an `Idempotency-Key` header continue with normal execution. When
the header is present, duplicate calls with the same key and same request body
return the stored response snapshot without re-running the handler. Duplicate
calls with the same key and a different request body return conflict. Stale
`processing` rows can be reclaimed after the configured stale interval.

The interceptor is registered in the shared HTTP runtime provider set so both
core API and portal API observe the same behavior.

Request cancellation is also normalised at the request-context layer. HTTP
runtime code receives an `AbortSignal` that is aborted on client disconnect and
is available to downstream outbound calls.

## Alternatives Considered

- Redis-backed deduplication: rejected for the current baseline because SGP
  already requires PostgreSQL for tenant/RLS behavior and the table keeps the
  proof surface inside canonical SQL.
- Per-controller manual idempotency: rejected because it repeats policy and
  makes coverage hard to audit across mutating routes.
- External API gateway idempotency: rejected because SGP still needs tenant,
  request-hash, audit, and replay semantics inside the application boundary.

## Consequences

- New idempotent mutation routes must use `@Idempotent()`.
- Tests must cover replay, key/body conflict, stale processing reclaim, and
  tenant/RLS posture for `public.idempotency_keys`.
- Domain-level idempotency remains in payroll/import/queue code when it protects
  downstream convergence, but HTTP duplicate suppression is handled centrally.
- Operators can later add a cleanup job for expired idempotency rows without
  changing route contracts.

## Rollback

Remove `@Idempotent()` annotations from affected routes and unregister the
interceptor from shared app providers. The database table can remain inert until
a later migration removes it.
