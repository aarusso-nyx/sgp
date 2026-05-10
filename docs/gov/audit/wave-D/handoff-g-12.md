# Wave D Handoff - G.12 Cessão / disposição

Date: 2026-05-08
Owner split: SGP product-domain contract + ../stynx framework admin-surface delegation
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID          | `G.12`                                                                                                                                                                   |
| Domain      | Licenças                                                                                                                                                                 |
| Feature     | Cessão / disposição                                                                                                                                                      |
| Description | Entre órgãos                                                                                                                                                             |
| Tier        | `M1`                                                                                                                                                                     |
| Presence    | `B`                                                                                                                                                                      |
| Owner       | `stynx-framework`                                                                                                                                                        |
| Citation    | Lei 8.112/1990 art. 93                                                                                                                                                   |
| Evidence    | hr.employee_transfer:605 (type=cessao) · rh/employee-transfer/employee-transfer.controller.ts:51 · frontend/src/app/features/rh/employee-transfer/employee-transfer.ts:1 |

## Stable Backend Contract

- `GET /v1/rh/employee-transfer` — OpenAPI-documented controller operation (rh/employee-transfer/employee-transfer.controller.ts:35)
- `GET /v1/rh/employee-transfer/employee/:employeeId` — OpenAPI-documented controller operation (rh/employee-transfer/employee-transfer.controller.ts:43)
- `POST /v1/rh/employee-transfer` — OpenAPI-documented controller operation (rh/employee-transfer/employee-transfer.controller.ts:29)
- `POST /v1/rh/employee-transfer/:id/aprovar` — OpenAPI-documented controller operation (rh/employee-transfer/employee-transfer.controller.ts:64)
- `POST /v1/rh/employee-transfer/:id/cancelar` — OpenAPI-documented controller operation (rh/employee-transfer/employee-transfer.controller.ts:78)
- `POST /v1/rh/employee-transfer/:id/efetivar` — OpenAPI-documented controller operation (rh/employee-transfer/employee-transfer.controller.ts:29)

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

- Replace the current AdminFeaturePage route for `G.12` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for `../stynx` framework implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
