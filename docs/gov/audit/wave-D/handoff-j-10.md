# Wave D Handoff - J.10 Recadastramento de inativos e pensionistas (prova de vida)

Date: 2026-05-08
Owner split: SGP backend contract + stynx-admin UI retirement
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| ID          | `J.10`                                                                                                                    |
| Domain      | Aposentadoria                                                                                                             |
| Feature     | Recadastramento de inativos e pensionistas (prova de vida)                                                                |
| Description | Validação periódica                                                                                                       |
| Tier        | `M1`                                                                                                                      |
| Presence    | `B`                                                                                                                       |
| Owner       | `SGP+stynx-admin`                                                                                                         |
| Citation    | Lei 9.527/1997; varia por ente                                                                                            |
| Evidence    | hr.recertification_campaign:1201 · previdenciario/previdenciario.controller.ts:509 · AdminFeaturePage stub previdenciario |

## Stable Backend Contract

- `GET /v1/previdenciario/regras` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:80)
- `POST /v1/previdenciario/regras` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:88)
- `PATCH /v1/previdenciario/regras/:id` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:109)
- `GET /v1/previdenciario/simulacoes` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:131)
- `POST /v1/previdenciario/simulacoes` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:139)
- `POST /v1/previdenciario/simulacoes/ec103/pedagio-100` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:58)
- `POST /v1/previdenciario/simulacoes/ec103/pedagio-50` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:58)
- `POST /v1/previdenciario/simulacoes/ec103/pontos` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:58)
- `POST /v1/previdenciario/simulacoes/ec103/idade-progressiva` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:238)
- `POST /v1/previdenciario/simulacoes/ec103/atividade-risco-professor` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:263)
- `GET /v1/previdenciario/aposentadorias` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:289)
- `POST /v1/previdenciario/aposentadorias` — OpenAPI-documented controller operation (previdenciario/previdenciario.controller.ts:297)

## DTOs And Query Parameters

- stynx-admin must consume the generated OpenAPI client after `npm run api:client:generate`; do not hand-code request or response shapes.
- Query, path, and body parameters are the generated OpenAPI contract for the endpoints above.
- The UI must preserve tenant context, RBAC claims, pagination parameters where present, and server-side validation messages.

## Error Contract

- `401`: missing or invalid stynx-issued session token.
- `403`: authenticated actor lacks the permission declared by the SGP controller.
- `404`: requested domain resource is not visible in the current tenant scope or does not exist.
- `409`: domain state conflict, duplicate command, or stale mutation when the SGP service raises a conflict.
- `422/400`: DTO validation failure or invalid command payload.

## stynx-admin Work

- Replace the current AdminFeaturePage route for `J.10` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for stynx-admin implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
