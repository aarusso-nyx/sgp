Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run typecheck`

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

src/folha-pagamento/operations/sifge/caixa-sifge-mock.adapter.ts(7,21): error TS2416: Property 'adapterKey' in type 'CaixaSifgeMockAdapter' is not assignable to the same property in base type 'CaixaSifgeV4Adapter'.
  Type '"caixa-sifge-mock"' is not assignable to type '"caixa-sifge-v4"'.
src/folha-pagamento/operations/sifge/caixa-sifge-mock.adapter.ts(8,21): error TS2416: Property 'layoutVersion' in type 'CaixaSifgeMockAdapter' is not assignable to the same property in base type 'CaixaSifgeV4Adapter'.
  Type '"SIFGE-MOCK-4.0"' is not assignable to type '"SIFGE-4.0"'.
src/folha-pagamento/operations/sifge/caixa-sifge-mock.adapter.ts(9,21): error TS2416: Property 'requiresSignature' in type 'CaixaSifgeMockAdapter' is not assignable to the same property in base type 'CaixaSifgeV4Adapter'.
  Type 'false' is not assignable to type 'true'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 2
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c tsc --noEmit -p tsconfig.build.json
```
