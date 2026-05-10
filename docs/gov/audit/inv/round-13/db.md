# Database Inventory — Round 13

Narrative wrapper around `docs/gov/audit/inv/round-13/schema-digest.json` and
the round-13 refresh of [`docs/gov/audit/schema-digest.md`](../../schema-digest.md).

## Headline Counts (from `schema-digest.md`)

| Metric                  | Round 13 |
| ----------------------- | -------: |
| Tables                  |      281 |
| RLS-enabled tables      |      277 |
| RLS policies            |      587 |
| Foreign keys            |      673 |
| Indexes                 |    1 008 |
| Triggers                |      252 |
| Classification comments |      119 |

Source: [docs/gov/audit/schema-digest.md:5](../../schema-digest.md).

## Domain Clusters

Schemas observed in `database/sql/` DDL packs (per file naming `10-NN-<domain>-ddl.sql`):

- `avaliacao` — appraisal/career-plan domain (`database/sql/10-01-avaliacao-ddl.sql`).
- `payment` — payments/operations (`database/sql/10-03-payment-ddl.sql`).
- `fiscal` — DCTFWeb, EFD-Reinf, DIRF, GPS, SIAFIC, yearly aggregates
  (`database/sql/10-04-fiscal-ddl.sql`; specialised packs
  `database/sql/16-esocial-events.sql`, `database/sql/17-det-projection.sql`,
  `database/sql/70-tce-final.sql`).
- `hr` — administrative process, absences, classifications
  (`database/sql/10-05-hr-ddl.sql`).
- `payroll_calc` / `payroll` — folha calculation and persistence
  (`database/sql/10-06-payroll_calc-ddl.sql`,
  `database/sql/10-07-payroll-ddl.sql`,
  `database/sql/10-15-payroll-bank-config-ddl.sql`).
- `ponto` — time and attendance (`database/sql/10-08-ponto-ddl.sql`).
- `public_data` / `public` — concursos and public-facing reads
  (`database/sql/10-09-public_data-ddl.sql`,
  `database/sql/10-10-public-ddl.sql`).
- `recrutamento` — recruitment/concursos
  (`database/sql/10-11-recrutamento-ddl.sql`).
- `saude` — occupational health (`database/sql/10-12-saude-ddl.sql`).
- `tce` — TCE submission state (`database/sql/10-13-tce-ddl.sql`).
- `lgpd` — ROPA, legal basis, DSAR, RCIS
  (`database/sql/10-14-lgpd-ddl.sql`,
  `database/sql/18-lgpd-international-transfer.sql`).
- Cross-cutting: PII comments and encryption
  (`database/sql/13-pii-comments.sql`,
  `database/sql/15-pii-encryption.sql`,
  `database/sql/15a-pii-encryption-rotation.sql`),
  FK indexes and missing-FK closure
  (`database/sql/14-fk-indexes.sql`,
  `database/sql/15-missing-fks.sql`),
  audit/partition/runtime-grants
  (`database/sql/40-audit-functions.sql`,
  `database/sql/40-partition-functions.sql`,
  `database/sql/90-runtime-grants.sql`,
  `database/sql/92-audit-final.sql`).

## RLS Posture

- 277 of 281 tables have RLS policies attached (98.6%); 587 policies in total.
- Tenant scoping uses composite `(tenant_id, ...)` PKs throughout fiscal/payroll
  domains (e.g. `fiscal.dctfweb_declaration`,
  `fiscal.efd_reinf_event`, `fiscal.gps_remittance`,
  cited in `docs/gov/audit/schema-digest.md`).
- 4 tables remain RLS-`no` per the digest. These are reference/lookup tables
  (`fiscal.gps_payment_code` etc., `database/sql/10-04-fiscal-ddl.sql`) where
  cross-tenant read is intentional. Cross-check: confirm no tenant-scoped writes
  hit these tables in any controller path.

## Indexes and FKs

- 1 008 indexes vs 673 FKs gives ~1.5 indexes per FK on average. FK index
  coverage is enforced through `database/sql/14-fk-indexes.sql` plus
  `database/sql/15-missing-fks.sql` and verified by `npm run db:fk-coverage`
  (per dispatcher metadata in `scripts/run.mjs`).

## Triggers and Audit

- 252 triggers; cross-cutting audit hooks live in
  `database/sql/40-audit-functions.sql` and
  `database/sql/92-audit-final.sql`.

## Smells / Watch-list

- `prisma/schema.prisma` is non-runtime per stack contract; verify no backend
  module imports it for query construction. Round 13 spot-check is by
  inventory only — no dynamic check executed here.
- Reference-data tables marked `rls=no` (4 tables) deserve a manual
  cross-tenant write spec if any future ticket allows tenant-scoped writes
  against them.
- LGPD international-transfer pack is one file
  (`database/sql/18-lgpd-international-transfer.sql`) and not domain-clustered;
  acceptable for v0.0.1 scope.

## Legacy Parity Cue

Legacy reference DDL lives under
`docs/leg/sql-reference/{00_inventory,01_prelude,10_core_ddl,20_programmability,30_seed_data,40_validation,99_orchestration}/`.
See [legacy-parity.md](legacy-parity.md) for the round-by-round narrative.
