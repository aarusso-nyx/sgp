Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Diagnostic output: Prisma `migrate deploy` stopped before applying new migrations because the target database already contains a failed migration: `20260502134000_fisc_03_comprovante`, started at `2026-05-02 08:10:55.378765 UTC`. Error: `P3009 migrate found failed migrations in the target database, new migrations will not be applied`. The command exited with code 1 from `npm exec -- prisma migrate deploy --schema /Users/aarusso/Development/stech/sgp/source/backend/prisma/schema.prisma`.
