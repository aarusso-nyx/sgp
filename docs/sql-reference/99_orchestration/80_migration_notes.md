# Migration Notes

- Inventory source date: `2026-04-21`.
- Requested source database name: `rhlinkcom`.
- Actual online SQL Server database inventoried and migrated from: `rhlinkcon`.
- Source engine observed: SQL Server-compatible Azure SQL Edge `15.0.2000.1574`.
- Target organization strategy: schema-first. The source has one user schema, `dbo`.
- Core translation policy overrides applied from the user request:
  - all timestamp-like source columns were translated to `TIMESTAMP WITH TIME ZONE`
  - all character/string columns were translated to `TEXT`
- The build tree is intended for `psql` execution through `sql/99_orchestration/00_build.sql` or `sql/99_orchestration/01_rebuild.sql`.
- The deterministic bootstrap seed set intentionally covers low-cardinality reference/configuration tables only; person, attachment, and payroll transaction rows were excluded from seed materialization.
- `dbo.sysdiagrams` was preserved as a table for structural/data fidelity, but the SQL Server diagram helper routines were not migrated because they are tooling artifacts rather than proven application behavior.
