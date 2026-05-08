# API Contract Authority

This directory records the current API contract workflow. SGP does not keep a
second hand-authored API tree here; backend controllers and DTOs generate the
OpenAPI surface, and governance stores generated evidence under `docs/gov`.

## Canonical Flow

1. Backend controllers and DTOs define the public API contract.
2. `npm run api:spec:check` validates the OpenAPI contract.
3. `npm run api:client:generate` refreshes the frontend client under
   `frontend/src/app/core/api/generated`.
4. `npm run api:alignment:check -- --json` verifies route, client, and
   documentation alignment.
5. `docs/gov/generated/api/route-alignment.json` retains the generated route
   alignment evidence.

## Generated Artifacts

- `frontend/src/app/core/api/generated/openapi-client.ts`: generated frontend
  client consumed by admin and portal code.
- `frontend/src/app/core/api/generated/openapi-core.json`: generated OpenAPI
  contract snapshot for frontend tests and drift checks.
- `docs/gov/generated/api/route-alignment.json`: generated route alignment
  evidence, including SGP-owned routes and owner-deferred
  `ADMIN_INSTALL_LATER` routes.

## Maintenance Rule

Public API changes require code, OpenAPI/client generation, route alignment, and
tests to move together. Scratch notes under `docs/work` are not API authority.
