Acceptance gate failed: `npm run lint`

Command:

```bash
cd source
DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint
```

Diagnostic output:

```text
/Users/aarusso/Development/stech/sgp/source/backend/src/integrations-worker/builders/cnab-remittance.builder.ts
  23:3  error  '_input' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c eslint "{src,apps,libs,test}/**/*.ts" --fix
```
