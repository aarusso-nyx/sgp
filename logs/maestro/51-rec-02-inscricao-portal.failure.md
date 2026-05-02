Gate failed: `npm run lint`

Command:

```bash
cd /Users/aarusso/Development/stech/sgp/source
DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint
```

Diagnostic output after fixing the slice-owned lint issue:

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


/Users/aarusso/Development/stech/sgp/source/backend/src/saude/program/health-program.service.spec.ts
  41:42  error  Unsafe return of a value of type `any`  @typescript-eslint/no-unsafe-return
  41:42  error  Unsafe call of an `any` typed value     @typescript-eslint/no-unsafe-call

/Users/aarusso/Development/stech/sgp/source/backend/test/ponto-base.e2e-spec.ts
   95:13  error  Unsafe call of an `any` typed value  @typescript-eslint/no-unsafe-call
  186:11  error  Unsafe call of an `any` typed value  @typescript-eslint/no-unsafe-call

✖ 4 problems (4 errors, 0 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c eslint "{src,apps,libs,test}/**/*.ts" --fix
```

Slice-owned pre-gate checks that passed before the failing acceptance gate:

```text
npm --workspace backend run test -- inscricao.service.spec.ts exemption.service.spec.ts --runInBand
Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total

npm --workspace backend run test:e2e -- inscricao-public.e2e-spec.ts --runInBand
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

Per the slice instruction, subsequent acceptance gates were not run after this gate failure.
