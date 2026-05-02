# ES-01 Tabelas S-1xxx Failure

Failing gate: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Status before failure:
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint` passed.
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run typecheck` passed.
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test` passed: frontend admin 34/34 files, portal 7/7 files, backend 84/84 suites and 266/266 tests.
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e` passed: 35/35 suites and 90/90 tests.

Diagnostic output from failing gate:

```text
> sgp-modernization-source@0.1.0 db:smoke
> node scripts/db-bootstrap-smoke.mjs

[db-smoke] running prisma migrations
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pecam", schemas "esocial, hr, payroll, payroll_calc, portal, public" at "localhost:5432"

69 migrations found in prisma/migrations

No pending migrations to apply.
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] ensured smoke roles exist
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 00-extensions.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 01-audit.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 10-auth.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 11-rls-context.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 12-rls-policies.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 13-rls-hardening.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 20-sgp-core.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 25-payroll-formula-engine.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 26-salary-history.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 30-integrity-checks.sql
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] applied 50-gestao-master-data-seed.sql
[db-smoke] checking forced RLS coverage
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] running deterministic seed

> backend@0.0.1 db:seed
> node prisma/seed.mjs

Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] validated schema split, tenant coverage, RLS, and portal read-only privileges
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] validated ES-07 tenant certificate RLS
Loaded Prisma config from prisma.config.ts.

Error: Failing row contains (97499922-dec4-471c-a06a-01ab689d2fab, 2026-05-01 22:44:32.618434-03, null, null, null, CREATE, esocial.s1xxx_dispatch_state, smoke-source, esocial.s1xxx_dispatch_state, null, null, null, {"eventKind": "S-1000", "lastPayloadHash": "aaaaaaaaaaaaaaaaaaaa..., null, null).


[db-smoke] FAILED: npm exec -- prisma db execute --file /var/folders/5c/m4tbc9kj091cw8v71dnxtrt00000gn/T/sgp-db-smoke-1yGWrg/99-es01-tabelas-s1xxx.sql failed with exit code 1
```

Likely immediate cause: the ES-01 `esocial.s1xxx_dispatch_state` audit trigger attempted to append `public.audit_event` without a non-null tenant context for the audit row during the smoke insert/update path.
