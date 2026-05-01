Gate failed: `cd source && DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`.

Prior gates in this retry passed: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e`.

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 db:smoke
> node scripts/db-bootstrap-smoke.mjs

[db-smoke] running prisma migrations
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pecam", schemas "hr, payroll, portal, public" at "localhost:5432"

31 migrations found in prisma/migrations

Applying migration `20260501113000_hr_03_vacation`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260501113000_hr_03_vacation

Database error code: 0A000

Database error:
ERROR: cannot alter type of a column used by a view or rule
DETAIL: rule _RETURN on view hr.v_employee_career_history depends on column "status"

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E0A000), message: "cannot alter type of a column used by a view or rule", detail: Some("rule _RETURN on view hr.v_employee_career_history depends on column \"status\""), hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(15137), routine: Some("RememberAllDependentForRebuilding") }

[db-smoke] FAILED: npm exec -- prisma migrate deploy --schema /Users/aarusso/Development/stech/sgp/source/backend/prisma/schema.prisma failed with exit code 1
```
