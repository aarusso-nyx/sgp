# Database

PostgreSQL is the target database engine. v0.0.1 uses canonical SQL under `database/sql` for fresh database bootstrap; Prisma owns client generation and type metadata through `backend/prisma/schema.prisma`, not migrations.

## Layout

- `sql/00-extensions.sql`: required PostgreSQL extensions.
- `sql/01-settings.sql`: session settings used while applying canonical SQL.
- `sql/02-schemas.sql`: canonical runtime schemas.
- `sql/10-types-*.sql`: enum/domain types by schema.
- `sql/15-functions-*.sql`: helper functions required by table defaults and generated columns.
- `sql/20-tables-*.sql`: table DDL by schema.
- `sql/40-functions-*.sql`: remaining functions by schema.
- `sql/45-*.sql`: views and materialized views by schema.
- `sql/46-comments-*.sql`: intentional object comments.
- `sql/50-constraints-*.sql`, `55-indexes-*.sql`, `60-triggers-*.sql`, `70-fks-*.sql`: integrity and dependency layers by schema.
- `sql/80-rls-*.sql`: row-level security enablement and policies by schema.
- `sql/90-runtime-grants.sql`: conditional grants for externally provisioned runtime roles.
- `sql/91-reference-data.sql`: deterministic reference rows needed before application seed.
- `sql/40-seed-loader.sql`: optional psql helper for JSON seed payloads.
- `legacy-assumptions.md`: explicit list of inferred/unverified legacy decisions carried into the schema.
- `formula-engine.md`: payroll formula engine behavior and operational notes.
- `seed/`: deterministic, non-secret seed documentation and JSON fixtures.

## Apply Order

1. Apply canonical SQL with `DATABASE_URL=... npm run db:migrate`.
2. Generate Prisma Client when needed with `npm run db:generate`.
3. Load seed data through `npm run db -- seed` or controlled local SQL workflow.

v0.0.1 is a fresh implementation. Runtime schema paths do not include compatibility layers or legacy naming shims.
