Acceptance gate failed: `npm run lint`

Command:

```bash
cd source
DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint
```

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

/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/submission/retry-strategy.service.ts
  99:30  error  'error ?? ''' will use Object's default stringification format ('[object Object]') when stringified  @typescript-eslint/no-base-to-string

/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/submission/soap-client.service.ts
  106:16  error  Unsafe array destructuring of a tuple element with an `any` value                                    @typescript-eslint/no-unsafe-assignment
  183:29  error  'error ?? ''' will use Object's default stringification format ('[object Object]') when stringified  @typescript-eslint/no-base-to-string

✖ 3 problems (3 errors, 0 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c eslint "{src,apps,libs,test}/**/*.ts" --fix
```
