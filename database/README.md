# Database

PostgreSQL is the target database engine. v0.0.1 uses canonical SQL under `database/sql` for fresh database bootstrap; Prisma owns client generation and type metadata through `backend/prisma/schema.prisma`, not migrations.

## Layout

- `sql/00-extensions.sql`: required PostgreSQL extensions.
- `sql/01-settings.sql`: session settings used while applying canonical SQL.
- `sql/02-schemas.sql`: canonical runtime schemas.
- `sql/03-public-prelude.sql`: early public enum and helper-function prelude used by later table defaults.
- `sql/10-NN-*-ddl.sql`: ordered per-schema DDL pack with enum/domain types, helper functions required by table defaults or generated columns, tables, and primary/unique/check constraints.
- `sql/40-*-functions.sql`: per-schema business functions.
- `sql/70-*-final.sql`: per-schema late DDL pack with views, materialized views, indexes, triggers, foreign keys, RLS policies, and intentional object comments.
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
