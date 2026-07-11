---
controllers: []
migrations: []
infra:
  - backend/package.json
  - frontend/package.json
runbooks:
  - docs/user/sgp-boundary-runbook.md
---

# ADR-025: Stynx Vendored Package Boundary

Status: Superseded

Date: 2026-05-08

Superseded by: [ADR-032](adr-032-github-packages-runtime-dependencies.md)

## Context

SGP consumes the Stynx framework through `file:../../stynx/.release/local-npm/...`
package references in `backend/package.json` and `frontend/package.json`. The
backend imports cover `@stynx/auth`, `@stynx/audit`, `@stynx/contracts`,
`@stynx/core`, `@stynx/data`, `@stynx/health`, `@stynx/i18n`,
`@stynx/idempotency`, `@stynx/logging`, `@stynx/privacy`, `@stynx/ratelimit`,
`@stynx/sessions`, `@stynx/storage`, and `@stynx/tenancy`. The frontend
consumes the matching `@stynx-web/*` packages.

`AGENTS.md §2` instructs agents to "use stubs, mocks, sandbox adapters, contract
fixtures, or golden files for eSocial, ICP-Brasil, GovBR, TCE, banking, SIAFIC,
storage, and other external integrations unless the user explicitly requests
real-service tests." The QA inspection at `docs/work/qa/report.md` flags the
Stynx boundary as a load-bearing decision absent an ADR — without one, future
contributors may treat Stynx packages as either ordinary dependencies or as
ad-hoc shims, and the boundary erodes.

## Decision

`@stynx/*` and `@stynx-web/*` packages are **explicit, package-shaped, vendored
framework dependencies**. Their boundary is treated as a contract surface, not
ordinary library API. Specifically:

- Backend code may import only from the published package surface (`@stynx/*`
  module entrypoints), not from internal Stynx paths.
- Stynx packages must not be edited from within the SGP repo. Upstream changes
  flow through the `file:` artefact swap.
- Where Stynx provides a concern (auth, idempotency, rate limit, redaction,
  tenancy, storage, sessions), SGP must consume the Stynx primitive rather than
  reinventing it locally.
- SGP-domain logic (permissions, payroll, eSocial, RH, TCE, etc.) lives in
  `backend/src/`, not in Stynx. Stynx may host shared platform primitives only.
- Cross-tier policy: backend imports may not reach `frontend/`; frontend
  imports may not reach `backend/`; both sides reach Stynx only through their
  respective `@stynx/*` or `@stynx-web/*` package family.

Contract drift between SGP and a vendored Stynx version surfaces through the
existing `npm run governance:check` evidence loop and through the
`tests/backend/stynx-*.spec.ts` consumer specs.

## Options Considered

- Option A: Treat Stynx as an ordinary npm dependency without explicit boundary
  policy. Rejected because the `file:` consumption pattern hides version drift
  and the absence of a published registry means every consumer is responsible
  for its own contract assertions.
- Option B (selected): Treat Stynx as a vendored framework with a documented
  package-shaped boundary and consumer-side contract specs. Matches the
  current testing posture and keeps the door open to a future registry
  publication without code change on the SGP side.
- Option C: Inline copies of needed Stynx primitives into SGP. Rejected
  because it reinvents auth, idempotency, redaction, and tenancy primitives
  already maintained in Stynx.

## Historical Consequences

- Reviews of new `@stynx/*` imports check that the consumed surface is the
  package entrypoint, not an internal path.
- Reviews of `backend/src/` files refuse implementation that duplicates a
  Stynx concern when a Stynx primitive already covers it.
- Cross-tier import gate in `scripts/lib/governance/validate.mjs`
  (`architecture:forbidden-cross-tier-imports`) continues to enforce the
  no-backend↔frontend rule.
- The local-artifact installation model has been replaced by the published
  GitHub Packages model in ADR-032.

## Verification

- `architecture:forbidden-cross-tier-imports` governance check stays green.
- `tests/backend/stynx-*.spec.ts` (e.g., `stynx-esocial-event-class-contract.spec.ts`,
  `stynx-esocial-spool-update-consumer.spec.ts`,
  `stynx-esocial-audit-consumer.spec.ts`) exercise the Stynx contract surface
  the SGP runtime depends on.
- `backend/package.json` and `frontend/package.json` continue to declare
  `@stynx/*` and `@stynx-web/*` as `file:` references; any switch to a
  registry-published version requires a follow-up ADR.
