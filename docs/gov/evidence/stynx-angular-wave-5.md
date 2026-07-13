# STYNX Angular Admin and Portal Wave 5 Evidence

Date: 2026-07-12

Status: complete.

## Shared platform cutover

Both Angular applications consume the same `provideSgpStynxWeb()` provider.
That provider now composes the STYNX Angular foundation, Cognito-backed STYNX
auth, STYNX tenancy, runtime `pt-BR` i18n and the STYNX multipart upload
executor. The foundation owns bearer-token, request-ID, tenant-header and
normalized error interception. The parallel SGP bearer and no-op error
interceptors were removed; SGP retains only W3C `traceparent` generation.

The STYNX auth provider is the existing `StynxSessionService`, so login,
refresh, tenant switching, permission guards and HTTP authorization share one
session state. The Admin and Portal continue using their generated SGP OpenAPI
clients because those clients describe the accepted SGP routes.

## Applicability decisions

STYNX UI components are available from the published package without a root
provider. The storage executor is composed, but existing SGP document screens
retain their generated API contracts and accepted upload-registration flow.

STYNX profile and active-session providers are not mounted. Their published
SDKs require generic profile/preferences and multi-session list/revoke
endpoints that SGP does not expose. Enabling them would invent routes or create
a parallel session/profile model. Existing SGP profile and Cognito session
behavior remains authoritative until matching product contracts are accepted.
The gaps are registered as `STYNX-FE-001` and `STYNX-FE-002` in
`docs/gov/audit/stynx-frontend-follow-ups.md`.

## Proof

The shared provider contract test verifies foundation configuration, the
STYNX session auth-provider binding, upload executor and `pt-BR` catalog.
Admin and Portal Playwright journeys verify login redirect, bearer injection,
tenant header, request ID, permission denial, audit rendering and download
behavior against deterministic route fixtures. No real identity, storage or
external-provider call is part of the proof.
