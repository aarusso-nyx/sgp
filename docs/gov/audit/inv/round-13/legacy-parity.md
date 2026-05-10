# Legacy Parity — Round 13

Comparison surface: `docs/leg/sql-reference/` (legacy SQL Server DDL/seed
artifacts) vs canonical `database/sql/` (PostgreSQL).

## Legacy Reference Inventory

- 94 files under `docs/leg/sql-reference/` (`find docs/leg/sql-reference -type f | wc -l`).
- ~4 402 LOC of `.sql` (`find docs/leg/sql-reference -type f -name "*.sql" | xargs wc -l`).
- Structure (per `find docs/leg/sql-reference -type d`):
  - `00_inventory/{raw,seed_rows}` — schema inventory and seed snapshots.
  - `01_prelude/` — extensions/settings.
  - `10_core_ddl/dbo/` — table DDL (legacy `dbo` schema).
  - `20_programmability/dbo/` — stored procedures, functions.
  - `30_seed_data/dbo/` — reference data.
  - `40_validation/` — legacy validation queries.
  - `99_orchestration/` — orchestration scripts.
- Authority class: legacy reference only (`AGENTS.md` §1; CLAUDE.md authority
  order). May not override `docs/eng/`. Used here as historical evidence,
  not as a target.

## Canonical Snapshot (round 13)

- 281 tables, 277 RLS-enabled, 587 policies, 673 FKs, 1 008 indexes
  (`docs/gov/audit/schema-digest.md:5`).
- Domain-clustered DDL packs under `database/sql/10-NN-<domain>-ddl.sql`.
- LGPD additions out of original legacy scope:
  `database/sql/{14-fk-indexes,15-pii-encryption,18-lgpd-international-transfer}.sql`.

## Parity Reading

The legacy reference mirrors the **structural** surface (table families,
domains: payroll, ponto, recrutamento, fiscal, hr, avaliacao). It does **not**
mirror SGP's:

- multi-tenant isolation (`tenant_id` composite PKs and 587 RLS policies are
  SGP-only),
- partition strategy (`database/sql/40-partition-functions.sql` is canonical-only),
- audit trigger family (`database/sql/40-audit-functions.sql`),
- PII encryption posture (`database/sql/15-pii-encryption.sql`,
  `15a-pii-encryption-rotation.sql`),
- LGPD ROPA/legal basis/DSAR/RCIS surface
  (`database/sql/10-14-lgpd-ddl.sql` and
  `18-lgpd-international-transfer.sql`),
- TCE/eSocial state machines (`database/sql/16-esocial-events.sql`,
  `70-tce-final.sql`).

This is by design — SGP is a v0.0.1 fresh-build per CLAUDE.md "no legacy
shims" rule. Legacy reference is consulted for column semantics and seed
catalog only, not behavior.

## Round-by-round delta

- **Round 13 vs round 11/12 inventories:** no `legacy-parity.md` was emitted
  in `docs/gov/audit/inv/round-11/` or any round-12 path; the previous full
  legacy-parity narrative lives in
  `docs/work/round-1/wave-A/...` and was not refreshed since.
- No new legacy `.sql` files were added to `docs/leg/sql-reference/` in the
  recent commit window (per `git status` clean and the recent commit subjects
  in `docs/work/round-13/00-snapshot.md`).
- Net assessment: legacy parity remains **structural-only**; no
  behavior-level parity gap was opened or closed in the round-12 closure
  edits.

## Action Items for B1

- None opened by this round. Legacy parity is informational. If owner decides
  any feature must observably match legacy column-by-column behavior, surface
  it in `docs/gov/audit/backlog-ledger.md` and let B1 absorb it.
