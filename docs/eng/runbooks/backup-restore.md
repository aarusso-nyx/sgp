# Backup Restore Runbook

Owner: TBD
Last reviewed: 2026-05-07

- Preconditions: identify the database, backup snapshot, tenant scope, and restore target.
- Procedure: restore into an isolated target first; do not overwrite live data without explicit owner authorization.
- Verification: run database smoke, alignment checks, tenant isolation probes, and selected domain tests.
