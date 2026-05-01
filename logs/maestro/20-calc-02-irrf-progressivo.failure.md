# CALC-02 IRRF Progressivo — failure

Failing gate: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Diagnostic output:

```text
[db-smoke] running prisma migrations
48 migrations found in prisma/migrations
No pending migrations to apply.
[db-smoke] ensured smoke roles exist
[db-smoke] applied 00-extensions.sql
[db-smoke] applied 01-audit.sql
[db-smoke] applied 10-auth.sql
[db-smoke] applied 11-rls-context.sql
[db-smoke] applied 12-rls-policies.sql
[db-smoke] applied 13-rls-hardening.sql
[db-smoke] applied 20-sgp-core.sql
[db-smoke] applied 25-payroll-formula-engine.sql
[db-smoke] applied 26-salary-history.sql
[db-smoke] applied 30-integrity-checks.sql
[db-smoke] applied 50-gestao-master-data-seed.sql
[db-smoke] checking forced RLS coverage
[db-smoke] running deterministic seed
[db-smoke] validated schema split, tenant coverage, RLS, and portal read-only privileges
[db-smoke] validated HR-01 employee admission audit, timeline, and RLS
[db-smoke] validated HR-02 regime checks, audit, timeline, and employment_link RLS
[db-smoke] validated audit_event immutability and app-role privileges
[db-smoke] validated XCUT-03 RLS and tenant FK hardening
[db-smoke] validated HR-08 immutable history, career view, and probation RLS
[db-smoke] validated HR-03 vacation balance, audit, and RLS
[db-smoke] validated HR-04 medical leave trigger, days, and RLS
[db-smoke] validated HR-05 general leave rules, audit, and RLS
[db-smoke] validated FOL-02 cargos, salary matrix, audit, and RLS
[db-smoke] validated FOL-04 PCCS links, trail data, and RLS
[db-smoke] validated FOL-05 salary history lookup, overlap, audit, and RLS
[db-smoke] validated FOL-03 progression trigger, audit, and RLS
[db-smoke] validated FOL-06 transfer trigger, audit, and RLS
[db-smoke] validated FOL-01 rubricas formulas, preview, audit, and RLS
Error: P2002

Unique constraint failed on the (not available)
[db-smoke] FAILED: npm exec -- prisma db execute --file /var/folders/5c/m4tbc9kj091cw8v71dnxtrt00000gn/T/sgp-db-smoke-njTYhU/99-calc02-irrf.sql failed with exit code 1
```

Earlier gates in this retry passed: `npm run lint`, `npm run typecheck`, `npm run test`, and `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test:e2e`.
