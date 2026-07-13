---
controllers: []
migrations: []
infra: []
runbooks:
  - docs/eng/stynx-boundary.md
  - docs/user/dependency-management.md
---

# ADR-034: STYNX and DEVAI Adoption Boundary

Status: Accepted

Date: 2026-07-11

## Context

SGP already consumes selected published STYNX packages, but most declared
cross-cutting packages are not composed into the runtime. SGP also has DEVAI
configuration and retained state without an installed CLI or an executable
inventory, sensor, and scorecard pipeline. Package declarations alone do not
prove adoption.

SGP remains both an application and a DEVAI runtime host. Its eight runtimes,
canonical SQL, RLS policy, authorization policy, audit persistence, generated
API contracts, regulatory outputs, and external-service boundaries remain SGP
responsibilities.

## Decision

Published `@stynx-nyx/*` packages own generic platform mechanisms. SGP owns
product policy and adapts those mechanisms at the boundaries described in
`docs/eng/stynx-boundary.md`. The planned backend adaptation root is
**backend/src/stynx/**; frontend adaptation is limited to
`frontend/src/app/shared/`. Existing code outside those locations is migrated
only through contract-tested, concern-by-concern cutovers.

DEVAI observes and governs the SGP plant. It may inventory source, run declared
sensors, retain evidence, and render a scorecard. It may not redefine
`docs/eng/`, weaken a gate, approve an N/A cell, change release status, or make
production changes without owner authority.

Each concern must follow this cutover order: capture the current contract, add
the STYNX adapter, prove parity, switch the named concern, and remove the old
engine. Permanent dual implementations and compatibility shims are prohibited.

## Consequences

- Package upgrades are handled as a tested version matrix with a single root
  lockfile.
- RLS remains canonical SQL enforced by SGP; STYNX data and tenancy primitives
  may carry context but cannot dilute database enforcement.
- Cognito mapping, permissions, tenant entitlement, audit SQL persistence, S3
  naming/retention, and all domain behavior remain SGP adapters or product code.
- `stynx-esocial` remains an external runtime behind the typed spool/status/audit
  boundary, with no shared database relationship.
- A wave cannot claim completion from package presence. It needs executable
  consumer evidence and the common repository gates.

## Verification

- `npm run check:registry-dependencies`
- `npm run governance:check`
- the parity and concern-specific gates recorded in
  `docs/gov/evidence/stynx-devai-adoption-inventory.md`
