# Database

PostgreSQL is the target database engine. v0.0.1 uses canonical SQL under `database/sql` for fresh database bootstrap; Prisma owns client generation and type metadata through `backend/prisma/schema.prisma`, not migrations.

## Layout

- `sql/00-extensions.sql`: required PostgreSQL extensions.
- `sql/10-canonical-schema.sql`: canonical v0.0.1 schema, tables, constraints, indexes, views, materialized views, functions, triggers, and RLS policies.
- `sql/20-runtime-grants.sql`: conditional grants for externally provisioned runtime roles.
- `sql/40-seed-loader.sql`: optional psql helper for JSON seed payloads.
- `legacy-assumptions.md`: explicit list of inferred/unverified legacy decisions carried into the schema.
- `formula-engine.md`: payroll formula engine behavior and operational notes.
- `seed/`: deterministic, non-secret seed documentation and JSON fixtures.

## Apply Order

1. Apply canonical SQL with `DATABASE_URL=... npm run db:migrate`.
2. Generate Prisma Client when needed with `npm run db:generate`.
3. Load seed data through `npm run db -- seed` or controlled local SQL workflow.

v0.0.1 is a fresh implementation. Runtime schema paths do not include compatibility layers or legacy naming shims.
