Gate failed: `cd source && DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 db:smoke
> node scripts/db-bootstrap-smoke.mjs

[db-smoke] running prisma migrations
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pecam", schemas "hr, payroll, portal, public" at "localhost:5432"

18 migrations found in prisma/migrations
All migrations have been successfully applied.
Script executed successfully.
[db-smoke] ensured smoke roles exist
[db-smoke] applied 00-extensions.sql
[db-smoke] applied 01-audit.sql
[db-smoke] applied 10-auth.sql
[db-smoke] applied 11-rls-context.sql
[db-smoke] applied 12-rls-policies.sql
[db-smoke] applied 13-rls-hardening.sql
[db-smoke] applied 20-sgp-core.sql
[db-smoke] applied 25-payroll-formula-engine.sql
[db-smoke] applied 30-integrity-checks.sql
[db-smoke] applied 50-gestao-master-data-seed.sql
[db-smoke] checking forced RLS coverage
Script executed successfully.
[db-smoke] running deterministic seed
Script executed successfully.
[db-smoke] validated schema split, tenant coverage, RLS, and portal read-only privileges
Error: ERROR: Expected employee_dependent tenant rewrite to be rejected by RLS WITH CHECK

[db-smoke] FAILED: npm exec -- prisma db execute --file /var/folders/5c/m4tbc9kj091cw8v71dnxtrt00000gn/T/sgp-db-smoke-KVSyAH/99-xcut03-rls-hardening.sql failed with exit code 1
```

The slice-specific DB/RLS gates were not run after this failure because the prompt requires stopping at the first failing gate.
