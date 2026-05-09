# Wave D Handoff - P.01 Base legal de tratamento documentada por finalidade

Date: 2026-05-08
Owner split: SGP backend contract + stynx-admin UI retirement
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID          | `P.01`                                                                                                                                                                 |
| Domain      | LGPD                                                                                                                                                                   |
| Feature     | Base legal de tratamento documentada por finalidade                                                                                                                    |
| Description | Mapeamento legal                                                                                                                                                       |
| Tier        | `M1`                                                                                                                                                                   |
| Presence    | `P`                                                                                                                                                                    |
| Owner       | `SGP+stynx-admin`                                                                                                                                                      |
| Citation    | Lei 13.709/2018 arts. 7º, 11 — vigente                                                                                                                                 |
| Evidence    | lgpd.legal_basis_rule:72 · lgpd/public-power.controller.ts:48; LegalBasisService · AdminFeaturePage stub; LgpdEncarregado public · tests/backend/lgpd-ropa.e2e-spec.ts |

## Stable Backend Contract

- `GET /v1/admin/lgpd/public-power-treatments` — OpenAPI-documented controller operation (lgpd/public-power.controller.ts:48)
- `POST /v1/admin/lgpd/public-power-treatments` — OpenAPI-documented controller operation (lgpd/public-power.controller.ts:58)
- `PATCH /v1/admin/lgpd/public-power-treatments/:id` — OpenAPI-documented controller operation (lgpd/public-power.controller.ts:73)

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

- Replace the current AdminFeaturePage route for `P.01` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for stynx-admin implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
