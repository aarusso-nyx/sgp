\set ON_ERROR_STOP on

\if :{?db_name}
\else
\set db_name rhlinkcon_pg
\endif

\echo Rebuilding target database :db_name
\connect postgres

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = :'db_name'
  AND pid <> pg_backend_pid();

SELECT format('DROP DATABASE IF EXISTS %I', :'db_name') AS ddl \gexec
SELECT format('CREATE DATABASE %I', :'db_name') AS ddl \gexec
\connect :db_name

\ir 00_build.sql
