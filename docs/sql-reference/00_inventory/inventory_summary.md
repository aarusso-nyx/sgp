# Inventory Summary

- Inventory executed against `rhlinkcon` on 2026-04-21 (requested name was `rhlinkcom`).
- Artifacts are under `sql/00_inventory` and `sql/00_inventory/raw`.

## Object Counts

- DEFAULT_CONSTRAINT: 7
- FOREIGN_KEY_CONSTRAINT: 255
- primary_key: 143
- scalar_function: 1
- SQL_STORED_PROCEDURE: 7
- unique_constraint: 1
- USER_TABLE: 151

## Artifact Index

- `database_info.json`: database-level settings and collation
- `schemas.json`: schema catalog
- `object_catalog.json`: full non-system object catalog
- `tables.json`, `table_row_counts.json`, `columns.json`: table/column inventory
- `key_constraints.json`, `foreign_keys.json`, `check_constraints.json`: constraint inventory
- `indexes.json`: full index inventory including filtered/include metadata
- `views.json`, `routines.json`, `triggers.json`, `synonyms.json`: programmable object inventory and definitions
- `user_defined_types.json`, `table_types.json`, `sequences.json`: additional schema objects
- `sql_expression_dependencies.json`, `dependency_edges.json`, `dependency_report.md`: dependency graph artifacts
- `module_feature_scan.json`, `feature_summary.json`, `feature_notes.md`: behavioral feature discovery
- `seed_candidates.json`: heuristic lookup/reference data candidates
