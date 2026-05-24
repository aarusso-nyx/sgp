# Round 3 DEVAI Tooling Gaps

Date: 2026-05-24
Prompt: `align/sgp/round-3/prompts/00-orchestrator.md`

## Closed In This Pass

- SGP-local `sgp-round-*` and `sgp-fix-*` Codex skill manifests were reduced to thin adapters that cite DEVAI canonical `SKILL-*` entries.
- SGP skill UI prompts now describe the local skills as adapters rather than workflow owners.
- Reusable SGP B0-B4 prompts now defer to DEVAI skills as canonical and route local skills as adapters only.
- The local helper scan found no duplicated SGP-owned scorecard, test-matrix, coverage-aggregate, run-record, or evidence-emission scripts to replace.
- The local round-loop adapter was renamed to `sgp-round-execute` so it matches DEVAI `SKILL-round-execute` naming.
- DEVAI `SKILL-round-execute` was invoked against SGP and returned `PASS` with verdict `with-blockers`.

## Remaining Gaps

| Gap                                                                  | Evidence                                                                             | Status                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| DEVAI round-execute verdict is `with-blockers`, not clean-green.     | Evidence: `.devai/state/skills/SKILL-round-execute/2026-05-24T22-24-11-823Z.json`.   | DEVAI wrote four open decision records for close-time gate status; local focused lint/typecheck/governance passed. |
| Full SGP CI was not run for this documentation/skill adapter change. | Round 3 touched `.codex/skills/**`, `docs/gov/prompts/**`, and this diagnostic file. | Use focused governance/lint/format/typecheck gates first; run full CI only when requested or before publication.   |

## Canonical DEVAI Mapping

| Area                   | DEVAI command                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audit                  | `devai skill-run SKILL-round-audit --repo-root /Users/aarusso/Development/stech/sgp`                                                                                         |
| Backlog                | `devai skill-run SKILL-round-backlog --repo-root /Users/aarusso/Development/stech/sgp`                                                                                       |
| Orchestrate            | `devai skill-run SKILL-round-orchestrate --repo-root /Users/aarusso/Development/stech/sgp`                                                                                   |
| Round loop             | `devai skill-run SKILL-round-execute --repo-root /Users/aarusso/Development/stech/sgp`                                                                                       |
| Verify/publish         | `devai skill-run SKILL-round-verify-publish --repo-root /Users/aarusso/Development/stech/sgp`                                                                                |
| Lint fix-up            | `devai skill-run SKILL-fix-lint --repo-root /Users/aarusso/Development/stech/sgp`                                                                                            |
| Build/typecheck fix-up | `devai skill-run SKILL-fix-build --repo-root /Users/aarusso/Development/stech/sgp` or `devai skill-run SKILL-fix-typecheck --repo-root /Users/aarusso/Development/stech/sgp` |
| Test fix-up            | `devai skill-run SKILL-fix-test --repo-root /Users/aarusso/Development/stech/sgp`                                                                                            |

## 2026-05-24 — R4 Closeout

- DEVAI round-execute `with-blockers` verdict: closed for wrapper-retirement
  purposes by `docs/work/round-4/R3-BLOCKERS.md`; the four records were
  gate-status records, not behavior divergence.
- Full SGP CI not run in R3: partially closed by R4 worker 11. The new focused
  eSocial spool e2e test passed; full aggregate evidence is retained under
  `.devai/state/test-results/` when generated.
- SGP-local skill aliases: closed. `.codex/skills/sgp-*` and
  `.claude/skills/sgp-*` directories were deleted, active repo grep found no
  `sgp-round-*` or `sgp-fix-*` references outside excluded historical evidence,
  and `devai skill-list` reported zero `sgp-*` skill IDs.
- Upstream DEVAI caveat: `docs/work/round-4/devai-surface-coverage.md` found
  project-config schema gaps for SGP-specific command matrices, authority order,
  prompt library selection, fixture protection, and guardrails. These are
  tracked in `docs/work/round-4/devai-feedback.md`.
