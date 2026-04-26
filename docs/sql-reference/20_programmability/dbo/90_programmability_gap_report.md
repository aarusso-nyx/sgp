# Programmability Gap Report: `dbo`

## Scope

- Worker scope: routines and triggers only.
- Source inventory authority: `sql/00_inventory/raw/routines.json`, `sql/00_inventory/raw/triggers.json`, `sql/00_inventory/raw/module_feature_scan.json`, `sql/00_inventory/raw/dependency_edges.json`, `sql/00_inventory/raw/sql_expression_dependencies.json`.
- Canonical rules authority: `sql/01_prelude/00_canonical_rules.md`.

## Objects Found

### Routines

Inventory found `8` routines in `dbo`, all part of the SQL Server Management Studio `sysdiagrams` support feature:

1. `dbo.fn_diagramobjects`
2. `dbo.sp_alterdiagram`
3. `dbo.sp_creatediagram`
4. `dbo.sp_dropdiagram`
5. `dbo.sp_helpdiagramdefinition`
6. `dbo.sp_helpdiagrams`
7. `dbo.sp_renamediagram`
8. `dbo.sp_upgraddiagrams`

### Triggers

- Inventory found `0` triggers in `dbo`.

## Evidence Reviewed

- `module_feature_scan.json` shows no dynamic SQL, `MERGE`, JSON, XML, cursor, temp-table, or explicit collation features in the routine set.
- `dependency_edges.json` and `sql_expression_dependencies.json` show routine dependencies only against `dbo.sysdiagrams` and, for `sp_upgraddiagrams`, legacy `dbo.dtproperties`.
- No business tables, views, functions, or procedures depend on these routines.
- `table_row_counts.json` reports `dbo.sysdiagrams` has `0` rows in the inventoried source database.
- `triggers.json` is empty.

## PostgreSQL Treatment

### Converted

- `0` routines converted.
- `0` triggers converted.

### Intentional No-Op Artifacts

- [`20_routines.sql`](/Users/aarusso/Downloads/interno-rh/sql/20_programmability/dbo/20_routines.sql:1)
  Records that no PostgreSQL routines are created because the source routine inventory is limited to non-business `sysdiagrams` support objects.
- [`21_triggers.sql`](/Users/aarusso/Downloads/interno-rh/sql/20_programmability/dbo/21_triggers.sql:1)
  Records that no PostgreSQL triggers are created because no source triggers exist.

## Explicit Gaps

The following SQL Server routines are intentionally **not** implemented in PostgreSQL:

- `dbo.fn_diagramobjects`
- `dbo.sp_alterdiagram`
- `dbo.sp_creatediagram`
- `dbo.sp_dropdiagram`
- `dbo.sp_helpdiagramdefinition`
- `dbo.sp_helpdiagrams`
- `dbo.sp_renamediagram`
- `dbo.sp_upgraddiagrams`

### Justification

- The frozen canonical rules classify `sysdiagrams` as a non-business legacy SQL Server feature.
- The source inventory provides no evidence that application logic depends on SQL Server Management Studio diagram routines.
- PostgreSQL has no native equivalent to the SQL Server diagram-management subsystem, and emulating SQL Server principal/ownership semantics for SSMS diagrams would add compatibility surface without supporting business behavior.
- `dbo.sysdiagrams` contains no rows in the inventoried database, so there is no discovered operational data that would require routine parity for replay.

## Assumptions

- The migration goal is behavioral equivalence for the application workload, not compatibility with SQL Server Management Studio database-diagram tooling.
- Handling of the `dbo.sysdiagrams` table itself, if preserved for catalog fidelity, is owned by the core DDL worker rather than this programmability worker.

## Unresolved Items

- If downstream stakeholders require continued support for SQL Server-style database-diagram administration workflows, this worker's no-op treatment is insufficient and a bespoke PostgreSQL compatibility layer would need to be designed outside the frozen canonical scope.

## Blockers

- None for the current frozen scope.
