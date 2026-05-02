Gate failed: `npm run lint`

Diagnostic output:

```text
/Users/aarusso/Development/stech/sgp/source/backend/src/tce/queue/tce-worker.service.ts
  42:7  error  'TCE_WORKER_PERMISSIONS' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c eslint "{src,apps,libs,test}/**/*.ts" --fix
```

The ES-11 files were brought past their own lint findings before this rerun; the remaining failure is outside the ES-11 slice.
