# Wave D Handoff - H.01 Vale-transporte

Date: 2026-05-08
Owner split: SGP product-domain contract + ../stynx framework admin-surface delegation
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ID          | `H.01`                                                                                                                                      |
| Domain      | Benefícios                                                                                                                                  |
| Feature     | Vale-transporte                                                                                                                             |
| Description | Desconto até 6%                                                                                                                             |
| Tier        | `M1`                                                                                                                                        |
| Presence    | `P`                                                                                                                                         |
| Owner       | `stynx-framework`                                                                                                                           |
| Citation    | Lei 7.418/1985; Decreto 95.247/1987 — vigentes                                                                                              |
| Evidence    | hr.employee_transit_benefit:630; hr.transit_benefit:1570 · rh/workflows/rh-workflows.controller.ts:601 · AdminFeaturePage stub in rh module |

## Stable Backend Contract

- `GET /v1/rh/afastamentos` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:39)
- `POST /v1/rh/afastamentos` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:47)
- `PATCH /v1/rh/afastamentos/:id` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:58)
- `DELETE /v1/rh/afastamentos/:id` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:76)
- `GET /v1/rh/professional-experiences` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:87)
- `POST /v1/rh/professional-experiences` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:100)
- `PATCH /v1/rh/professional-experiences/:id` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:118)
- `DELETE /v1/rh/professional-experiences/:id` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:138)
- `GET /v1/rh/processos` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:156)
- `POST /v1/rh/processos` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:164)
- `PATCH /v1/rh/processos/:id` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:180)
- `DELETE /v1/rh/processos/:id` — OpenAPI-documented controller operation (rh/workflows/rh-workflows.controller.ts:198)

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

- Replace the current AdminFeaturePage route for `H.01` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for `../stynx` framework implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
