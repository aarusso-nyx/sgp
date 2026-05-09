# Wave D Handoff - D.31 Subtetos

Date: 2026-05-08
Owner split: SGP backend contract + stynx-admin UI retirement
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID          | `D.31`                                                                                                                                                                       |
| Domain      | Folha — Núcleo                                                                                                                                                               |
| Feature     | Subtetos                                                                                                                                                                     |
| Description | Estados, municípios, poderes                                                                                                                                                 |
| Tier        | `M1`                                                                                                                                                                         |
| Presence    | `B`                                                                                                                                                                          |
| Owner       | `SGP+stynx-admin`                                                                                                                                                            |
| Citation    | CF art. 37 XI — vigente                                                                                                                                                      |
| Evidence    | public.system_parameter:1 (subteto per power/entity) · system-parameters/system-parameters.controller.ts:68 · TetoRemuneratorio shared · tests/backend/calc-teto.e2e-spec.ts |

## Stable Backend Contract

- `GET /v1/admin/parametros/sistema` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:33)
- `PUT /v1/admin/parametros/sistema` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:41)
- `GET /v1/admin/parametros/globais` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:49)
- `PUT /v1/admin/parametros/globais/:chave` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:57)
- `GET /v1/admin/parametros/teto-remuneratorio` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:68)
- `PUT /v1/admin/parametros/teto-remuneratorio` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:76)
- `GET /v1/admin/parametros/ats` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:84)
- `PUT /v1/admin/parametros/ats` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:92)
- `PATCH /v1/admin/feature-flags/:chave` — OpenAPI-documented controller operation (system-parameters/system-parameters.controller.ts:109)

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

- Replace the current AdminFeaturePage route for `D.31` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for stynx-admin implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
