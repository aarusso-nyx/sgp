# PII at rest hardening

R2-204 tags PII-bearing database columns with `COMMENT ON COLUMN` metadata in `database/sql/13-pii-comments.sql`. The metadata uses `pii=true`, a classification, and `ropa_export=true`; `lgpd.v_pii_column_catalog` exposes those tags with active ROPA flow keys derived from `lgpd.legal_basis_rule.source_tables`.

R2-206 uses PostgreSQL `pgcrypto` for new writes to the highest-sensitivity payroll/RH identifiers:

- `hr.employee.bank_account` -> `hr.employee.bank_account_cipher`
- `hr.employee.pis_pasep` -> `hr.employee.pis_pasep_cipher`
- `hr.employee_complement_data.pis_pasep` -> `hr.employee_complement_data.pis_pasep_cipher`
- `hr.employee_bank_account.account_number` -> `hr.employee_bank_account.account_number_cipher`

R3-032 expands the non-destructive new-write batch to these high-risk HR
identity/banking columns from the live inventory:

- `hr.employee.cpf` -> `hr.employee.cpf_cipher`
- `hr.employee.rg` -> `hr.employee.rg_cipher`
- `hr.employee.bank_agency` -> `hr.employee.bank_agency_cipher`
- `hr.employee_complement_data.rg` -> `hr.employee_complement_data.rg_cipher`
- `hr.employee_complement_data.voter_registration` -> `hr.employee_complement_data.voter_registration_cipher`
- `hr.employee_bank_account.holder_cpf` -> `hr.employee_bank_account.holder_cpf_cipher`
- `hr.employee_dependent.cpf` -> `hr.employee_dependent.cpf_cipher`

The runtime supplies `SGP_PII_PGCRYPTO_KEY` and optional `SGP_PII_PGCRYPTO_KEY_ID`; the database session stores them as `app.pii_encryption_key` and `app.pii_encryption_key_id`. Decrypting views under `hr.v_*_pii_decrypted` preserve existing service contracts and append `PII_DECRYPT` audit events when ciphertext is decrypted.

No destructive backfill is part of R2-206 or R3-032. Existing plaintext rows
remain readable through fallback view columns until an owner-approved migration
defines the backfill window, operational freeze rules, verification evidence,
and key-rotation/retirement policy. R3-032 intentionally keeps the newly
covered plaintext columns populated for application compatibility while adding
ciphertext siblings for new writes when a session key is present; if the key is
absent, those non-destructive R3 fields keep plaintext and leave ciphertext
empty rather than blocking seed/import workflows.
