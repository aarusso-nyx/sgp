# STYNX Data, Auth and Tenancy Wave 3 Evidence

Date: 2026-07-12

Status: in progress; data session-context lane complete, tenancy decision
blocked.

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

The governance gate now rejects new `set_config(...)` or `SET LOCAL
row_security` implementation outside the STYNX adapter boundary. Three existing
recruitment public-token paths remain explicitly allowlisted until the prompt's
later critical-context cutover stage; the allowlist cannot grow silently.

## Owner decision required

The pinned STYNX tenancy interceptor accepts only UUIDv7 tenant identifiers.
SGP's current accepted Cognito and database contracts accept general UUIDs and
the executable suites use non-v7 UUIDs. Enabling the interceptor would reject
currently valid tenants before authorization and RLS evaluation.

The pinned STYNX sessions module also requires a STYNX-owned signing-key and
session-store contract, while SGP currently treats Cognito as the token issuer
and exposes product session workflows without local token signing.

Wave 3 cannot claim tenancy/sessions parity until the owner chooses whether to:

1. retain Cognito-issued general UUID tenants and require STYNX to support that
   contract; or
2. authorize a tenant-ID migration to UUIDv7 and a STYNX session-signing
   architecture, including data migration and key/store operations.

Auth and authorization already execute through STYNX `AuthContextGuard`,
`AuthorizationGuard`, `Principal`, and `TokenVerifier` contracts with SGP's
Cognito verifier and group-to-permission adapter. Those paths remain unchanged
until the tenant identifier decision is resolved.
