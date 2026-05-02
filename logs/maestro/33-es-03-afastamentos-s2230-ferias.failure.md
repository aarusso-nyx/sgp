Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Diagnostic output:

```text
[db-smoke] running prisma migrations
Applying migration `20260502030000_es_03_afastamentos_desligamento`
All migrations have been successfully applied.
...
[db-smoke] validated HR-03 vacation balance, audit, and RLS
Loaded Prisma config from prisma.config.ts.

Error: ERROR: permission denied for table s2230_pending

[db-smoke] FAILED: npm exec -- prisma db execute --file /var/folders/5c/m4tbc9kj091cw8v71dnxtrt00000gn/T/sgp-db-smoke-MAN39G/99-hr04-medical-leave.sql failed with exit code 1
```

Previously passed in this run: `npm run lint`, `npm run typecheck`, `npm run test`, and `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e`.
