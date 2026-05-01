Gate failed: `cd source && DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`

Diagnostics: earlier gates in this retry passed with the required `DATABASE_URL`: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e`. The previous e2e failures were cleared by targeted verification: `test/audit-coverage.e2e-spec.ts`, `test/rh-vinculos.e2e-spec.ts`, and `test/calc-paths-parity.e2e-spec.ts` all passed under `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam`.

`db:smoke` failed during `prisma migrate deploy` while applying migration `20260501100000_hr_02_vinculo_regime`. Prisma reported `P3018`, database error code `42P01`, with `ERROR: relation "public.profile" does not exist`. The failing SQL location is the permission-catalog/profile section of the HR-02 migration:

```text
Migration name: 20260501100000_hr_02_vinculo_regime
Database error code: 42P01
Database error:
ERROR: relation "public.profile" does not exist

Position:
177   SELECT id, key FROM updated_by_key
178   UNION ALL
179   SELECT id, key FROM inserted_or_tuple_matched
180 ), rh_profile AS (
181   SELECT id
182   FROM public.profile
```

The workspace was left as-is after the failing gate, per retry instructions.
