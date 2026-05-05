# Round 6 Database Inventory

- `database/sql/16-esocial-spool.sql` adds `public.esocial_spool` with tenant
  RLS, payload hash idempotency, source-ref GIN index, status indexes, and LGPD
  comment application.
- `database/sql/13-pii-comments.sql` adds
  `public.sgp_apply_esocial_spool_pii_comments()` so comments apply after the
  new 16-file table exists.
- `database/sql/92-audit-final.sql` keeps the generic audit trigger coverage and
  adds `audit_event.correlation_id` plus a supporting correlation/action index
  for R6-08 consumer idempotency checks.
- stynx-esocial local migrations under
  `/Users/aarusso/Development/stech/stynx-esocial/infra/migrations/` avoid SGP
  schema FKs and FDW/peering/replication primitives.
