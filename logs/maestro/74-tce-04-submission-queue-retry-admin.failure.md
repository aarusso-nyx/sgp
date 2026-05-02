Acceptance gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint`

Diagnostic output:

```text
/Users/aarusso/Development/stech/sgp/source/backend/src/tce/queue/tce-worker.service.ts
  42:7  error  'TCE_WORKER_PERMISSIONS' is assigned a value but never used  @typescript-eslint/no-unused-vars

1 problem (1 error, 0 warnings)
```
