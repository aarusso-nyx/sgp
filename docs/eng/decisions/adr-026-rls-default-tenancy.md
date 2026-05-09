# ADR-026: Row-Level Security as the Default Tenancy Boundary

Status: Accepted

Date: 2026-05-08

## Context

SGP is a multi-tenant system. Tenant isolation is enforced at the database
layer through PostgreSQL Row-Level Security (RLS): `database/sql/*.sql` carries
544 RLS-related lines (counted in the 2026-05-08 audit at
`docs/work/qa/report.md`), and per-entity cross-tenant specs under
`tests/rls/` exercise ~30 distinct entities (e.g.,
`employee-cross-tenant.spec.ts`, `dirf-cross-tenant.spec.ts`,
`abono-permanencia-cross-tenant.spec.ts`).

The decision was implicit until now: every tenant-scoped table must enable RLS
and every tenant-scoped query must run inside a tenant-scoped session. Without
an ADR, a future contributor could plausibly add a tenant-scoped table without
RLS and only discover the gap after a privacy incident.

## Decision

**Row-Level Security on every tenant-scoped PostgreSQL table is mandatory and
non-negotiable.** Specifically:

- Every table in `database/sql/` whose rows are scoped to a tenant must have
  `ENABLE ROW LEVEL SECURITY` and a per-tenant policy keyed off the runtime
  tenant context.
- The tenant context must be set at the start of each request via the
  `RequestContextStore` plus the database session settings established by
  `backend/src/database/database.service.ts`.
- Tenant context absence at query time is a fatal error
  (`tenant-context-missing.error.ts`), not a silent default.
- Cross-tenant access is permitted only through explicitly elevated
  service-role connections used by background workers; those connections must
  be auditable and gated by `iam` permissions.
- Every new tenant-scoped table requires a corresponding cross-tenant spec
  under `tests/rls/<entity>-cross-tenant.spec.ts`; the spec asserts that a
  tenant-A session cannot read or mutate tenant-B rows.

## Options Considered

- Option A: Application-layer-only tenant filtering (every query carries
  `WHERE tenant_id = ?`). Rejected because a single missing predicate
  exposes cross-tenant data and ORM convenience methods are easy to misuse.
- Option B (selected): Database-enforced RLS with application-layer tenant
  context binding. Defence-in-depth: a missing application filter still cannot
  leak data because the database refuses to return rows from another tenant's
  context.
- Option C: Schema-per-tenant isolation. Rejected for operational complexity
  (migration ordering, backup/restore, RDS connection storms, cross-tenant
  reporting) at SGP's tenant scale.

## Consequences

- DDL reviewers refuse new tenant-scoped tables that lack RLS.
- New entities must ship with both `database/sql/<NN>-...-ddl.sql` RLS clauses
  and `tests/rls/<entity>-cross-tenant.spec.ts`.
- The cross-tenant spec corpus is the standing acceptance gate; it must stay
  green in CI under `npm run test`.
- Background workers that legitimately span tenants must justify the
  service-role connection in code review and route through the `iam`
  permission system.

## Verification

- `database/sql/*.sql` contains 544+ RLS-related lines as of the 2026-05-08
  audit; this number should grow, not shrink, as new entities ship.
- `tests/rls/*-cross-tenant.spec.ts` is the standing test gate; new
  tenant-scoped entities add to the count.
- `backend/src/database/tenant-context-missing.error.ts` exists and is thrown
  when a query runs without tenant context.
- `npm run governance:check` includes RLS-coverage validation through the
  `inspectRlsSpecs` helper imported in
  `scripts/lib/governance/validate.mjs`.
