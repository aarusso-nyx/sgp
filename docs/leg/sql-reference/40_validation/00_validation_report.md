# Validation Report

## Scope

- Owner of this scope: orchestrator-local recovery of Worker F.
- Writable scope used:
  - `sql/40_validation/10_inventory_coverage.sql`
  - `sql/40_validation/20_relational_smoke.sql`
  - `sql/40_validation/30_seed_smoke.sql`
  - `sql/40_validation/00_validation_report.md`
  - `sql/99_orchestration/00_build.sql`
  - `sql/99_orchestration/01_rebuild.sql`

## Objects Found

- Tables in inventory: `151`
- Columns in inventory: `1746`
- Primary keys: `143`
- Unique constraints: `1`
- Foreign keys: `255`
- Total SQL Server index objects: `179`
- Identity columns: `126`
- Non-identity defaults: `7`
- Views: `0`
- Triggers: `0`
- Routines intentionally treated as non-migrated `sysdiagrams` programmability: `8`

## Objects Converted

- Added inventory-driven structural validation SQL.
- Added relational smoke checks for FK validation state and explicit `sysdiagrams` gap handling.
- Added deterministic seed row-count assertions for the chosen bootstrap dataset.
- Added psql orchestration scripts for build and rebuild flows.

## Verification

- Executed: `psql -d postgres -v ON_ERROR_STOP=1 -v db_name=rhlinkcon_pg_migration_check -f sql/99_orchestration/01_rebuild.sql`
- Result: scratch database rebuild completed successfully, including core DDL, indexes, no-op programmability artifacts, seed inserts, identity resets, and all validation scripts.

## Assumptions

- Validation asserts the frozen inventory snapshot from `rhlinkcon`, not the user-requested but unavailable `rhlinkcom` name.
- Orchestration uses `psql` meta-commands and should be launched from the repository root or with equivalent path resolution.
- Deterministic PostgreSQL renaming is allowed, so validation focuses on object counts and behaviorally relevant presence, not exact SQL Server identifier parity.

## Unresolved Items

- Final documentation must keep the intentional non-migration of `sysdiagrams` routines and the source database-name mismatch explicit.

## Blockers

- None for this scope.
