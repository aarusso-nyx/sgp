Gate `npm run db:smoke` failed after `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e` passed with `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam`.

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 db:smoke
> node scripts/db-bootstrap-smoke.mjs

[db-smoke] running prisma migrations
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pecam", schemas "hr, payroll, portal, public" at "localhost:5432"

46 migrations found in prisma/migrations

No pending migrations to apply.
[db-smoke] ensured smoke roles exist
[db-smoke] applied 00-extensions.sql
[db-smoke] applied 01-audit.sql
[db-smoke] applied 10-auth.sql
[db-smoke] applied 11-rls-context.sql
[db-smoke] applied 12-rls-policies.sql
[db-smoke] applied 13-rls-hardening.sql
[db-smoke] applied 20-sgp-core.sql
[db-smoke] applied 25-payroll-formula-engine.sql
[db-smoke] applied 26-salary-history.sql
[db-smoke] applied 30-integrity-checks.sql
[db-smoke] applied 50-gestao-master-data-seed.sql
[db-smoke] checking forced RLS coverage
[db-smoke] running deterministic seed

> backend@0.0.1 db:seed
> node prisma/seed.mjs

[db:seed] failed: inconsistent types deduced for parameter $3
npm error Lifecycle script `db:seed` failed with error:
npm error code 1
npm error path /Users/aarusso/Development/stech/sgp/source/backend
npm error workspace backend@0.0.1
npm error location /Users/aarusso/Development/stech/sgp/source/backend
npm error command failed
npm error command sh -c node prisma/seed.mjs
[db-smoke] FAILED: npm run db:seed failed with exit code 1
```
