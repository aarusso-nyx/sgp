# Database Migration Runbook

Owner: TBD
Last reviewed: 2026-05-07

- Preconditions: confirm `DATABASE_URL`, backup posture, and `npm run db:alignment:check -- --json`.
- Procedure: run canonical SQL through `npm run db:migrate` from the repository root.
- Verification: run `npm run db:smoke`, `npm run test:db`, and `npm run governance:check`.
