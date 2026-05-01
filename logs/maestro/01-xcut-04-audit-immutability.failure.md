Gate failed: `cd source && npm run lint`

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

/Users/aarusso/Development/stech/sgp/source/backend/src/common/audit/audit-required.interceptor.ts
  45:11  error  Promise-returning function provided to property where a void return was expected  @typescript-eslint/no-misused-promises

✖ 1 problem (1 error, 0 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c eslint "{src,apps,libs,test}/**/*.ts" --fix
```
