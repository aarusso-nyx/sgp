Acceptance gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`.

Diagnostic output:

```text
[db-smoke] running prisma migrations
119 migrations found in prisma/migrations
Applying migration `20260502152000_ponto_06_justificativa`
Applying migration `20260502152000_tce_03_audesp_sp_stub`
Applying migration `20260502153000_bank_05_sifge_fgts`
All migrations have been successfully applied.
...
[db-smoke] validated TCE-01 global adapter RLS, user read, worker mutation, and audit
Loaded Prisma config from prisma.config.ts.

Error: ERROR: Expected tce.submission RLS policies to require tenant and tce.submission read/manage permissions

[db-smoke] FAILED: npm exec -- prisma db execute --file /var/folders/5c/m4tbc9kj091cw8v71dnxtrt00000gn/T/sgp-db-smoke-ahzYaK/99-tce03-audesp-sp.sql failed with exit code 1
```
