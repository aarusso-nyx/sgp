# PII at rest hardening

R2-204 tags PII-bearing database columns with `COMMENT ON COLUMN` metadata in `database/sql/13-pii-comments.sql`. The metadata uses `pii=true`, a classification, and `ropa_export=true`; `lgpd.v_pii_column_catalog` exposes those tags with active ROPA flow keys derived from `lgpd.legal_basis_rule.source_tables`.

R2-206 uses PostgreSQL `pgcrypto` for new writes to the highest-sensitivity payroll/RH identifiers:

- `hr.employee.bank_account` -> `hr.employee.bank_account_cipher`
- `hr.employee.pis_pasep` -> `hr.employee.pis_pasep_cipher`
- `hr.employee_complement_data.pis_pasep` -> `hr.employee_complement_data.pis_pasep_cipher`
- `hr.employee_bank_account.account_number` -> `hr.employee_bank_account.account_number_cipher`

The runtime supplies `SGP_PII_PGCRYPTO_KEY` and optional `SGP_PII_PGCRYPTO_KEY_ID`; the database session stores them as `app.pii_encryption_key` and `app.pii_encryption_key_id`. Decrypting views under `hr.v_*_pii_decrypted` preserve existing service contracts and append `PII_DECRYPT` audit events when ciphertext is decrypted.

No destructive backfill is part of R2-206. Existing plaintext rows remain readable through fallback view columns until an owner-approved migration defines the backfill window, operational freeze rules, verification evidence, and key-rotation/retirement policy.
