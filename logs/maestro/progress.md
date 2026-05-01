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
W04 ✗ 04-hr-01-cadastro-servidor (medium → high retry failed: `db:smoke` failed applying `20260501090000_hr_01_cadastro_servidor` on duplicate permission tuple `(rh, employee, read)`) — see logs/maestro/04-hr-01-cadastro-servidor.failure.md
W04 ✓ 04-hr-01-cadastro-servidor (1 slice, medium→high recovery, gates passed, commit 6bf7935) — completeness 26.2% → 26.2%
W05 ✗ 06-hr-02 (medium → high retry failed: db:smoke P3018 relation "public.profile" does not exist) — see logs/maestro/06-hr-02-vinculo-regime-juridico.failure.md
W05 ✓ 06-hr-02 (1 slice, medium→high recovery, gates passed, commit 4143973) — completeness 26.2% → 26.2%
W05 ✓ 07-hr-07 (1 slice, low, gates passed, commit aa5c8c2) — completeness 26.2% → 26.2%; Wave 5 complete
W06 ✓ 08-hr-08 (1 slice, low, gates passed, commit 9bf203a) — completeness 26.2% → 26.2%
W06 ✗ 09-hr-03 (medium → high retry failed: db:smoke cannot alter hr.vacation_record.status while hr.v_employee_career_history depends on it) — see logs/maestro/09-hr-03-ferias-programacao.failure.md
W06 ✓ 09-hr-03 (1 slice, medium→high recovery, gates passed, commit b213e74) — completeness 26.2% → 26.2%; Wave 6 complete
W07 ✗ 10-hr-04 (medium → high retry failed: db:smoke RLS insert violation on saude.medical_appointment) — see logs/maestro/10-hr-04-licenca-saude-pericia.failure.md
W07 ✓ 10-hr-04 (1 slice, medium→high recovery, gates passed, commit 2e4dde2) — completeness 26.2% → 26.2%
W07 ✓ 11-hr-05 (1 slice, low, gates passed, commit 2495cbc) — completeness 26.2% → 26.2%; Wave 7 complete
W08 ✗ 12-fol-02 (low → medium retry failed: permission catalog drift, JSON seed missing gestao.cargo.read/write) — see logs/maestro/12-fol-02-cargos-estrutura-remuneratoria.failure.md
W08 ✓ 12-fol-02 (1 slice, low→medium recovery, gates passed, commit a1df9aa) — completeness 26.2% → 26.2%
W08 ✓ 13-fol-04 (1 slice, medium, gates passed, commit 7c6ed9e) — completeness 26.2% → 26.2%
W08 ✗ 14-fol-05 (medium → high retry failed: lint no-unsafe-call/no-unsafe-return in salary-history.service.spec.ts) — see logs/maestro/14-fol-05-bases-salariais-historicas.failure.md
W08 ✓ 14-fol-05 (1 slice, medium→high recovery, gates passed, commit 75db340) — completeness 26.2% → 26.2%
W08 ✓ 15-fol-03 (1 slice, medium + maestro smoke/RLS hardening, gates passed, commit f9a255e) — completeness 26.2% → 26.2%; Wave 8 complete
W09 ✗ 16-fol-06 (low → medium retry failed: db:smoke failed in 99-hr03-vacation.sql after FOL-06 migration applied) — see logs/maestro/16-fol-06-movimentacao-transferencia.failure.md
W09 ✓ 16-fol-06 (1 slice, low→medium recovery + smoke fixture hardening, gates passed, commit eee7f90) — completeness 26.2% → 26.2%
W09 ✗ 17-fol-01 (high → xhigh retry: maestro db:smoke P2002 unique constraint in FOL-01 fixture) — recovered in retry
W09 ✓ 17-fol-01 (1 slice, high→xhigh recovery, gates passed, commit 745c0fa) — completeness 26.2% → 26.2%; Wave 9 complete
W10 ✗ 18-calc-01 (high → xhigh retry failed: db:smoke failed during db:seed with inconsistent types deduced for parameter $3) — see logs/maestro/18-calc-01-formulas-engine.failure.md
W10 ✓ 18-calc-01 (1 slice, high→xhigh + manual recovery, gates passed, commit 12000a6) — completeness 26.2% → 26.2%
W10 ✓ 19-calc-08 (1 slice, medium manual recovery, gates passed, commit 3723507) — completeness 26.2% → 26.2%; Wave 10 complete
W11 ✗ 20-calc-02 (medium → high retry failed: db:smoke P2002 unique constraint in CALC-02 tax_rate smoke fixture) — recovered manually
W11 ✓ 20-calc-02 (1 slice, medium→high + manual recovery, gates passed, commit 2c0cd24) — completeness 26.2% → 26.2%
W11 ✗ 21-calc-03 (medium → high retry failed: e2e RPPS returned 0.00 under RLS and bypass audit did not increase) — recovered manually
W11 ✓ 21-calc-03 (1 slice, medium→high + manual recovery, gates passed, commit 07491d4) — completeness 26.2% → 26.2%
W11 ✗ 22-calc-06 (medium → high retry failed: admin catalog count stale after Teto Remuneratório route) — recovered manually
W11 ✓ 22-calc-06 (1 slice, medium→high + manual recovery, gates passed, commit 75d0deb) — completeness 26.2% → 26.2%
W11 ✗ 23-calc-07 (medium → high retry failed: frontend RhFuncionarios routerLink harness and permission seed drift) — recovered manually
W11 ✓ 23-calc-07 (1 slice, medium→high + manual recovery, gates passed, commit e13c7f9) — completeness 26.2% → 26.2%; Wave 11 complete
W12 ✗ 24-calc-04 (medium → high retry failed: permission catalog drift and e2e audit tenant context) — recovered manually
W12 ✓ 24-calc-04 (1 slice, medium→high + manual recovery, gates passed, commit 829d028) — completeness 26.2% → 26.2%
W12 ✗ 25-calc-05 (medium → high retry failed: db:smoke vacation_record audit tenant context) — recovered manually
W12 ✓ 25-calc-05 (1 slice, medium→high + manual recovery, gates passed, commit 3f82a6f) — completeness 26.2% → 26.2%; Wave 12 complete
W13 ✗ 26-calc-09 (high → xhigh retry failed: lint unused recalculated after migration immutability repair) — recovered manually
W13 ✓ 26-calc-09 (1 slice, high→xhigh + manual recovery, gates passed, commit 0b9430a) — completeness 26.2% → 26.2%
W13 ✗ 27-calc-10 (medium → high retry failed: e2e simulation/audit/IRRF drift) — recovered manually
W13 ✓ 27-calc-10 (1 slice, medium→high + manual recovery, gates passed, commit 0f60749) — completeness 26.2% → 26.2%
