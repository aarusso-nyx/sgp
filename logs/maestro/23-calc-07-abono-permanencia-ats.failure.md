Gate failed: `npm run test`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 test
> node scripts/run.mjs test

> sgp-modernization-source@0.1.0 test:workspaces
> npm run test:frontend && npm run test:portal && npm run test:backend

> sgp-modernization-source@0.1.0 test:frontend
> npm --workspace frontend run test:admin

> frontend@0.0.0 test:admin
> ng test sgp-admin --watch=false

FAIL |sgp-admin| src/app/features/rh/funcionarios/funcionarios.spec.ts
  RhFuncionarios > renders the real funcionarios page without AdminFeaturePage fallback
  Error: NG0303: Can't bind to 'routerLink' since it isn't a known property of 'a' (used in the '_RhFuncionarios' component template).

Test Files  1 failed | 32 passed (33)
Tests       1 failed | 62 passed (63)
```

Changes made before this gate failed:
- `source/frontend/src/app/core/navigation/admin-feature-catalog.spec.ts` expected feature count was aligned from 183 to 184 for the CALC-07 ATS parameter route.
- `source/frontend/src/app/features/rh/funcionarios/funcionarios.spec.ts` imported `MatIconModule` to satisfy the new abono permanência icon usage.
