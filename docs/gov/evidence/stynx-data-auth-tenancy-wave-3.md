# STYNX Data, Auth and Tenancy Wave 3 Evidence

Date: 2026-07-12

Status: complete.

## Data session-context cutover

`DatabaseService` retains SGP's pool and transaction lifecycle but delegates
all PostgreSQL session projection to `SgpDbSessionContextApplier`, an
implementation of the STYNX `DbContextApplier` contract. The adapter is bound
through `StynxDbContextModule` under `backend/src/stynx/`.

The adapter preserves the canonical transaction-local contract:

- `SET LOCAL row_security = on`;
- `set_config(..., true)` for request, actor, tenant, permissions, groups,
  authentication, RLS bypass and PII key GUCs;
- no schema or policy ownership moved out of `database/sql/`;
- no session-wide state can survive pool release.

The governance gate rejects `set_config(...)` or `SET LOCAL row_security`
implementation outside the STYNX adapter boundary. Recruitment public-token
overrides delegate to that adapter, so no production exception remains.

## Identity, tenancy and sessions

ADR-035 retains Cognito as issuer/session authority and general UUID tenant
identifiers. `StynxAuthModule` and `StynxAuthorizationModule` are composed once
under `backend/src/stynx/`; SGP supplies the Cognito verifier,
group-to-permission mapper, general UUID resolver and strict principal-tenant
entitlement policy through STYNX contracts.

The UUIDv7-only STYNX tenancy interceptor and STYNX local signing/Redis session
runtime are intentionally not mounted because they would create a second
identity authority. Existing `request.actor`, `req.user`, permission metadata,
session endpoints and error contracts remain covered by unit and e2e parity
tests.

## Exit evidence

- all backend unit and e2e suites;
- DB reset, canonical SQL bootstrap and cross-tenant RLS suite;
- API alignment, typecheck, lint, formatting and governance;
- DEVAI sensors, scorecard and chained DB evidence.
