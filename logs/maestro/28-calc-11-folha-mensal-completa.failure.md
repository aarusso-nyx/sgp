Gate failed: `npm run typecheck` from `source/`.

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 typecheck
> npm run typecheck:frontend && npm run typecheck:backend

> sgp-modernization-source@0.1.0 typecheck:frontend
> npm --workspace frontend run typecheck

> frontend@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.portal.app.json && tsc --noEmit -p tsconfig.spec.json && tsc --noEmit -p tsconfig.portal.spec.json

src/app/features/folha-pagamento/competencia/folha-mensal.service.ts(59,53): error TS2345: Argument of type 'MonthlyPayrollCompetence' is not assignable to parameter of type 'Record<string, string | number | boolean | undefined>'.
  Index signature for type 'string' is missing in type 'MonthlyPayrollCompetence'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 2
npm error path /Users/aarusso/Development/stech/sgp/source/frontend
npm error workspace frontend@0.0.0
npm error location /Users/aarusso/Development/stech/sgp/source/frontend
npm error command failed
npm error command sh -c tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.portal.app.json && tsc --noEmit -p tsconfig.spec.json && tsc --noEmit -p tsconfig.portal.spec.json
```
