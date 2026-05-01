Gate failed: `npm run typecheck`

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

src/folha-pagamento/payroll/payroll.controller.ts(155,22): error TS2345: Argument of type '"payroll.run.execute"' is not assignable to parameter of type '"auditoria.read" | "auth.read" | "avaliacao.pccs.read" | "avaliacao.pccs.write" | "avaliacao.probation.write" | "avaliacao.progressao.apply" | "avaliacao.progressao.read" | ... 67 more ... | ("auditoria.read" | ... 72 more ... | "system.tax-rate.write")[]'.
src/folha-pagamento/payroll/payroll.controller.ts(168,22): error TS2345: Argument of type '"payroll.run.execute"' is not assignable to parameter of type '"auditoria.read" | "auth.read" | "avaliacao.pccs.read" | "avaliacao.pccs.write" | "avaliacao.probation.write" | "avaliacao.progressao.apply" | "avaliacao.progressao.read" | ... 67 more ... | ("auditoria.read" | ... 72 more ... | "system.tax-rate.write")[]'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 2
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c tsc --noEmit -p tsconfig.build.json
```
