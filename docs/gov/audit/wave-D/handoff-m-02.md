# Wave D Handoff - M.02 DIRF anual

Date: 2026-05-08
Owner split: SGP product-domain contract + ../stynx framework admin-surface delegation
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID          | `M.02`                                                                                                                                                                                              |
| Domain      | Fiscal                                                                                                                                                                                              |
| Feature     | DIRF anual                                                                                                                                                                                          |
| Description | Onde aplicável — extinta para fatos geradores ≥ 01/01/2025                                                                                                                                          |
| Tier        | `M1`                                                                                                                                                                                                |
| Presence    | `B`                                                                                                                                                                                                 |
| Owner       | `stynx-framework`                                                                                                                                                                                   |
| Citation    | Extinta por IN RFB para anos-base ≥ 2025; última DIRF entregue em 2025                                                                                                                              |
| Evidence    | fiscal.dirf_arquivo:287; fiscal.dirf_beneficiario:307 · integrations-worker/dirf/dirf.controller.ts:43 · frontend/src/app/features/fiscal/dirf/dirf.ts:1 · tests/backend/dirf-validacao.e2e-spec.ts |

## Stable Backend Contract

- `GET /v1/admin/fiscal/dirf` — OpenAPI-documented controller operation (integrations-worker/dirf/dirf.controller.ts:43)
- `GET /v1/admin/fiscal/dirf/:id` — OpenAPI-documented controller operation (integrations-worker/dirf/dirf.controller.ts:53)
- `GET /v1/admin/fiscal/dirf/:id/txt` — OpenAPI-documented controller operation (integrations-worker/dirf/dirf.controller.ts:36)
- `POST /v1/admin/fiscal/dirf/gerar` — OpenAPI-documented controller operation (integrations-worker/dirf/dirf.controller.ts:36)

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

- Replace the current AdminFeaturePage route for `M.02` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for `../stynx` framework implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
