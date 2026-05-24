---
name: sgp-round-backlog
description: Thin SGP adapter for DEVAI SKILL-round-backlog. Use when the user asks to plan the next SGP round, materialize backlog, split work into waves, generate orchestrator/worker prompts, or prepare agent tasks from audit findings.
---

# SGP Round Backlog

Thin adapter. The canonical workflow lives in DEVAI `SKILL-round-backlog` and is invoked with:

```bash
devai skill-run SKILL-round-backlog --repo-root /Users/aarusso/Development/stech/sgp
```

## SGP Config

- Repo root: `/Users/aarusso/Development/stech/sgp`.
- Inputs: current `docs/gov/audit/**`, latest relevant `docs/work/round-<n>/**`, and reusable prompts `docs/gov/prompts/B1-compile-backlog-phase.md` and `docs/gov/prompts/B2-materialize-plan-phase.md`.
- Scratch output: `docs/work/round-<n>/prompts/`; never treat generated prompts as acceptance authority.
- Priority rails: legal/regulatory exposure, tenant/RLS/audit integrity, payroll correctness, governance/CI canaries, then shared helper value.

## Adapter Rules

- Verify live source before converting an audit claim into a backlog item.
- Keep worker prompts tied to authoritative `docs/eng/**`, current `docs/gov/audit/**`, and exact live paths.
- Record unresolved owner decisions in the round scratch questions file and continue only with safe unrelated work.
- Do not duplicate DEVAI planning or prompt-materialization logic here.

## Output Contract

Return generated prompt paths, wave counts, dependency notes, gates, blockers, and current git status.
