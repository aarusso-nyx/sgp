# STYNX Frontend Follow-ups

Date registered: 2026-07-12

Owner: SGP product and platform owners

These items are planned follow-ups from Wave 5. They do not authorize new
public APIs or a parallel STYNX product model.

| ID           | Status  | Gap                                                       | Dependency                                                                                                | Acceptance condition                                                                                                                                                                                                       |
| ------------ | ------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STYNX-FE-001 | PLANNED | STYNX profile/preferences provider is not mounted.        | An accepted `docs/eng/` profile and preferences API contract aligned with SGP employee/profile ownership. | Backend DTOs, RBAC, audit, tenant/RLS behavior, generated clients, Admin/Portal journeys and `provideStynxProfile()` adapter pass the normal API/frontend gates.                                                           |
| STYNX-FE-002 | PLANNED | STYNX active-session list/revoke provider is not mounted. | An accepted owner decision for Cognito-compatible multi-session inventory and revocation semantics.       | Backend list/revoke/revoke-others contracts, positive and negative authorization tests, audit evidence, generated clients and `provideStynxSessions()` journeys pass without introducing a second token/session authority. |

Reopen either item only after its dependency is accepted by the named owner.
Until then, Wave 5's generated SGP clients, profile flows and Cognito-backed
`StynxSessionService` remain authoritative.
