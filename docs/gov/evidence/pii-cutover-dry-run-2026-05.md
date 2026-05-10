# PII Plaintext Cutover Dry-Run Evidence - 2026-05

Evidence/status artifact. It records dry-run state and does not authorize a
production plaintext-column cutover.

## Summary

Round 14 delivered the dry-run plan for the future PII plaintext cutover. No
production data was touched, no persistent schema was changed, and no `DROP
COLUMN` or `DROP TABLE` operation was executed.

## Environment

- Date: 2026-05-10.
- Database: local `sgp_test`.
- Dataset: synthetic temporary rows generated from
  `hr.sgp_pii_cipher_rotation_manifest()`.
- Transaction outcome: `ROLLBACK`.
- Source SQL: `database/sql/15-pii-encryption.sql` and
  `database/sql/15a-pii-encryption-rotation.sql`.

## Tables Exercised

The dry run exercised the 30 manifest rows across these table families:

- `fiscal.dirf_beneficiario`
- `hr.employee`
- `hr.employee_alimony`
- `hr.employee_bank_account`
- `hr.employee_benefit_dependent`
- `hr.employee_complement_data`
- `hr.employee_dependent`
- `hr.internship_record`
- `hr.legal_responsible`
- `hr.medical_appointment`
- `hr.pension_grant`
- `hr.service_provider`
- `public.user_account`
- `recrutamento.banca_membro`
- `recrutamento.candidato`

## Command Evidence

```bash
psql "postgresql://$USER@localhost:5432/sgp_test" -v ON_ERROR_STOP=1 -At
```

The executed SQL created a temporary manifest-backed table, encrypted synthetic
values with `sgp-r14-old-synthetic-key`, rotated them to
`sgp-r14-new-synthetic-key` through `hr.sgp_rotate_pii_cipher(...)`, verified
decryptability with `pgp_sym_decrypt(...)`, and rolled back.

Observed result:

```text
rows_verified=30
rotation_verify_ms=34.722
transaction=ROLLBACK
```

## RPO And RTO

- Target RPO for a future real cutover: 5 minutes, subject to the owner-approved
  backup/PITR plan.
- Target RTO for rollback rehearsal: 30 minutes.
- Dry-run measured operation time: 34.722 ms for synthetic rotate-and-verify
  across 30 manifest entries.

This dry run does not prove production RTO. Production RTO must be measured
against the actual database size and restore path before scheduling the apply
window.

## Issues And Mitigations

- Issue: plaintext removal is irreversible without restore.
  Mitigation: production apply requires PITR target, backup verification, and
  owner approval before DDL.
- Issue: application code may still rely on plaintext fallback fields.
  Mitigation: pre-flight requires a code release that removes plaintext
  read/write paths and green `db:alignment`, `governance`, and `health` gates.
- Issue: stale rotation manifest would make the DDL list incomplete.
  Mitigation: pre-flight uses `hr.sgp_pii_cipher_rotation_manifest()` as the
  source of truth and aborts on missing cipher/key-id siblings.

## Review

- Runbook reviewed against current docs/user runbook style: yes.
- Runbook path: `docs/user/runbooks/pii-plaintext-cutover.md`.
- Destructive DDL executed: no.
- Production data touched: no.
- Owner sign-off for real cutover:
