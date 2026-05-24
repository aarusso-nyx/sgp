# Database Bootstrap

## Canonical Layout

SGP's authoritative database layout is:

- `database/sql/` for canonical SQL packs, applied in lexical order.
- `database/sql/checks/` for focused SQL check probes.
- `database/sql/replay/` for retained replay SQL artifacts.
- `database/seed/` for deterministic non-secret seed fixtures and the seed
  runner.

Do not reshape this repository to `database/{ddl,seed,migrations}`. That
external alignment shape conflicts with the root `AGENTS.md` authority, which
keeps canonical SQL under `database/sql/` for SGP v0.0.1.

## Bootstrap

The canonical database bootstrap entrypoint is:

```sh
npm run db:migrate
```

The command requires `DATABASE_URL` and runs the database changes in this order:

1. Apply committed Prisma migrations with `prisma migrate deploy` when `backend/prisma/migrations/` exists.
2. Apply every non-optional `database/sql/*.sql` file in lexical order in one `psql` transaction.
3. Stop on the first error. A failed SQL bootstrap rolls back the SQL transaction.

`database/sql/40-seed-loader.sql` is intentionally optional and is not part of the canonical bootstrap. Load reference and fixture data after migration with:

```sh
npm run db:seed
```

Use `npm run db:smoke` for an empty-schema smoke run. It resets the configured test database, runs the canonical bootstrap, applies seeds, and checks RLS/bootstrap invariants.

Direct schema pushes with force reset are blocked by CI because they can drop CHECK constraints, RLS policies, audit triggers, and payroll formula runtime objects that live in the canonical SQL layer.
