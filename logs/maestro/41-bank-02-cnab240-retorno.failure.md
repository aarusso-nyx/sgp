Gate: `npm run typecheck`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 typecheck
> npm run typecheck:frontend && npm run typecheck:backend

> sgp-modernization-source@0.1.0 typecheck:frontend
> npm --workspace frontend run typecheck

> frontend@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.portal.app.json && tsc --noEmit -p tsconfig.spec.json && tsc --noEmit -p tsconfig.portal.spec.json

> sgp-modernization-source@0.1.0 typecheck:backend
> npm --workspace backend run typecheck

> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.build.json

src/integrations-worker/cnab240/return/cnab240-return.controller.ts(66,9): error TS2322: Type 'ReprocessRejectedResult' is not assignable to type 'Record<string, unknown>'.
  Index signature for type 'string' is missing in type 'ReprocessRejectedResult'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 2
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c tsc --noEmit -p tsconfig.build.json
```

Executed before failure:

```text
npm --workspace backend run test -- cnab240-return-parser.service.spec.ts occurrence-mapper.service.spec.ts
Test Suites: 2 passed, 2 total
Tests: 6 passed, 6 total

npm --workspace backend run test:e2e -- cnab240-return-process.e2e-spec.ts
Test Suites: 1 passed, 1 total
Tests: 3 passed, 3 total

npm --workspace backend exec -- prisma validate --schema prisma/schema.prisma
The schema at prisma/schema.prisma is valid

npm run lint
Passed.
```
