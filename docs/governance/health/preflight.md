# Preflight Checks

Run this checklist before applying migrations or releasing API changes.

1. Validate backend env:
   - `DATABASE_URL`
   - `COGNITO_*` settings
   - `S3_REGION`
   - `S3_DOCUMENTS_BUCKET`
2. Validate DB alignment matrix/runtime governance gate:
   - `npm --prefix source run db:alignment:check`
   - Optional CI/automation output: `npm --prefix source run db:alignment:check -- --json`
   - Current default phase gate: `phase_3_core` (override with `SGP_DB_ALIGNMENT_PHASE` if needed).
3. Run DB bootstrap smoke in clean database:
   - `DATABASE_URL=postgresql://<user>@localhost:5432/<dbtest> npm --prefix source run db:smoke`
4. Apply Prisma migrations in `source/backend`.
5. Apply SQL support files in lexical order from `source/database/sql`.
6. Run deterministic seed:
   - `npm run db:seed` (in `source/backend`)
7. Run tests:
   - `npm test`
   - `npm run test:e2e`
8. Verify docs endpoint:
   - `/docs` loads and reflects protected document routes.
