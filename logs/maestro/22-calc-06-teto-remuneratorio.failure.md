Gate failed: `cd source && npm run test`

`npm run lint` passed. `npm run typecheck` passed after adding `system.parameter.read` and `system.parameter.write` to the canonical permission seed and regenerating the backend/frontend permission catalogs. `npm run test` failed in the sgp-admin frontend test suite because the new Teto Remuneratorio catalog entry increased `ADMIN_FEATURES.length` from 182 to 183 while the spec still expects 182.

Diagnostic output:

```text
FAIL  |sgp-admin| src/app/core/navigation/admin-feature-catalog.spec.ts > admin feature catalog > covers every documented sgp-admin route from the menu spec
AssertionError: expected 183 to be 182 // Object.is equality

- Expected
+ Received

- 182
+ 183

src/app/core/navigation/admin-feature-catalog.spec.ts:9:35
  7| describe('admin feature catalog', () => {
  8|   it('covers every documented sgp-admin route from the menu spec', () => {
  9|     expect(ADMIN_FEATURES.length).toBe(182);
     |                                   ^
 10|     expect(ADMIN_NAVIGATION_SECTIONS.length).toBe(11);
 11|     expect(ADMIN_NAVIGATION_SECTIONS.every((section) => section.items.length > 0)).toBe(true);

Test Files  1 failed | 32 passed (33)
Tests  1 failed | 62 passed (63)

npm error Lifecycle script `test:admin` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/frontend
npm error workspace frontend@0.0.0
npm error location /Users/aarusso/Development/stech/sgp/source/frontend
npm error command failed
npm error command sh -c ng test sgp-admin --watch=false
```
