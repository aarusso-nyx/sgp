# Wave D Handoff - I.01 Avaliação de desempenho funcional

Date: 2026-05-08
Owner split: SGP product-domain contract + ../stynx framework admin-surface delegation
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| ID          | `I.01`                                                                                                          |
| Domain      | Carreira                                                                                                        |
| Feature     | Avaliação de desempenho funcional                                                                               |
| Description | Periódica                                                                                                       |
| Tier        | `M1`                                                                                                            |
| Presence    | `P`                                                                                                             |
| Owner       | `stynx-framework`                                                                                               |
| Citation    | CF art. 41 §1º III; Lei 8.112/1990                                                                              |
| Evidence    | avaliacao.performance_record · avaliacao/avaliacao.controller.ts:34 · AdminFeaturePage stub in avaliacao module |

## Stable Backend Contract

- `GET /v1/avaliacao/desempenhos` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:34)
- `POST /v1/avaliacao/desempenhos` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:42)
- `PATCH /v1/avaliacao/desempenhos/:id` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:64)
- `GET /v1/avaliacao/progressoes` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:89)
- `POST /v1/avaliacao/progressoes` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:97)
- `GET /v1/avaliacao/simulacoes` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:118)
- `POST /v1/avaliacao/simulacoes` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:126)
- `GET /v1/avaliacao/planos-cargos` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:150)
- `POST /v1/avaliacao/planos-cargos` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:158)
- `PATCH /v1/avaliacao/planos-cargos/:id` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:174)
- `POST /v1/avaliacao/desempenhos/:id/ficha` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:191)
- `POST /v1/avaliacao/ciclos/:periodo/relatorio` — OpenAPI-documented controller operation (avaliacao/avaliacao.controller.ts:216)

## DTOs And Query Parameters

- `../stynx` framework must consume the generated OpenAPI client after `npm run api:client:generate`; do not hand-code request or response shapes.
- Query, path, and body parameters are the generated OpenAPI contract for the endpoints above.
- The UI must preserve tenant context, RBAC claims, pagination parameters where present, and server-side validation messages.

## Error Contract

- `401`: missing or invalid stynx-issued session token.
- `403`: authenticated actor lacks the permission declared by the SGP controller.
- `404`: requested domain resource is not visible in the current tenant scope or does not exist.
- `409`: domain state conflict, duplicate command, or stale mutation when the SGP service raises a conflict.
- `422/400`: DTO validation failure or invalid command payload.

## Stynx Framework Work

- Replace the current AdminFeaturePage route for `I.01` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for `../stynx` framework implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
