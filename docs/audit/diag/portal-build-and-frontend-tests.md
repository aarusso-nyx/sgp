# Portal Build And Frontend Test Diagnostic

Generated at: 2026-04-25T23:24:29.504Z

## Portal Build

The previous failure saved in `raw-portal-build.log` was:

- Generated client calls `this.api.put<unknown, ApiBody>(...)`.
- Portal `ApiClient` exposes `get`, `post`, `patch`, and `delete`, but no `put`.

Resolution: `source/frontend/portal/src/app/core/api/api-client.ts` now exposes a typed `put` method matching the generated client contract.

## Portal Test Script

`npm run test:portal` delegates to `npm --workspace frontend run test:portal`. The frontend workspace now defines `test:portal`, and `sgp-portal` has an Angular unit-test target using `tsconfig.portal.spec.json`.

## Frontend Package Script Snapshot

- `build:portal`: ng build sgp-portal
- `test:admin`: ng test sgp-admin --watch=false
- `test:portal`: ng test sgp-portal --watch=false
