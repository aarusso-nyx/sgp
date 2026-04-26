\set ON_ERROR_STOP on

\echo '==> Prelude'
\ir ../01_prelude/01_create_schema.sql

\echo '==> Core DDL'
\ir ../10_core_ddl/dbo/10_tables_01.sql
\ir ../10_core_ddl/dbo/11_tables_02.sql
\ir ../10_core_ddl/dbo/12_tables_03.sql
\ir ../10_core_ddl/dbo/30_foreign_keys_01.sql
\ir ../10_core_ddl/dbo/31_foreign_keys_02.sql
\ir ../10_core_ddl/dbo/32_foreign_keys_03.sql
\ir ../10_core_ddl/dbo/40_indexes.sql

\echo '==> Programmability'
\ir ../20_programmability/dbo/10_views.sql
\ir ../20_programmability/dbo/20_routines.sql
\ir ../20_programmability/dbo/21_triggers.sql

\echo '==> Seed Data'
\ir ../30_seed_data/dbo/10_reference_core.sql
\ir ../30_seed_data/dbo/20_reference_dependents.sql
\ir ../30_seed_data/dbo/30_reference_associations.sql
\ir ../30_seed_data/dbo/99_identity_resets.sql

\echo '==> Validation'
\ir ../40_validation/10_inventory_coverage.sql
\ir ../40_validation/20_relational_smoke.sql
\ir ../40_validation/30_seed_smoke.sql

\echo 'Build complete.'
