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
   - Current default phase gate: `full_closure` (override with `SGP_DB_ALIGNMENT_PHASE` if needed).
3. Run source workspace non-mutating gates:
   - `npm --prefix source run lint:check`
   - `npm --prefix source run format:check`
   - `npm --prefix source run typecheck`
   - `npm --prefix source run api:alignment:check -- --json`
   - `npm --prefix source run health:json`
   - `npm --prefix source run governance:check`
4. Run DB bootstrap smoke in clean database:
   - `DATABASE_URL=postgresql://<user>@localhost:5432/<dbtest> npm --prefix source run db:smoke`
5. Apply Prisma migrations in `source/backend`.
6. Apply SQL support files in lexical order from `source/database/sql`.
7. Run deterministic seed:
   - `npm run db:seed` (in `source/backend`)
8. Run tests:
   - `npm --prefix source run test:unit`
   - `npm --prefix source run test:e2e`
9. Verify docs endpoint:
   - `/docs` loads and reflects protected document routes.
