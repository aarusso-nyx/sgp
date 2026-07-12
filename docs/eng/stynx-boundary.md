# STYNX Runtime Boundary

Status: accepted boundary for SGP v0.0.1

SGP consumes STYNX as published platform packages while retaining ownership of
its product semantics and persistence contracts. This boundary applies to all
eight runtimes in `docs/gov/generated/runtime-topology.json`.

| Concern                    | STYNX mechanism owns                                     | SGP adapter or product layer owns                                                        |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Request context            | generic request, principal, tenant, and trace carriers   | Cognito claim mapping, required tenant policy, request IDs exposed by SGP contracts      |
| Data and tenancy           | context propagation and generic data/session primitives  | canonical SQL, PostgreSQL roles, RLS policies, tenant entitlement, transaction semantics |
| Auth and sessions          | token verification primitives, guards, session lifecycle | Cognito configuration, permission catalog, role policy, API wire behavior                |
| Audit                      | event pipeline and generic redaction hooks               | append-only SQL sink, SGP event taxonomy, retention and authorized query APIs            |
| Storage                    | object-storage primitives and presigning                 | bucket/key naming, document authorization, retention, encryption policy and audit        |
| Logging and privacy        | structured logging and privacy/redaction machinery       | governed redaction keys, product event fields, PII classification and incident policy    |
| Health                     | generic liveness/readiness contributors                  | eight-runtime topology, dependency checks and SGP response contracts                     |
| Rate limit and idempotency | reusable mechanisms                                      | route policy, tenant-scoped persistence, response replay contract and operational limits |
| i18n                       | locale/message primitives                                | Brazilian Portuguese product copy and regulatory vocabulary                              |
| Angular                    | auth, tenancy, i18n and storage providers                | Admin/Portal routes, permission UX, generated clients and product journeys               |

Backend SGP-specific composition belongs under **backend/src/stynx/**. Frontend
SGP-specific composition belongs under `frontend/src/app/shared/`. Domain code
must not import package internals or sibling repositories. Registry packages are
the only shared implementation route.

Cutovers preserve public status codes and DTOs, RLS behavior, audit records,
golden bytes, worker idempotency, and Admin/Portal journeys. A legacy path is
removed only after its parity evidence passes; a failed baseline is recorded
and repaired without weakening the contract.

DEVAI is a governance observer of this boundary. Its configuration maps the
plant and sensors but does not become product authority.

Direct STYNX dependencies are limited to packages whose public contracts SGP
imports. Profile and active-session providers remain deferred under
`STYNX-FE-001` and `STYNX-FE-002`; declaring their packages before their SGP API
contracts exist would not constitute adoption.
