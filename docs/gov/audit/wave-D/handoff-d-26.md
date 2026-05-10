# Wave D Handoff - D.26 Salário-maternidade

Date: 2026-05-08
Owner split: SGP product-domain contract + ../stynx framework admin-surface delegation
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID          | `D.26`                                                                                                                                                                 |
| Domain      | Folha — Núcleo                                                                                                                                                         |
| Feature     | Salário-maternidade                                                                                                                                                    |
| Description | Benefício previdenciário                                                                                                                                               |
| Tier        | `M1`                                                                                                                                                                   |
| Presence    | `B`                                                                                                                                                                    |
| Owner       | `stynx-framework`                                                                                                                                                      |
| Citation    | CF art. 7º XVIII; Lei 8.213/1991                                                                                                                                       |
| Evidence    | hr.leave_record:929 (type=maternidade) · rh/workflows/leaves/leaves.controller.ts:22 · AdminFeaturePage stub admin; Licencas portal · tests/backend/leaves.e2e-spec.ts |

## Stable Backend Contract

- `POST /v1/licencas` — OpenAPI-documented controller operation (rh/workflows/leaves/leaves.controller.ts:18)
- `GET /v1/licencas/:employee_id` — OpenAPI-documented controller operation (rh/workflows/leaves/leaves.controller.ts:35)
- `POST /v1/licencas/:id/aprovar` — OpenAPI-documented controller operation (rh/workflows/leaves/leaves.controller.ts:43)
- `POST /v1/licencas/:id/cancelar` — OpenAPI-documented controller operation (rh/workflows/leaves/leaves.controller.ts:57)

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

- Replace the current AdminFeaturePage route for `D.26` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for `../stynx` framework implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
