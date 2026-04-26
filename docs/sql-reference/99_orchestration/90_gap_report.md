# Gap Report

## Explicit Gaps

### 1. Requested vs actual source database name

- The migration request named SQL Server database `rhlinkcom`.
- The live SQL Server instance available for inventory on `2026-04-21` does not contain `rhlinkcom`.
- The online database actually restored and migrated is `rhlinkcon`.
- This is documented, not silently normalized.

### 2. SQL Server `sysdiagrams` programmability

- Source inventory contains eight SQL Server diagram-support routines:
  - `fn_diagramobjects`
  - `sp_alterdiagram`
  - `sp_creatediagram`
  - `sp_dropdiagram`
  - `sp_helpdiagramdefinition`
  - `sp_helpdiagrams`
  - `sp_renamediagram`
  - `sp_upgraddiagrams`
- These routines were not migrated to PostgreSQL.
- Justification:
  - inventory dependencies tie them to SQL Server diagram tooling, not business-domain behavior
  - the restored source dataset contains `0` rows in `dbo.sysdiagrams`
  - no application-facing views, triggers, or business routines depend on them in the frozen inventory
- Mitigation:
  - `dbo.sysdiagrams` table is still present in the PostgreSQL DDL for structural fidelity
  - validation explicitly asserts that the helper routines remain absent, so this gap stays visible

## No Other Inventory-Observed Gaps

- Inventory observed `0` views, `0` triggers, `0` standalone sequences, `0` computed columns, `0` rowversion columns, `0` XML columns, `0` user-defined types, `0` synonyms, `0` filtered indexes, and `0` `INCLUDE` indexes.
- Those categories are represented as explicit no-op or absent-by-inventory outcomes, not silent omissions.
