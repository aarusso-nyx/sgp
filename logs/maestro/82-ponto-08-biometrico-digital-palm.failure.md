Gate failed: `npm run lint`

Diagnostics:

```text
/Users/aarusso/Development/stech/sgp/source/backend/src/folha-pagamento/operations/reintegration/reintegration-order.controller.ts
  40:42  error  '_body' is defined but never used  @typescript-eslint/no-unused-vars

/Users/aarusso/Development/stech/sgp/source/backend/src/ponto/biometria/template-enrollment.service.spec.ts
  51:12  error  Unsafe call of an `any` typed value  @typescript-eslint/no-unsafe-call

/Users/aarusso/Development/stech/sgp/source/backend/test/prova-online-lgpd-consent.e2e-spec.ts
  47:21  warning  Unsafe argument of type `any` assigned to a parameter of type `App`  @typescript-eslint/no-unsafe-argument

/Users/aarusso/Development/stech/sgp/source/backend/test/prova-online-lgpd-exclusion.e2e-spec.ts
  68:37  warning  Unsafe argument of type `any` assigned to a parameter of type `App`  @typescript-eslint/no-unsafe-argument
  82:37  warning  Unsafe argument of type `any` assigned to a parameter of type `App`  @typescript-eslint/no-unsafe-argument

✖ 5 problems (2 errors, 3 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c eslint "{src,apps,libs,test}/**/*.ts" --fix
```

Earlier verification before the acceptance gate: `npm run typecheck` passed.
