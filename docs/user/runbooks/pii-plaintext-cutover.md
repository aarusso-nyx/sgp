# PII Plaintext Cutover Runbook

## Purpose

Use this runbook when the owner approves removal of plaintext PII columns after
the non-destructive encryption posture is stable. This is an apply-phase
runbook. Round 14 delivered only a dry-run plan and synthetic-data exercise; do
not run destructive DDL without a separate owner-approved change window.

## Scope

The cutover is limited to plaintext columns listed by
`hr.sgp_pii_cipher_rotation_manifest()` in
`database/sql/15a-pii-encryption-rotation.sql`. The current manifest covers
fiscal, HR, public user, and recruitment PII families with ciphertext and
`*_cipher_key_id` siblings created by `database/sql/15-pii-encryption.sql`.

The cutover does not change LGPD ROPA semantics, audit retention, tenant/RLS
policies, or shared storage/auth primitives.

## Pre-Flight

1. Confirm the owner has approved the destructive apply window.
2. Confirm the latest deploy includes `database/sql/15-pii-encryption.sql` and
   `database/sql/15a-pii-encryption-rotation.sql`.
3. Run the rotation manifest and save the row count:

   ```bash
   psql "$DATABASE_URL" -Atc "select count(*) from hr.sgp_pii_cipher_rotation_manifest();"
   ```

4. For every manifest row, confirm:
   - plaintext column exists;
   - cipher column exists;
   - key-id column exists;
   - cipher population count equals the source population count for non-null
     plaintext values;
   - latest `*_cipher_key_id` value is the active key id.
5. Confirm the last 24 hours of PII encryption, decryption, and rotation audit
   events are green.
6. Confirm the database backup is complete and restorable.
7. Confirm point-in-time recovery target is documented.
8. Confirm application code no longer writes or reads the plaintext columns
   except through approved compatibility views or decrypt helpers.
9. Confirm `npm run db:alignment:check -- --json`, `npm run governance:check`,
   and `npm run health:json` are green on the release candidate.

## Dry-Run Exercise

Run only against local `sgp_test` or another non-production clone with synthetic
data. The Round 14 retained dry-run used a temporary table populated from
`hr.sgp_pii_cipher_rotation_manifest()`, rotated synthetic ciphertext values,
verified decryptability with the new key, and rolled back the transaction.

Reference command:

```bash
psql "postgresql://$USER@localhost:5432/sgp_test" -v ON_ERROR_STOP=1 -At <<'SQL'
BEGIN;
SET LOCAL app.pii_encryption_key = 'sgp-r14-old-synthetic-key';
SET LOCAL app.pii_encryption_key_id = 'r14-old';

CREATE TEMP TABLE r14_pii_cutover_dry_run AS
SELECT schema_name, table_name, plaintext_column, cipher_column, key_id_column,
       format('synthetic-%s.%s.%s', schema_name, table_name, plaintext_column) AS plaintext,
       hr.sgp_encrypt_pii_text(format('synthetic-%s.%s.%s', schema_name, table_name, plaintext_column)) AS cipher,
       'r14-old'::text AS key_id
FROM hr.sgp_pii_cipher_rotation_manifest();

CREATE TEMP TABLE r14_pii_cutover_timing AS SELECT clock_timestamp() AS t0;

UPDATE r14_pii_cutover_dry_run
   SET cipher = hr.sgp_rotate_pii_cipher(cipher, 'sgp-r14-old-synthetic-key', 'sgp-r14-new-synthetic-key'),
       key_id = 'r14-new';

SELECT count(*) AS rows_verified,
       round(EXTRACT(milliseconds FROM clock_timestamp() - (SELECT t0 FROM r14_pii_cutover_timing))::numeric, 3) AS rotation_verify_ms
FROM r14_pii_cutover_dry_run
WHERE pgp_sym_decrypt(cipher, 'sgp-r14-new-synthetic-key') = plaintext
  AND key_id = 'r14-new';

ROLLBACK;
SQL
```

## Apply Phase

Each step below is for the owner-approved apply phase, not the dry run.

1. Put the application in the approved maintenance mode.
2. Start an explicit migration transaction when the database size permits it.
3. Re-run the manifest pre-flight checks and abort on any mismatch.
4. Execute the final code release that removes plaintext read/write paths.
5. Execute the reviewed DDL sequence for each manifest row:

   ```sql
   -- apply phase only
   ALTER TABLE <schema>.<table> DROP COLUMN <plaintext_column>;
   ```

6. Remove obsolete plaintext comments from the PII catalog only after all drops
   succeed.
7. Run DB alignment, governance, API alignment, and health gates.
8. Release maintenance mode after application smoke checks pass.

## Rollback

Rollback depends on the phase that failed:

1. Before DDL commit: roll back the transaction.
2. After DDL commit but before traffic restore: restore the database to the
   pre-cutover point-in-time recovery target.
3. After traffic restore: stop traffic, restore from PITR, replay approved
   business events captured after the restore target, and re-run the rotation
   manifest checks.
4. If a cipher decrypt failure appears, stop the cutover and use the rotation
   manifest to identify the affected table, cipher column, key-id column, and
   active key version before any further DDL.

Do not recreate plaintext columns manually in production. Use PITR or an
owner-approved corrective migration.

## RPO And RTO

Target RPO: 5 minutes, bounded by the last verified database restore point and
post-restore replay plan.

Target RTO: 30 minutes for local rollback rehearsal, with the production target
confirmed by the owner before scheduling.

Round 14 synthetic dry-run measurement on `sgp_test`:

- manifest rows exercised: 30;
- rows rotated and verified: 30;
- measured rotation plus verification time: 34.722 ms;
- transaction outcome: `ROLLBACK`;
- destructive DDL executed: none.

## Evidence

Retain the apply record under `docs/gov/evidence/` with:

- manifest row count;
- backup and PITR target;
- gates run;
- RPO/RTO measurement;
- issue log;
- owner sign-off.
