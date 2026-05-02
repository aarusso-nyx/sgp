# REC-05 Nomeacao e Convocacao — Failure

Failing gate: `cd source && DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint`

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


/Users/aarusso/Development/stech/sgp/source/backend/src/esocial-worker/builders/s1010.builder.ts
  124:24  error  'raw ?? ''' will use Object's default stringification format ('[object Object]') when stringified  @typescript-eslint/no-base-to-string

✖ 1 problem (1 error, 0 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c eslint "{src,apps,libs,test}/**/*.ts" --fix
```

REC-05 focused checks completed before the gate: `npm --workspace backend test -- nomeacao.service.spec.ts --runInBand` passed; `npm --workspace backend run test:e2e -- nomeacao-prazo.e2e-spec.ts --runInBand` passed; `npm run typecheck:backend` passed; `npm run typecheck:frontend` passed; targeted ESLint for the REC-05 backend files passed. The failing `s1010.builder.ts` file is outside this slice and was already modified in the shared worktree, so no out-of-scope manual fix was applied.
