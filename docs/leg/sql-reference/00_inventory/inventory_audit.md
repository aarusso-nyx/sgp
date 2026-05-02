# Inventory Audit

## Coverage Verdict

- Inventory scope covers all source categories observed in `rhlinkcon` on `2026-04-21`.
- No silent category omission was found in the inventory artifact set.
- Requested source database name was `rhlinkcom`, but the actual online database available and inventoried was `rhlinkcon`. This remains an explicit assumption boundary for the migration.

## Internal Consistency Checks

- `feature_summary.json` matches the raw catalog counts now present in `raw/`.
- `object_catalog.json` reports these non-system categories:
  - `151` user tables
  - `143` primary keys
  - `255` foreign keys
  - `1` unique constraint
  - `7` default constraints
  - `8` routines, all from SQL Server `sysdiagrams`
- `raw/views.json`, `raw/triggers.json`, `raw/synonyms.json`, `raw/sequences.json`, `raw/user_defined_types.json`, and `raw/table_types.json` are empty arrays, consistent with `feature_summary.json`.
- `raw/check_constraints.json` is empty, so the current source inventory contains no check constraints.
- `raw/module_feature_scan.json` shows no dynamic SQL, MERGE, XML, JSON, APPLY, PIVOT, or explicit `COLLATE` usage.
- `raw/columns.json` shows:
  - `126` identity columns
  - `0` computed columns
  - `0` rowversion/timestamp columns
  - `0` XML columns
- `raw/indexes.json` contains no filtered or INCLUDE indexes, consistent with `feature_summary.json`.
- `dependency_report.md` and `raw/dependency_edges.json` align on `255` foreign-key edges and `8` SQL-expression dependency edges.

## Notable Source Characteristics

- All inventoried user tables are in schema `dbo`.
- The source has no business views, no triggers, and no application routines beyond the `sysdiagrams` support set.
- `sysdiagrams` is present as a user table plus diagram helper routines; this is a legacy SQL Server tooling surface, not proven business behavior.
- The restored dataset is small and sparse: the largest table is `dbo.flyway_schema_history` with `385` rows, while many domain tables are structurally present but empty.

## Assumptions

- Migration work should target `rhlinkcon` because `rhlinkcom` is not present in the running SQL Server instance.
- The inventory generated from the live restored database is the authoritative scope, even if older documentation uses a different database name.

## Unresolved Items

- No code-level proof has yet been gathered for whether any application path depends on the `sysdiagrams` table or routines. That must remain explicit in the final gap report.
- The source contains `sysdiagrams` support procedures that are not business logic; canonical rules currently classify them as intentional compatibility gaps unless later evidence contradicts that.

## Files Reviewed

- `sql/00_inventory/inventory_summary.md`
- `sql/00_inventory/feature_notes.md`
- `sql/00_inventory/feature_summary.json`
- `sql/00_inventory/dependency_report.md`
- `sql/00_inventory/raw/object_catalog.json`
- `sql/00_inventory/raw/tables.json`
- `sql/00_inventory/raw/columns.json`
- `sql/00_inventory/raw/key_constraints.json`
- `sql/00_inventory/raw/foreign_keys.json`
- `sql/00_inventory/raw/check_constraints.json`
- `sql/00_inventory/raw/indexes.json`
- `sql/00_inventory/raw/views.json`
- `sql/00_inventory/raw/routines.json`
- `sql/00_inventory/raw/triggers.json`
- `sql/00_inventory/raw/synonyms.json`
- `sql/00_inventory/raw/sequences.json`
- `sql/00_inventory/raw/user_defined_types.json`
- `sql/00_inventory/raw/table_types.json`
- `sql/00_inventory/raw/sql_expression_dependencies.json`
