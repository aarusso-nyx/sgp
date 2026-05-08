# Type Safety Proof

Status: retained proof for the 2026-05-08 QA lift.

## Strict Configuration

- `backend/tsconfig.json` keeps `strict`, `noImplicitAny`,
  `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` enabled.
- `frontend/tsconfig.json` keeps Angular strict mode and now enables
  `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Generated API clients remain generated artifacts; the type lift did not
  weaken generated DTO consumption or JSON wire shapes.

## Branded Identifier Coverage

`backend/src/common/types/branded-ids.ts` defines branded identifiers for tenant,
user, employee, request, audit event, and worker job IDs. These brands are used
at request context, request-id middleware, auth tenant context, and queue
adapter boundaries while preserving plain JSON strings on the wire.

## Type Contract Gate

`npm run test:types` is dispatcher-backed through `scripts/run.mjs` and runs
`tsc --noEmit -p tests/types/tsconfig.json`.

The retained type tests in `tests/types/domain-id-contracts.ts` include
positive assignments and negative `@ts-expect-error` assertions for branded ID
mixing, generated OpenAPI DTO consumption, and boundary validation types.

## Suppression Policy

`npm run governance:check` scans active backend, frontend, script, and test TypeScript
surfaces for unapproved `@ts-ignore`, `@ts-nocheck`, `as any`, and explicit
`any` usage outside generated artifacts.
