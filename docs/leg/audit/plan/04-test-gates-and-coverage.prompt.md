# Prompt 04 - Test Gates And Coverage

## Goal

Make verification gates truthful for the current sprint:

- backend e2e paths must match the global `/api` prefix;
- DB smoke must not look green when `DATABASE_URL` is missing;
- QA smoke skips must be explicit and not counted as passing e2e evidence;
- backend coverage thresholds must match `docs/eng/62-estrategia-testes.md`.

## Read First

- `AGENTS.md`
- `docs/eng/62-estrategia-testes.md`
- `docs/leg/audit/diag/backend-and-db-test-gates.md`
- `docs/leg/audit/diag/raw-backend-e2e.log`
- `docs/leg/audit/diag/raw-db-smoke.log`
- `docs/leg/audit/diag/raw-backend-coverage.log`
- `docs/leg/audit/inv/verification-inventory.json`
- `tests/backend`
- `backend/jest.config*`
- `package.json`
- `backend/package.json`

## Work Items

1. Re-read the live package scripts and Jest config before editing.
2. Update backend e2e tests and helpers to call the documented `/api` route families.
3. Make DB smoke behavior explicit:
   - if `DATABASE_URL` is present, run the smoke test and fail on real defects;
   - if `DATABASE_URL` is absent, exit with a documented configuration skip that cannot be misread as proof of DB correctness.
4. Make QA smoke skip semantics explicit for missing base URLs. Skipped suites must be reported as skipped or blocked, not green e2e coverage.
5. Add or enforce Jest coverage thresholds according to `docs/eng/62-estrategia-testes.md`.
6. Keep module thresholds realistic for currently implemented modules, but document any unavoidable temporary gap as a blocker rather than silently weakening acceptance.
8. Update docs if command semantics or gate interpretation changes.

## Acceptance Gates

```bash
cd . # repository root
npm --workspace backend run test:e2e -- --runInBand
npm run db:smoke
npm --workspace backend run test:cov -- --runInBand
```

Run QA smoke commands too if base URL environment variables are configured. If not configured, record the skip as blocked evidence.

## Deliverable

Updated test configs, scripts, e2e path fixes, coverage thresholds, and diagnostics showing that skipped gates are not misreported as passing.
