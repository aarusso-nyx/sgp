# Preflight Checks

Run this checklist before applying canonical SQL or releasing API changes.

1. Validate backend env:
   - `DATABASE_URL`
   - `COGNITO_*` settings
   - `S3_REGION`
   - `S3_DOCUMENTS_BUCKET`
2. Validate DB alignment matrix/runtime governance gate:
   - `npm run db:alignment:check`
   - Optional CI/automation output: `npm run db:alignment:check -- --json`
   - Current default phase gate: `full_closure` (override with `SGP_DB_ALIGNMENT_PHASE` if needed).
3. Run source workspace non-mutating gates:
   - `npm run lint:check`
   - `npm run format:check`
   - `npm run typecheck`
   - `npm run api:alignment:check -- --json`
   - `npm run health:json`
   - `npm run governance:check`
4. Run DB bootstrap smoke in clean database:
   - `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run db:smoke`
5. Apply canonical SQL from `database/sql`:
   - `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run db:migrate`
6. Regenerate Prisma Client if schema metadata changed:
   - `npm run db:generate`
7. Run deterministic seed:
   - `npm run db:seed` (in `backend`)
8. Run tests:
   - `npm run test`
   - `npm run test:db`
   - `npm run test:e2e`
9. Verify docs endpoint:
   - `/docs` loads and reflects protected document routes.
