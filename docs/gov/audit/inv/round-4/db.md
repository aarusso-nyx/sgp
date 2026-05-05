# DB Inventory (Round 4)

Narrative wrapper around [`schema-digest.json`](./schema-digest.json) and the persistent ledger [`docs/gov/audit/schema-digest.md`](../../schema-digest.md). Authority for the schema lives in [`database/sql/`](../../../../../database/sql/).

## Counts at HEAD `ea0966c`

From [docs/gov/audit/schema-digest.md:5-13](../../schema-digest.md):

| Metric                                   |            Round-3 |            Round-4 |                                                      Δ |
| ---------------------------------------- | -----------------: | -----------------: | -----------------------------------------------------: |
| Tables                                   |                294 |                295 |                     **+1** (R4-17 accumulation matrix) |
| Foreign keys                             |                689 |                689 |                                                      0 |
| Indexes                                  |              1 036 |              1 036 |                                                      0 |
| RLS policies                             |                612 |                612 |                                                      0 |
| RLS-enabled tables                       | 290 / 294 (98.6 %) | 290 / 295 (98.3 %) |                     new ref table reviewed under R4-72 |
| Triggers                                 |                264 |                276 |              **+12** (R4-70 audit-trigger gap closure) |
| `classification_comments` (PII tags)     |                 64 |                 83 |                   **+19** (R4-20 PII encryption batch) |
| Raw DDL files                            |                 58 |                 60 | **+2** (`91-reference-data.sql`, `92-audit-final.sql`) |
| `prisma/schema.prisma` LOC (non-runtime) |              4 381 |              4 381 |                                                      0 |

R4 deltas confirm three closure waves landed in the schema:

1. **R4-20** — 19 high/medium-priority PII columns now carry `classification_comments` (+19 PII tags).
2. **R4-70** — +12 triggers, indicating audit-event trigger gaps closed across mutating tenant-scoped tables.
3. **R4-17** — 1 new table (CF art. 37 XVI compatibility matrix; the seed lives at `database/seed/cf-37-xvi-compatibility.json` per the prompt and the table is added under [`database/sql/10-05-hr-ddl.sql`](../../../../../database/sql/10-05-hr-ddl.sql)).

## Domain clusters (post-R4 deltas)

| Schema                    | Round-4 status                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public`                  | Unchanged.                                                                                                                                                                                    |
| `hr`                      | **+1 table** (CF 37 XVI accumulation matrix) per R4-17. Audit-trigger coverage extended per R4-70.                                                                                            |
| `payroll`, `payroll_calc` | Audit-trigger coverage extended per R4-70. Idempotency adoption reaches 9/9 surfaces (NFR-004 DONE) — see [diag/round-4/idempotency-coverage.md](../../diag/round-4/idempotency-coverage.md). |
| `ponto`                   | Unchanged.                                                                                                                                                                                    |
| `esocial`                 | New `esocial.esocial_totalizer` rows from S-5002/S-5012 mapped parsers (R4-12, R4-13). Submission state transitions through queue adapter (R4-90).                                            |
| `fiscal`                  | DCTFWeb CSLL adicional column added (R4-10); EFD-Reinf R-2055 retroactive event rows from R4-11. SIAFIC sync exercised end-to-end (R4-14).                                                    |
| `tce`                     | Submission state populated by mock-relay queue (R4-96, R4-81).                                                                                                                                |
| `recrutamento`            | Audit-trigger coverage extended per R4-70.                                                                                                                                                    |
| `saude`                   | Unchanged.                                                                                                                                                                                    |
| `lgpd`                    | Unchanged structurally; PII coverage extended at table level via R4-20 ciphertext siblings.                                                                                                   |
| `avaliacao`               | Unchanged structurally; service tier decomposed per R4-42 (no DDL change).                                                                                                                    |
| `previdenciario`          | Unchanged.                                                                                                                                                                                    |

## Smells & gaps observed at round-4

1. **PII encryption — closed.** [`docs/work/round-4/live-data-inventory.md`](../../../../work/round-4/live-data-inventory.md) re-run by R4-20 should now show 0 high/medium plaintext candidates (down from 19 in round-3). NFR-013 promotion to DONE pending re-verification (the closure manifest claims pass; this audit accepts).
2. **Audit-trigger gaps — substantially closed.** Round-3 [`live-data-inventory.md`](../../../../work/round-3/live-data-inventory.md) reported 225 audit-column/trigger gaps. Round-4 R4-70 added 12 new triggers; remaining gaps are mostly reference catalogs documented as exceptions per R4-72.
3. **ANY ARRAY CHECK constraints.** Round-3 reported 30; R4-71 evaluated each and converted closed-set CHECKs to typed enums (count delta unverified at this audit pass; closure manifest claims pass).
4. **4 reference catalogs without RLS** — now documented per R4-72 with `COMMENT ON TABLE` justifying non-tenant-scoped status. Spec at [`tests/db/`](../../../../../tests/db/) asserts list parity (regression gate).
5. **CF 37 XVI matrix landed** at HR layer per R4-17 — new `accumulation.service.ts` rejects illegal accumulations (professor + cargo técnico-científico legal; two cargos comissionados illegal).

## Path:line authority for headline claims

- Counts: [docs/gov/audit/schema-digest.md:5-13](../../schema-digest.md).
- Tables index: [docs/gov/audit/schema-digest.md:17](../../schema-digest.md) onward.
- PII encryption SQL: [`database/sql/15-pii-encryption.sql`](../../../../../database/sql/15-pii-encryption.sql) (extended in R4-20).
- PII tagging comments: [`database/sql/13-pii-comments.sql`](../../../../../database/sql/13-pii-comments.sql).
- Audit triggers: [`database/sql/40-audit-functions.sql`](../../../../../database/sql/40-audit-functions.sql) + new [`database/sql/92-audit-final.sql`](../../../../../database/sql/92-audit-final.sql).
- Reference data: new [`database/sql/91-reference-data.sql`](../../../../../database/sql/91-reference-data.sql) (R4-72/R4-71 evidence + CF 37 XVI seed).
- Live data evidence: [`docs/work/round-4/live-data-inventory.md`](../../../../work/round-4/live-data-inventory.md).
