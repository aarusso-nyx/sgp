---
name: sgp-round-orchestrator
description: Thin SGP adapter for DEVAI SKILL-round-orchestrate. Use when the user asks to run an SGP orchestrator prompt, execute a round, launch a wave, spawn workers for SGP prompts, or continue the measure-plan-execute-compare loop after prompt materialization.
---

# SGP Round Orchestrator

Thin adapter. The canonical workflow lives in DEVAI `SKILL-round-orchestrate` and is invoked with:

```bash
devai skill-run SKILL-round-orchestrate --repo-root /Users/aarusso/Development/stech/sgp
```

## SGP Config

- Repo root: `/Users/aarusso/Development/stech/sgp`.
- Inputs: the requested materialized prompt, `AGENTS.md`, live `package.json`, `scripts/run.mjs`, and any referenced `docs/work/round-<n>/prompts/**`.
- Common gates: `npm run lint:check`, `npm run format:check`, `npm run typecheck`, and `npm run governance:check`; add focused tests/builds by touched surface.
- Blockers: write unresolved owner decisions to `docs/work/round-<n>/QUESTIONS.md` when a materialized prompt names that file.

## Adapter Rules

- Inspect live repo state and map every named gate to current `package.json` scripts before running work.
- Preserve user and worker changes; do not revert unrelated dirty files.
- Use subagents only when the user request or materialized prompt explicitly calls for parallel execution and ownership is disjoint.
- Route failures to DEVAI `SKILL-fix-lint`, `SKILL-fix-build`, `SKILL-fix-typecheck`, or `SKILL-fix-test` as appropriate.
- Do not duplicate DEVAI orchestration logic here.

## Output Contract

Return wave status, files changed, gates run, blockers, skipped gates with reasons, and current git status.
