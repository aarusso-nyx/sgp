# REC-07 Biometria do Candidato - Failure

Failing gate: `npm run lint` from `source` with `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam`.

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

/Users/aarusso/Development/stech/sgp/source/backend/src/ponto/afd/afd-generator.service.ts
  316:3  error  Async generator method 'streamLines' has no 'await' expression  @typescript-eslint/require-await

/Users/aarusso/Development/stech/sgp/source/backend/src/ponto/afd/afd-importer.service.ts
  10:21  error  'fileSha256' is defined but never used    @typescript-eslint/no-unused-vars
  10:43  error  'serializeAfd' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (3 errors, 0 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c eslint "{src,apps,libs,test}/**/*.ts" --fix
```
