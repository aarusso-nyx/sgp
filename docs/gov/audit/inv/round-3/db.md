# DB Inventory (Round 3)

Narrative wrapper around [`schema-digest.json`](./schema-digest.json) (40 050 lines) and the persistent ledger [`docs/gov/audit/schema-digest.md`](../../schema-digest.md). Authority for the schema lives in [`database/sql/`](../../../../../database/sql/).

## Counts at HEAD `50dc67c`

From [`docs/gov/audit/schema-digest.md`](../../schema-digest.md) §Counts:

| Metric                                   |            Round-3 | Round-2 (recorded in `docs/work/round-2/03b-db-inventory.md`) |   Δ |
| ---------------------------------------- | -----------------: | ------------------------------------------------------------: | --: |
| Tables                                   |                294 |                                                           294 |   0 |
| Foreign keys                             |                689 |                                                           689 |   0 |
| Indexes                                  |              1 036 |                                                         1 036 |   0 |
| RLS policies                             |                612 |                                                           612 |   0 |
| RLS-enabled tables                       | 290 / 294 (98.6 %) |                                                     290 / 294 |   0 |
| Triggers                                 |                264 |                                                           264 |   0 |
| `classification_comments` (PII tags)     |                 64 |                                                            64 |   0 |
| Raw DDL files                            |                 58 |                                                            58 |   0 |
| `prisma/schema.prisma` LOC (non-runtime) |              4 381 |                                                         4 381 |   0 |

