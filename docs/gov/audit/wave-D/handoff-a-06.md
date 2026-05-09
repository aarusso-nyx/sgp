# Wave D Handoff - A.06 PCD com CID e laudo

Date: 2026-05-08
Owner split: SGP backend contract + stynx-admin UI retirement
Source matrix: `docs/work/feature-audit/05-feature-matrix.md`
Route inventory: `docs/work/feature-audit/02b-backend-routes.md`

## Audit Row

| Field       | Value                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| ID          | `A.06`                                                                                                       |
| Domain      | Cadastro Pessoal                                                                                             |
| Feature     | PCD com CID e laudo                                                                                          |
| Description | Pessoa com deficiência registrada                                                                            |
| Tier        | `M1`                                                                                                         |
| Presence    | `B`                                                                                                          |
| Owner       | `SGP+stynx-admin`                                                                                            |
| Citation    | Lei 13.146/2015 (LBI); eSocial S-2200/S-2206 layout S-1.3 (gov.br/esocial, NT 04/2025)                       |
| Evidence    | hr.employee (pcd_cid column) · rh/employees/employees.controller.ts:120 · AdminFeaturePage stub in rh module |

## Stable Backend Contract

- `GET /v1/funcionarios` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:52)
- `GET /v1/funcionarios/cadastral-changes` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:60)
- `POST /v1/funcionarios/cadastral-changes/:id/approve` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:68)
- `POST /v1/funcionarios/cadastral-changes/:id/reject` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:84)
- `POST /v1/funcionarios` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:43)
- `GET /v1/funcionarios/:id/dossie` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:120)
- `GET /v1/funcionarios/:id/historico` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:128)
- `GET /v1/funcionarios/:id/tempo-servico` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:145)
- `POST /v1/funcionarios/:id/tempo-servico` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:153)
- `GET /v1/funcionarios/:id/abono-permanencia` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:171)
- `POST /v1/funcionarios/:id/abono-permanencia` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:184)
- `GET /v1/pericia/prontuarios/:id/laudo/pdf` — OpenAPI-documented controller operation (rh/employees/employees.controller.ts:205)

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

- Replace the current AdminFeaturePage route for `A.06` with a dedicated component.
- Use generated OpenAPI client operations only.
- Add list/detail/mutation states that match the backend status model in SGP.
- Preserve audit-triggering mutations and avoid client-side bypasses of SGP RBAC.

## Coordination Status

Ready for stynx-admin implementation. Notification is represented by the Wave D coordination ledger entry; no external transport is executed from this repository.
