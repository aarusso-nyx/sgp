# Wave D Handoff - M.09 EFD-Reinf v.2.1.2 — série R-4000 (substituto da DIRF)

Date: 2026-05-08
Owner split: SGP product-domain contract + ../stynx framework admin-surface delegation
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID          | `M.09`                                                                                                                                                                                                                       |
| Domain      | Fiscal                                                                                                                                                                                                                       |
| Feature     | EFD-Reinf v.2.1.2 — série R-4000 (substituto da DIRF)                                                                                                                                                                        |
| Description | Substituição definitiva da DIRF para fatos geradores ≥ 01/01/2025                                                                                                                                                            |
| Tier        | `M1`                                                                                                                                                                                                                         |
| Presence    | `B`                                                                                                                                                                                                                          |
| Owner       | `stynx-framework`                                                                                                                                                                                                            |
| Citation    | EFD-Reinf 2.1.2; NT 04/2025; NT 02/2026                                                                                                                                                                                      |
| Evidence    | fiscal.efd_reinf_event:185; fiscal.efd_reinf_item:212 · integrations-worker/efd-reinf/efd-reinf.controller.ts:40; efd-reinf-builder.service.ts:369 · AdminFeaturePage stub · tests/backend/efd-reinf-r4000-fluxo.e2e-spec.ts |

## Stable Backend Contract

- `GET /v1/admin/fiscal/efd-reinf` — OpenAPI-documented controller operation (integrations-worker/efd-reinf/efd-reinf.controller.ts:40)
- `GET /v1/admin/fiscal/efd-reinf/:id` — OpenAPI-documented controller operation (integrations-worker/efd-reinf/efd-reinf.controller.ts:52)
- `POST /v1/admin/fiscal/efd-reinf/gerar` — OpenAPI-documented controller operation (integrations-worker/efd-reinf/efd-reinf.controller.ts:60)
- `POST /v1/admin/fiscal/efd-reinf/:id/assinar` — OpenAPI-documented controller operation (integrations-worker/efd-reinf/efd-reinf.controller.ts:31)
- `POST /v1/admin/fiscal/efd-reinf/:id/transmitir` — OpenAPI-documented controller operation (integrations-worker/efd-reinf/efd-reinf.controller.ts:31)

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

- Replace the current AdminFeaturePage route for `M.09` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for `../stynx` framework implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
