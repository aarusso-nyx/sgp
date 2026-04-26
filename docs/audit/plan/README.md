# Next Sprint SGP Gap Closure Plan

Grounded in the current audit package generated at `2026-04-25T23:24:29.504Z` under `docs/audit/inv/` and `docs/audit/diag/`.

## Source Boundaries

- `docs/eng/` remains authoritative for v0.0.1 architecture, domain scope, contracts, and acceptance.
- `docs/sql-reference/` remains the legacy database coverage baseline.
- `docs/legacy-reverse/` remains evidence only and must not override `docs/eng/`.
- `docs/audit/inv/` and `docs/audit/diag/` are derived snapshots. Refresh them during final reassessment.

## Sprint Boundary

This next sprint closes the remaining implementation gaps currently accepted by `docs/eng/`. Arrecadacao is later-version scope and must not be treated as a v0.0.1 route, UI, DB, or test blocker.

Scope decisions added on 2026-04-26:

- Admin frontend tree, backend admin routes, and identity/OAuth/Cognito/Gov.br paths remain postponed under `ADMIN_INSTALL_LATER` and `IDENTITY_INSTALL_LATER`.
- eSocial remains a stub/sandbox external provider for the current package.
- Tests may use Docker MiniIO when S3 is not configured.
- `./infra` implementation strategy and governance gates are postponed until a later owner decision.

## Prompt Sequence

| Order | Prompt | Purpose |
|---|---|---|
| 1 | `01-db-full-closure.prompt.md` | Close remaining database matrix exclusions, preserving only approved technical out-of-scope artifacts. |
| 2 | `02-runtime-services.prompt.md` | Replace scaffolded payroll, eSocial, and report runtimes with implemented entrypoints. |
| 3 | `03-portal-and-contract-cleanup.prompt.md` | Fix portal build/test gaps, frontend contract mismatch, and compatibility alias wording. |
| 4 | `04-test-gates-and-coverage.prompt.md` | Make backend e2e, DB smoke, QA smoke semantics, and coverage gates truthful. |
| 5 | `05-final-reassessment.prompt.md` | Refresh audit inventories/diagnostics and classify remaining gaps. |

Future Arrecadacao scope is tracked separately in `future-arrecadacao.prompt.md`.

## Definition of Done

- `docs/eng/64-database-alignment-matrix.json` has no in-scope explicit exclusions left; `dbo.sysdiagrams` remains the only approved technical out-of-scope object unless `docs/eng/` explicitly approves another exclusion.
- Scaffolded runtime status is removed for `sgp-payroll-engine`, `sgp-esocial-worker`, and `sgp-report-service`.
- Portal build and portal test scripts are operational.
- Backend e2e paths match the global `/api` prefix.
- DB smoke behavior is explicit: it either runs against a configured `DATABASE_URL` or exits with a clearly documented, non-green configuration skip.
- QA smoke skips are not treated as passing end-to-end evidence.
- Backend coverage thresholds are configured to match `docs/eng/62-estrategia-testes.md`.
- Final reassessment separates closed gaps from still-open blockers.
