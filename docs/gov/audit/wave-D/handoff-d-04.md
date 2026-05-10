# Wave D Handoff - D.04 Folha de férias

Date: 2026-05-08
Owner split: SGP product-domain contract + ../stynx framework admin-surface delegation
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID          | `D.04`                                                                                                                                                                                             |
| Domain      | Folha — Núcleo                                                                                                                                                                                     |
| Feature     | Folha de férias                                                                                                                                                                                    |
| Description | Cálculo de período                                                                                                                                                                                 |
| Tier        | `M1`                                                                                                                                                                                               |
| Presence    | `P`                                                                                                                                                                                                |
| Owner       | `stynx-framework`                                                                                                                                                                                  |
| Citation    | CF art. 7º XVII                                                                                                                                                                                    |
| Evidence    | payroll.payroll_run:114 (type=ferias); hr.vacation_record:1625 · folha-pagamento/payroll/payroll.controller.ts:227 · AdminFeaturePage stub in folha module · tests/backend/calc-ferias.e2e-spec.ts |

## Stable Backend Contract

- `GET /v1/folhas` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `GET /v1/folhas/:folha_id/historico` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `PATCH /v1/folhas/:folha_id/status` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas/:folha_id/calcular` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas/:folha_id/massa` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas/:folha_id/adiantamentos` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas/decimo-terceiro/adiantamento` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas/decimo-terceiro/fechamento` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas/ferias/calcular` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas/rescisao/calcular` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)
- `POST /v1/folhas/mensal/abrir` — OpenAPI-documented controller operation (folha-pagamento/payroll/payroll.controller.ts:43)

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

- Replace the current AdminFeaturePage route for `D.04` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for `../stynx` framework implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
