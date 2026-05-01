Gate failed: `cd source && DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Preceding gates passed in this retry:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`

Diagnostic output:

```text
> sgp-modernization-source@0.1.0 db:smoke
> node scripts/db-bootstrap-smoke.mjs

[db-smoke] running prisma migrations
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pecam", schemas "hr, payroll, portal, public" at "localhost:5432"

26 migrations found in prisma/migrations

Applying migration `20260501090000_hr_01_cadastro_servidor`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260501090000_hr_01_cadastro_servidor

Database error code: 23505

Database error:
ERROR: duplicate key value violates unique constraint "permission_module_key_resource_key_action_key_key"
DETAIL: Key (module_key, resource_key, action_key)=(rh, employee, read) already exists.

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E23505), message: "duplicate key value violates unique constraint \"permission_module_key_resource_key_action_key_key\"", detail: Some("Key (module_key, resource_key, action_key)=(rh, employee, read) already exists."), hint: None, position: None, where_: None, schema: Some("public"), table: Some("permission"), column: None, datatype: None, constraint: Some("permission_module_key_resource_key_action_key_key"), file: Some("nbtinsert.c"), line: Some(673), routine: Some("_bt_check_unique") }

[db-smoke] FAILED: npm exec -- prisma migrate deploy --schema /Users/aarusso/Development/stech/sgp/source/backend/prisma/schema.prisma failed with exit code 1
```

Likely cause: the HR-01 migration upserts `public.permission` by `key`, but the target database already has an existing permission row with the same `(module_key, resource_key, action_key)` tuple and a different `key`, so the secondary unique constraint `permission_module_key_resource_key_action_key_key` rejects the insert/update.
