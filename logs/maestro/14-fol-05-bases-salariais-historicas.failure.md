Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 lint
> node scripts/run.mjs lint

> sgp-modernization-source@0.1.0 lint:workspaces
> npm run lint:frontend && npm run lint:backend

> sgp-modernization-source@0.1.0 lint:frontend
> npm --workspace frontend run lint --if-present

> sgp-modernization-source@0.1.0 lint:backend
> npm --workspace backend run lint

> backend@0.0.1 lint
> eslint "{src,apps,libs,test}/**/*.ts" --fix

/Users/aarusso/Development/stech/sgp/source/backend/src/avaliacao/salary-history/salary-history.service.spec.ts
  32:42  error  Unsafe return of a value of type `any`  @typescript-eslint/no-unsafe-return
  32:42  error  Unsafe call of an `any` typed value     @typescript-eslint/no-unsafe-call

2 problems (2 errors, 0 warnings)
```

