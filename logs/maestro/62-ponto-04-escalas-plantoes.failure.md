# Prompt 62 PONTO-04 failure

Failing gate: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`.

Diagnostic output:

```text
Applying migration `20260502134000_fisc_03_comprovante`
Error: P3018

Migration name: 20260502134000_fisc_03_comprovante

Database error code: 55P04

Database error:
ERROR: unsafe use of new value "YEARLY_INCOME_REPORT" of enum type "ReportKind"
HINT: New enum values must be committed before they can be used.

[db-smoke] FAILED: npm exec -- prisma migrate deploy --schema /Users/aarusso/Development/stech/sgp/source/backend/prisma/schema.prisma failed with exit code 1
```
