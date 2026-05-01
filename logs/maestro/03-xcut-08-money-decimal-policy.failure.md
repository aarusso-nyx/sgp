Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 db:smoke
> node scripts/db-bootstrap-smoke.mjs

[db-smoke] running prisma migrations
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pecam", schemas "hr, payroll, portal, public" at "localhost:5432"

21 migrations found in prisma/migrations

Applying migration `20260430153000_calc08_decimal_sweep`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260430153000_calc08_decimal_sweep

Database error code: 3F000

Database error:
ERROR: schema "previdenciario" does not exist

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E3F000), message: "schema \"previdenciario\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("namespace.c"), line: Some(3547), routine: Some("get_namespace_oid") }

[db-smoke] FAILED: npm exec -- prisma migrate deploy --schema /Users/aarusso/Development/stech/sgp/source/backend/prisma/schema.prisma failed with exit code 1
```

Earlier gates passed before this failure:

```text
DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint
DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run typecheck
DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test
```
