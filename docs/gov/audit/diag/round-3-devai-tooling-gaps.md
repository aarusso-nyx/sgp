# Round 3 DEVAI Tooling Gaps

Date: 2026-05-24
Prompt: `align/sgp/round-3/prompts/00-orchestrator.md`

## Closed In This Pass

- SGP-local `sgp-round-*` and `sgp-fix-*` Codex skill manifests were reduced to thin adapters that cite DEVAI canonical `SKILL-*` entries.
- SGP skill UI prompts now describe the local skills as adapters rather than workflow owners.
- Reusable SGP B0-B4 prompts now defer to DEVAI skills as canonical and route local skills as adapters only.
- The local helper scan found no duplicated SGP-owned scorecard, test-matrix, coverage-aggregate, run-record, or evidence-emission scripts to replace.

## Remaining Gaps

| Gap                                                                                                               | Evidence                                                                                           | Status                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Prompt refers to a DEVAI round-loop call, but the live DEVAI catalog exposes `SKILL-round-execute` for that role. | `devai skill-list` includes `SKILL-round-execute`; no `SKILL-round-loop` entry was listed.         | Registered in the `sgp-round-loop` adapter and decision log.                                                     |
| Full DEVAI round equivalence was not executed automatically.                                                      | `devai skill-run` has no dry-run flag; a live run can invoke LLM/tool execution and produce state. | Requires owner-approved invocation if equivalence evidence must be produced by a live DEVAI run.                 |
| Full SGP CI was not run for this documentation/skill adapter change.                                              | Round 3 touched `.codex/skills/**`, `docs/gov/prompts/**`, and this diagnostic file.               | Use focused governance/lint/format/typecheck gates first; run full CI only when requested or before publication. |

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
