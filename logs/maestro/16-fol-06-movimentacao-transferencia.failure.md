Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Diagnostic output:

```text
[db-smoke] running prisma migrations
Applying migration `20260501170000_fol06_movimentacao`

The following migration(s) have been applied:

migrations/
  └─ 20260501170000_fol06_movimentacao/
    └─ migration.sql

All migrations have been successfully applied.
...
[db-smoke] validated HR-08 immutable history, career view, and probation RLS

Error: Failing row contains (9a8c2a60-b860-41d0-bcb3-3c496a1e5d2b, 00000000-0000-0000-0000-000000000100, 89b836b8-cce5-4568-bdd3-33ad524f74f1, null, null, null, null, 2024-01-01, 2024-01-01, null, HR-03 smoke, ACTIVE, 2026-05-01 15:28:49.323133-03, 2026-05-01 15:28:49.323133-03).

[db-smoke] FAILED: npm exec -- prisma db execute --file /var/folders/5c/m4tbc9kj091cw8v71dnxtrt00000gn/T/sgp-db-smoke-eAoKRi/99-hr03-vacation.sql failed with exit code 1
```

Passing gates before this failure: `npm run lint`, `npm run typecheck`, `npm run test`, and `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e`.
