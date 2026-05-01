W00 ✗ 00-xcut-03-rls-hardening (medium, blocking no-retry: `npm run db:smoke` blocked because `DATABASE_URL` is not set) — see logs/maestro/00-xcut-03-rls-hardening.failure.md; completeness 26.2% → 26.2%
W00 ✗ 00-xcut-03-rls-hardening (medium, blocking no-retry: `npm run db:smoke` with `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam` failed: employee_dependent tenant rewrite not rejected by RLS WITH CHECK) — see logs/maestro/00-xcut-03-rls-hardening.failure.md; completeness 26.2% → 26.2%
W00 ✓ 00-xcut-03-rls-hardening (1 slice, medium, resumed with DATABASE_URL, gates passed, commit b6af683) — completeness 26.2% → 26.2%
W01 ✗ 01-xcut-04-audit-immutability (medium, blocking no-retry: `npm run lint` failed with `@typescript-eslint/no-misused-promises` in `audit-required.interceptor.ts`) — see logs/maestro/01-xcut-04-audit-immutability.failure.md
W01 ✓ 01-xcut-04-audit-immutability (1 slice, medium, lint cleanup applied, gates passed, commit 11ca829) — completeness 26.2% → 26.2%
W02 ✓ 02-xcut-05-permission-catalog-merge (1 slice, medium→high retry, gates passed, commit 1814ebe) — completeness 26.2% → 26.2%
W03 ✗ 03-xcut-08-money-decimal-policy (low, blocking money/decimal policy: `db:smoke` failed applying `20260430153000_calc08_decimal_sweep` because schema `previdenciario` does not exist) — see logs/maestro/03-xcut-08-money-decimal-policy.failure.md
W03 ✓ 03-xcut-08-money-decimal-policy (1 slice, low, schema qualifier fixed, gates passed, commit 1f0706b) — completeness 26.2% → 26.2%
W04 ✗ 05-hr-06-estrutura-organizacional (low → medium retry failed: `db:smoke` failed applying `50-gestao-master-data-seed.sql` after audit trigger wrote `gestao.master_data` event with null tenant context) — see logs/maestro/05-hr-06-estrutura-organizacional.failure.md
W04 ✓ 05-hr-06-estrutura-organizacional (1 slice, low→medium recovery, gates passed, commit 5fde91a) — completeness 26.2% → 26.2%
