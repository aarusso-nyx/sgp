-- dbo views migration artifact
-- Source inventory validation on 2026-04-21 found zero SQL Server views in dbo.
-- Evidence:
--   - sql/00_inventory/raw/views.json = []
--   - sql/00_inventory/feature_notes.md reports "views: 0"
--   - sql/00_inventory/raw/sql_expression_dependencies.json contains only stored procedure dependencies
-- This file is intentionally a PostgreSQL no-op so the programmability build tree remains explicit.

DO $$
BEGIN
    NULL;
END
$$;
