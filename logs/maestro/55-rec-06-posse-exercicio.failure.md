Acceptance gate failed: `cd source && npm run typecheck` / backend typecheck.

Diagnostic output:

```text
> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.build.json

src/integrations-worker/dctfweb/dctfweb-builder.service.ts(432,31): error TS2339: Property 'find' does not exist on type 'Document'.
src/integrations-worker/dctfweb/dctfweb-builder.service.ts(434,15): error TS2694: Namespace '"libxmljs2"' has no exported member 'Element'.
src/integrations-worker/dctfweb/dctfweb-builder.service.ts(437,17): error TS2339: Property 'find' does not exist on type 'Document'.
src/integrations-worker/dctfweb/dctfweb-builder.service.ts(437,105): error TS2694: Namespace '"libxmljs2"' has no exported member 'Element'.
src/integrations-worker/dctfweb/dctfweb-builder.service.ts(473,34): error TS2694: Namespace '"libxmljs2"' has no exported member 'Element'.
src/integrations-worker/dctfweb/dctfweb-builder.service.ts(481,33): error TS2694: Namespace '"libxmljs2"' has no exported member 'Element'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 2
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c tsc --noEmit -p tsconfig.build.json
```

REC-06 targeted check before the gate failure: `npm --workspace backend run test -- --runInBand src/recrutamento/posse/posse.service.spec.ts` passed with 3 tests.
