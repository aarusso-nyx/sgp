# ADR-035: Cognito Sessions and General UUID Tenant Identity

Status: Accepted

Date: 2026-07-12

## Context

SGP's accepted identity contract uses Cognito-issued tokens and general UUID
tenant identifiers. The pinned STYNX tenancy interceptor requires UUIDv7 tenant
identifiers, while the STYNX sessions module introduces a separate token
signing key set and Redis-backed session lifecycle. Enabling either default
would change valid claim shapes, tenant identifiers, issuer ownership, and
operations without a product requirement.

STYNX exposes narrower contracts for token verification, principals, tenant
resolution, tenant entitlement, authorization and database session context.
These contracts support SGP's identity semantics without duplicating a generic
auth engine.

## Decision

Cognito remains SGP's token issuer and session authority. SGP retains general
UUID tenant identifiers and does not mount the UUIDv7-only STYNX tenancy
interceptor or the STYNX local session-signing runtime.

SGP composes STYNX `StynxAuthModule` and `StynxAuthorizationModule` through the
single adapter boundary under `backend/src/stynx/`. The SGP adapters provide:

- Cognito verification and group-to-permission mapping through the STYNX
  `TokenVerifier` and `Principal` contracts;
- general UUID selection through `TenantResolver`;
- strict membership in `Principal.tenants` through
  `TenantEntitlementPolicy`;
- STYNX authorization evaluation while preserving `request.actor`, `req.user`,
  permission decorators and accepted error behavior;
- Cognito-backed product session workflows without a second signing authority.

## Consequences

- A requested tenant not present in the verified principal is rejected before
  product handlers and RLS queries.
- Multi-tenant users may select any entitled general UUID tenant.
- There is no tenant-ID migration, second JWT issuer, local signing-key
  rotation, or Redis session dependency in this adoption wave.
- A future move to UUIDv7 or STYNX-signed sessions requires a superseding ADR,
  migration plan, operational key/store evidence and contract tests.

## Verification

- identity adapter composition and multi-tenant entitlement unit tests;
- unauthorized, multi-permission and request-actor e2e tests;
- DB/RLS cross-tenant suite;
- `npm run governance:check`.
