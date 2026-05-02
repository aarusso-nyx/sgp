-- Optional local helper for loading JSON seed files with psql variables.
-- Example:
--   psql "$DATABASE_URL" -v seed_file=database/seed/permission-catalog.json -f database/sql/40-seed-loader.sql
-- This file intentionally avoids credentials and does not overwrite existing records.
-- Apply the canonical SQL set with npm run db:migrate before invoking this helper.
\if :{?seed_file}
\set seed_json `cat :seed_file`
\else
\echo 'Set -v seed_file=path/to/file.json to load seed data.'
\quit 1
\endif

CREATE TEMP TABLE IF NOT EXISTS sgp_seed_payload (payload jsonb NOT NULL) ON COMMIT DROP;
TRUNCATE sgp_seed_payload;
INSERT INTO sgp_seed_payload VALUES (:'seed_json'::jsonb);