Round-3 is a **schema freeze** vs round-2 — no DDL files added or removed. Cross-checked: `find database -name '*.sql' | wc -l` = 58; `find database -name '*.sql' | xargs wc -l` = 25 025 (vs round-2's 24 842, a +183 LOC drift inside existing files).

## Domain clusters

Schema layout (cited from raw DDL files; see [`schema-digest.md`](../../schema-digest.md) Tables section for per-table FK/RLS posture):

| Schema                    |                                                                                                Tables (~) | Authority DDL                                                                                                                                                         | Notes                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `public`                  |                                          core master/lookup, audit, document_download_audit, user_account | [`database/sql/03-public-prelude.sql`](../../../../../database/sql/03-public-prelude.sql), [`10-10-public-ddl.sql`](../../../../../database/sql/10-10-public-ddl.sql) | `audit_event` partitioned (round-2 closure).                    |
| `hr`                      | employee lifecycle, dependents, alimony, business-day catalog, organic definition, classification de atos | [`10-05-hr-ddl.sql`](../../../../../database/sql/10-05-hr-ddl.sql)                                                                                                    | Largest schema; carries most PII.                               |
| `payroll`, `payroll_calc` |                                                   competence/run/financial-record, idempotency, recálculo | [`10-06-payroll_calc-ddl.sql`](../../../../../database/sql/10-06-payroll_calc-ddl.sql), [`10-07-payroll-ddl.sql`](../../../../../database/sql/10-07-payroll-ddl.sql)  | `payroll_financial_record` partitioned.                         |
| `ponto`                   |                                                          time records, journada, AFD ingestion, biometria | [`10-08-ponto-ddl.sql`](../../../../../database/sql/10-08-ponto-ddl.sql)                                                                                              | `time_record` partitioned.                                      |
| `esocial`                 |                                   event tables S-1xxx/S-2xxx/S-3000, dispatch state, totalizadores, certs | [`10-02-esocial-ddl.sql`](../../../../../database/sql/10-02-esocial-ddl.sql)                                                                                          | 290 RLS tables include all eSocial.                             |
| `fiscal`                  |                                                                     DCTFWeb, EFD-Reinf, DIRF, GPS, SIAFIC | [`10-04-fiscal-ddl.sql`](../../../../../database/sql/10-04-fiscal-ddl.sql)                                                                                            | `dctfweb_*`, `efd_reinf_*`, `siafic_sync_*` carry tenant_id PK. |
| `tce`                     |                                                                 state-catalog, RREO/RGF, submission queue | [`10-13-tce-ddl.sql`](../../../../../database/sql/10-13-tce-ddl.sql)                                                                                                  | Adapter still in stub posture (R3-043/044 deferred).            |
| `recrutamento`            |                                                 candidato, banca, banco-talentos, biometria, prova-online | [`10-11-recrutamento-ddl.sql`](../../../../../database/sql/10-11-recrutamento-ddl.sql)                                                                                | Heavy PII (CPF, biometria).                                     |
| `saude`                   |                                                                             ASO, PCMSO, PGR, EPI/PPP, CAT | [`10-12-saude-ddl.sql`](../../../../../database/sql/10-12-saude-ddl.sql)                                                                                              | Round-3 untouched.                                              |
| `lgpd`                    |                                                        ROPA, RCIS, DPO requests, public-power, tratamento | [`10-14-lgpd-ddl.sql`](../../../../../database/sql/10-14-lgpd-ddl.sql)                                                                                                | Added in round-2 (4 tables); unchanged in round-3.              |
| `avaliacao`               |                                                                    career_plan, job_position, performance | [`10-01-avaliacao-ddl.sql`](../../../../../database/sql/10-01-avaliacao-ddl.sql)                                                                                      | Stable.                                                         |
| `previdenciario`          |                                                                                      RPPS/RGPS aggregates | [`10-09-public_data-ddl.sql`](../../../../../database/sql/10-09-public_data-ddl.sql)                                                                                  | Reference catalog only.                                         |

## Smells & gaps observed at round-3

1. **4 tables without RLS.** `schema-digest.md` shows 294 tables, 290 with RLS (98.6 %). The 4 unprotected entries are reference catalogs (e.g. [`esocial.response_classification`](../../../../../database/sql/10-02-esocial-ddl.sql), [`esocial.s2205_trigger_field`](../../../../../database/sql/10-02-esocial-ddl.sql), [`fiscal.gps_payment_code`](../../../../../database/sql/10-04-fiscal-ddl.sql)) without tenant scope. Confirmed acceptable by data classification — no PII, no tenant-scoped rows.
2. **PII columns lacking ciphertext siblings.** [`docs/work/round-3/live-data-inventory.md`](../../../../work/round-3/live-data-inventory.md) §"Candidate Encryption Columns" lists **19** candidates (10 high priority CPF/CPF_CNPJ, 9 medium contact). NFR-013 status `PARTIAL` in [`non-functional-requisites.md`](../../non-functional-requisites.md). Tracked under R3-032 (`docs/work/round-2/prompts/03-R3-032-pii-encryption-batch.prompt.md`).
3. **225 audit-column or audit-trigger gaps** flagged by live-data inventory. Most are reference catalogs without `created_at/updated_at`; a smaller subset of mutating tables lack the `audit_event` trigger. See [`live-data-inventory.md`](../../../../work/round-3/live-data-inventory.md) §"Audit-column or audit-trigger gaps".
4. **30 CHECK constraints using `ANY ARRAY`.** Encoded enums via PostgreSQL CHECKs instead of typed enums; not a defect, but a portability/documentation note.
5. **0 inferred or NOT VALID foreign keys.** All FKs are declarative and validated.
6. **Schema freeze.** No structural change in round-3 (consistent with the round being governance/tooling-only); the +183 LOC inside `database/**/*.sql` is comment/data-tag drift inside existing tables.

## Path:line authority for headline claims

- Counts: [docs/gov/audit/schema-digest.md:7-15](../../schema-digest.md).
- Tables index: [docs/gov/audit/schema-digest.md:17](../../schema-digest.md) onward.
- Audit-event partitioning: [`database/sql/10-10-public-ddl.sql`](../../../../../database/sql/10-10-public-ddl.sql) (`PARTITION BY RANGE`).
- PII encryption SQL: [`database/sql/15-pii-encryption.sql`](../../../../../database/sql/15-pii-encryption.sql).
- PII tagging comments: [`database/sql/13-pii-comments.sql`](../../../../../database/sql/13-pii-comments.sql).
- FK indexes: [`database/sql/14-fk-indexes.sql`](../../../../../database/sql/14-fk-indexes.sql); [`15-missing-fks.sql`](../../../../../database/sql/15-missing-fks.sql).
- Live data evidence: [`docs/work/round-3/live-data-inventory.md`](../../../../work/round-3/live-data-inventory.md).
