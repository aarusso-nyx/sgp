# Historical SGP Gap Closure Plan

These prompts document the gap-closure sprint that was executed for SGP v0.0.1.
They are retained as planning history, not as current implementation evidence.

The derived evidence snapshots that originally lived under `docs/audit/inv/` and
`docs/audit/diag/` were removed after becoming stale. Current implementation
status is tracked in `source/docs/implementation-status.md` and should be
verified from live commands.

## Source Boundaries

- `docs/eng/` remains authoritative for v0.0.1 architecture, domain scope, contracts, and acceptance.
- `docs/sql-reference/` remains the legacy database coverage baseline.
- `docs/legacy-reverse/` remains evidence only and must not override `docs/eng/`.
- `source/docs/implementation-status.md` is the current status document.
- `docs/audit/plan/` is historical planning material only.

## Sprint Boundary

This sprint closed the implementation gaps that were in scope at the time.
Arrecadacao is later-version scope and must not be treated as a v0.0.1 route,
UI, DB, or test blocker.

Scope decisions added on 2026-04-26:

- Admin frontend tree, backend admin routes, and identity/OAuth/Cognito/Gov.br paths remain postponed under `ADMIN_INSTALL_LATER` and `IDENTITY_INSTALL_LATER`.
- eSocial remains a stub/sandbox external provider for the current package.
- Tests may use Docker MiniIO when S3 is not configured.
- `./infra` implementation strategy and governance gates are postponed until a later owner decision.

## Executed Prompt Sequence

| Order | Prompt | Purpose |
|---|---|---|
| 1 | `01-db-full-closure.prompt.md` | Close remaining database matrix exclusions, preserving only approved technical out-of-scope artifacts. |
| 2 | `02-runtime-services.prompt.md` | Replace scaffolded payroll, eSocial, and report runtimes with implemented entrypoints. |
| 3 | `03-portal-and-contract-cleanup.prompt.md` | Fix portal build/test gaps, frontend contract mismatch, and compatibility alias wording. |
| 4 | `04-test-gates-and-coverage.prompt.md` | Make backend e2e, DB smoke, QA smoke semantics, and coverage gates truthful. |
| 5 | `05-final-reassessment.prompt.md` | Reassess current gates and classify remaining gaps. |

Future Arrecadacao scope is tracked separately in `future-arrecadacao.prompt.md`.

## Historical Definition of Done

- `docs/eng/64-database-alignment-matrix.json` has no in-scope explicit exclusions left; `dbo.sysdiagrams` remains the only approved technical out-of-scope object unless `docs/eng/` explicitly approves another exclusion.
- Scaffolded runtime status is removed for `sgp-payroll-engine`, `sgp-esocial-worker`, and `sgp-report-service`.
- Portal build and portal test scripts are operational.
- Backend e2e paths match the global `/api` prefix.
- DB smoke behavior is explicit: it either runs against a configured `DATABASE_URL` or exits with a clearly documented, non-green configuration skip.
- QA smoke skips are not treated as passing end-to-end evidence.
- Backend coverage thresholds are configured to match `docs/eng/62-estrategia-testes.md`.
- Final reassessment separates closed gaps from still-open blockers.
