# Database

PostgreSQL is the target database engine and Prisma owns the base schema under `source/backend/prisma/schema.prisma`.

## Layout

- `sql/00-extensions.sql`: required PostgreSQL extensions.
- `sql/01-audit.sql`: audit append helper and metadata index.
- `sql/10-auth.sql`: permission catalog and profile permission matrix views.
- `sql/11-rls-context.sql`: helper functions to read request-scoped session context for RLS.
- `sql/12-rls-policies.sql`: strict row-level security policies for operational tables.
- `sql/20-sgp-core.sql`: portal materialized projections (`portal.mv_employee_directory`, `portal.mv_payroll_run_summary`) and portal read-only grants.
- `sql/25-payroll-formula-engine.sql`: folia-inspired payroll formula compilation/evaluation engine (`payroll_calc` schema, cache, triggers, evaluator).
- `sql/30-integrity-checks.sql`: check constraints Prisma cannot model directly.
- `sql/40-seed-loader.sql`: optional psql helper for JSON seed payloads.
- `sql/50-gestao-master-data-seed.sql`: baseline data for persistent Gestao master-data resources.
- `legacy-assumptions.md`: explicit list of inferred/unverified legacy decisions carried into the schema.
- `formula-engine.md`: payroll formula engine behavior and operational notes.
- `seed/`: deterministic, non-secret seed documentation and JSON fixtures.

## Apply Order

1. Run Prisma migrations.
2. Apply SQL support files in lexical order.
3. Load seed data through `npm --prefix source run db -- seed` or controlled local SQL workflow.

v0.0.1 is a fresh implementation. Runtime schema paths do not include compatibility layers or legacy naming shims.
