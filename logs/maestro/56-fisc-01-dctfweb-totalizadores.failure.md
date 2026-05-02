Gate failed: `npm run lint`

Command:

```bash
cd source
DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint
```

Diagnostic output:

```text
/Users/aarusso/Development/stech/sgp/source/backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts
  429:5   error  'item.debitCode ?? item.codigo ?? item.code ?? sourceEvent' will use Object's default stringification format ('[object Object]') when stringified  @typescript-eslint/no-base-to-string
  555:29  error  'value ?? 0' will use Object's default stringification format ('[object Object]') when stringified                                                 @typescript-eslint/no-base-to-string
  566:23  error  'value ?? ''' will use Object's default stringification format ('[object Object]') when stringified                                                @typescript-eslint/no-base-to-string

/Users/aarusso/Development/stech/sgp/source/backend/src/recrutamento/posse/posse.controller.ts
  74:46  error  '_body' is defined but never used  @typescript-eslint/no-unused-vars

/Users/aarusso/Development/stech/sgp/source/backend/test/dctfweb-fluxo.e2e-spec.ts
  50:9  error  Unsafe return of a value of type `any`  @typescript-eslint/no-unsafe-return
  50:9  error  Unsafe call of an `any` typed value     @typescript-eslint/no-unsafe-call

✖ 6 problems (6 errors, 0 warnings)
```

Pre-gate checks completed before the formal gate run:

```text
npm --workspace backend run typecheck: passed
npm --workspace frontend run typecheck: passed
npm --workspace backend run test -- dctfweb --runInBand: passed
npm --workspace backend run test:e2e -- dctfweb --runInBand: passed
```
