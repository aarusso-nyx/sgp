---
name: sgp-round-loop
description: Thin SGP adapter for DEVAI SKILL-round-execute. Use when the user asks to run a whole SGP round, automate the round cycle, continue measure-plan-execute-compare, or decide which SGP round skill should handle an ambiguous round request.
---

# SGP Round Loop

Thin adapter. DEVAI renamed the canonical loop runner to `SKILL-round-execute`; invoke it with:

```bash
devai skill-run SKILL-round-execute --repo-root /Users/aarusso/Development/stech/sgp
```

## SGP Config

- Repo root: `/Users/aarusso/Development/stech/sgp`.
- Phase mapping: measure with `SKILL-round-audit`, plan with `SKILL-round-backlog`, execute with `SKILL-round-orchestrate`, compare or publish with `SKILL-round-verify-publish`.
- Fix routing: lint/format to `SKILL-fix-lint`, typecheck/build to `SKILL-fix-typecheck` or `SKILL-fix-build`, tests to `SKILL-fix-test`.
- Authority and scratch boundaries follow `AGENTS.md`.

## Adapter Rules

- Use this adapter only for SGP repo-local routing and authority reminders.
- Verify live repo state before trusting prior prompts, memory, or scratch docs.
- Publish only when explicitly requested.
- Do not duplicate DEVAI round-loop logic here.

## Output Contract

Return round number, artifacts, phases completed, gates run, blockers, current git status, and publish status if publication was requested.
