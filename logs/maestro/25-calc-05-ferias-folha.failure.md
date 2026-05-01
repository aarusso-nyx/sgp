Acceptance gate failed: `npm run db:smoke`

Previously passed in this retry:
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run typecheck`
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint`
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test`
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 db:smoke
> node scripts/db-bootstrap-smoke.mjs

[db-smoke] running prisma migrations
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pecam", schemas "hr, payroll, portal, public" at "localhost:5432"

55 migrations found in prisma/migrations

No pending migrations to apply.
...
[db-smoke] validated FOL-01 rubricas formulas, preview, audit, and RLS
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] validated CALC-02 IRRF compute function and tax_rate RLS
Loaded Prisma config from prisma.config.ts.

Script executed successfully.
[db-smoke] validated CALC-03 RPPS compute function, bypass audit, and tax_rate RLS
Loaded Prisma config from prisma.config.ts.

Error: Failing row contains (ac657e47-1514-4ada-bbd8-3c22f70c3c50, 2026-05-01 19:23:11.533572-03, null, null, null, CREATE, hr.vacation_record, c5d36055-ce52-4b22-968d-516bf8ab7089, hr.vacation_record, null, null, null, {"new": {"id": "c5d36055-ce52-4b22-968d-516bf8ab7089", "days": 3..., null, null).

[db-smoke] FAILED: npm exec -- prisma db execute --file /var/folders/5c/m4tbc9kj091cw8v71dnxtrt00000gn/T/sgp-db-smoke-8a0v9J/99-calc05-ferias.sql failed with exit code 1
```
